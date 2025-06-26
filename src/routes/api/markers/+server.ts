import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestHandler } from './$types';

// Fungsi untuk membersihkan HTML entities dan memvalidasi panjang URL
function decodeAndCleanUrl(urlString: string): string | null {
  if (!urlString || typeof urlString !== 'string') return null;
  
  // Decode HTML entities
  const decoded = urlString
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  // Batasi panjang untuk keamanan database
  const maxLength = 1000; // Sesuai dengan TEXT field limit yang reasonable
  if (decoded.length > maxLength) {
    console.warn(`URL terlalu panjang (${decoded.length} chars), akan dipotong`);
    return decoded.substring(0, maxLength);
  }
  
  return decoded;
}

// GET - Dapatkan semua marker
export const GET: RequestHandler = async () => {
  try {
    const markers = await prisma.marker.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
        categories: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data untuk kompatibilitas dengan frontend yang ada
    const transformedMarkers = markers.map(marker => ({
      ...marker,
      // Untuk backward compatibility, ambil kategori pertama sebagai 'category'
      category: marker.categories.length > 0 ? marker.categories[0].category : null,
      // Sediakan array lengkap kategori untuk frontend baru
      allCategories: marker.categories.map(mc => mc.category)
    }));
    
    return json(transformedMarkers);
  } catch (error) {
    console.error('Error fetching markers:', error);
    return json({ message: 'Terjadi kesalahan saat mengambil data marker' }, { status: 500 });
  }
};

// POST - Buat marker baru
export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  
  // Logging request masuk di-nonaktifkan pada produksi
  
  // Pastikan pengguna sudah login
  if (!user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  // Pengguna biasa hanya bisa membuat marker jika memiliki role ADMIN
  if (user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk membuat marker' }, { status: 403 });
  }
  
  try {
    // Deteksi content type dan parse body sesuai format
    let body: any;
    const contentType = event.request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (dari halaman admin)
      body = await event.request.json();
      // console.log('JSON Request body', body);
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Handle FormData request (dari MarkerForm component)
      const formData = await event.request.formData();
      body = {};
      
      // Convert FormData ke object
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
      // console.log('FormData Request body', body);
    } else {
      // Fallback: try parsing as JSON
      try {
        body = await event.request.json();
      } catch {
        return json({ message: 'Format request tidak didukung' }, { status: 400 });
      }
    }
    
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = body.csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Validasi input yang lebih ketat
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return json({ message: 'Judul marker tidak boleh kosong' }, { status: 400 });
    }
    
    if (!body.latitude || !body.longitude || isNaN(parseFloat(body.latitude)) || isNaN(parseFloat(body.longitude))) {
      return json({ message: 'Koordinat latitude dan longitude harus diisi dengan nilai yang valid' }, { status: 400 });
    }
    
    // Validasi categories - bisa single categoryId atau array categoryIds
    let categoryIds: string[] = [];
    
    if (body.categoryIds) {
      try {
        // Parse JSON array dari FormData
        const parsedIds = typeof body.categoryIds === 'string' 
          ? JSON.parse(body.categoryIds) 
          : body.categoryIds;
        
        if (Array.isArray(parsedIds)) {
          categoryIds = parsedIds.filter((id: any) => typeof id === 'string' && id.trim() !== '');
        } else if (typeof parsedIds === 'string' && parsedIds.trim() !== '') {
          categoryIds = [parsedIds.trim()];
        }
      } catch (error) {
        return json({ message: 'Format kategori tidak valid' }, { status: 400 });
      }
    } else if (body.categoryId && typeof body.categoryId === 'string' && body.categoryId.trim() !== '') {
      // Format lama: single category (untuk backward compatibility)
      categoryIds = [body.categoryId.trim()];
    }
    
    if (categoryIds.length === 0) {
      return json({ message: 'Minimal satu kategori harus dipilih' }, { status: 400 });
    }
    
    // console.log('Categories to assign', categoryIds);
    
    // Cek apakah semua kategori yang dipilih exists
    const existingCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds }
      }
    });
    
    if (existingCategories.length !== categoryIds.length) {
      const foundIds = existingCategories.map(cat => cat.id);
      const missingIds = categoryIds.filter(id => !foundIds.includes(id));
      return json({ message: 'Beberapa kategori yang dipilih tidak valid' }, { status: 400 });
    }
    
    // Buat marker baru dengan validasi yang lebih ketat
    const markerData = {
      title: body.title.trim(),
      description: body.description ? body.description.trim() : null,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      city: body.city ? body.city.trim() : null,
      imageUrl: body.imageUrl ? body.imageUrl.trim() : null,
      url: body.url ? decodeAndCleanUrl(body.url.trim()) : null,
      userId: user.id
    };
    
    // console.log('Marker data to create', markerData);
    
    // Buat marker dalam transaction untuk memastikan konsistensi
    const result = await prisma.$transaction(async (tx) => {
      // Buat marker
      const marker = await tx.marker.create({
        data: markerData
      });
      
      // Buat relasi dengan kategori
      const categoryRelations = categoryIds.map(categoryId => ({
        markerId: marker.id,
        categoryId: categoryId
      }));
      
      await tx.markerCategory.createMany({
        data: categoryRelations
      });
      
      // Ambil marker dengan semua relasinya
      const markerWithCategories = await tx.marker.findUnique({
        where: { id: marker.id },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true
            }
          },
          categories: {
            include: {
              category: true
            }
          }
        }
      });
      
      return markerWithCategories;
    });
    
    if (!result) {
      throw new Error('Failed to create marker with categories');
    }
    
    // Transform response untuk kompatibilitas
    const transformedResult = {
      ...result,
      category: result.categories.length > 0 ? result.categories[0].category : null,
      allCategories: result.categories.map(mc => mc.category)
    };
    
    // console.log('Marker created successfully', transformedResult);
    
    return json(transformedResult, { status: 201 });
  } catch (error) {
    console.error('💥 Error creating marker:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return json({ message: 'Terjadi kesalahan saat membuat marker' }, { status: 500 });
  }
}; 