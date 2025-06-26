import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// GET - Dapatkan marker berdasarkan ID
export async function GET({ params, locals }: RequestEvent) {
  try {
    if (!locals.user) {
      return json({ message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const marker = await prisma.marker.findUnique({
      where: { id: params.id },
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
    
    if (!marker) {
      return json({ message: 'Marker tidak ditemukan' }, { status: 404 });
    }
    
    return json(marker);
  } catch (error) {
    console.error('Error fetching marker:', error);
    return json({ message: 'Terjadi kesalahan saat mengambil data marker' }, { status: 500 });
  }
}

// PUT - Update marker
export async function PUT({ request, params, locals, cookies }: RequestEvent) {
  try {
    if (!locals.user) {
      return json({ message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const admin = await isAdmin(locals.user.id);
    
    if (!admin) {
      return json({ message: 'Tidak memiliki izin untuk memperbarui marker' }, { status: 403 });
    }
    
    const requestData = await request.json();
    const { title, description, latitude, longitude, city, categoryIds, imageUrl, url, csrf } = requestData;
    
    // Validasi CSRF token
    const csrfHeader = request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Validasi input
    if (!title || latitude === undefined || longitude === undefined) {
      return json({ message: 'Judul dan koordinat harus diisi' }, { status: 400 });
    }
    
    // Validasi categories
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return json({ message: 'Minimal satu kategori harus dipilih' }, { status: 400 });
    }
    
    // Cek apakah marker ada
    const existingMarker = await prisma.marker.findUnique({
      where: { id: params.id }
    });
    
    if (!existingMarker) {
      return json({ message: 'Marker tidak ditemukan' }, { status: 404 });
    }
    
    // Cek apakah semua kategori yang dipilih exists
    const existingCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds }
      }
    });
    
    if (existingCategories.length !== categoryIds.length) {
      return json({ message: 'Beberapa kategori yang dipilih tidak valid' }, { status: 400 });
    }
    
    // Update marker dengan transaction
    const updatedMarker = await prisma.$transaction(async (tx) => {
      // Update marker data
      const marker = await tx.marker.update({
        where: { id: params.id },
        data: {
          title,
          description,
          latitude,
          longitude,
          city,
          imageUrl,
          url,
          updatedAt: new Date()
        }
      });
      
      // Hapus relasi kategori yang lama
      await tx.markerCategory.deleteMany({
        where: { markerId: params.id }
      });
      
      // Tambahkan relasi kategori yang baru
      const categoryRelations = categoryIds.map((categoryId: string) => ({
        markerId: params.id!,
        categoryId: categoryId
      }));
      
      await tx.markerCategory.createMany({
        data: categoryRelations
      });
      
      // Ambil marker dengan relasi categories yang baru
      return await tx.marker.findUnique({
        where: { id: params.id },
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
    });
    
    return json(updatedMarker);
  } catch (error) {
    console.error('Error updating marker:', error);
    return json({ message: 'Terjadi kesalahan saat memperbarui marker' }, { status: 500 });
  }
}

// DELETE - Hapus marker
export async function DELETE({ params, locals, request, cookies }: RequestEvent) {
  try {
    if (!locals.user) {
      return json({ message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const admin = await isAdmin(locals.user.id);
    
    if (!admin) {
      return json({ message: 'Tidak memiliki izin untuk menghapus marker' }, { status: 403 });
    }
    
    // Validasi CSRF token
    const csrfHeader = request.headers.get('X-CSRF-Token');
    let csrfToken = csrfHeader;
    
    // Coba ambil dari body jika tidak ada di header (opsional, karena DELETE mungkin tidak memiliki body)
    if (!csrfToken) {
      try {
        const requestData = await request.json();
        csrfToken = requestData.csrf;
      } catch (e) {
        // Ignore error jika tidak ada body
      }
    }
    
    if (!csrfToken || !validateCsrfRequest(cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Cek apakah marker ada
    const existingMarker = await prisma.marker.findUnique({
      where: { id: params.id }
    });
    
    if (!existingMarker) {
      return json({ message: 'Marker tidak ditemukan' }, { status: 404 });
    }
    
    // Hapus marker dengan transaction untuk menghapus relasi categories juga
    await prisma.$transaction(async (tx) => {
      // Hapus relasi categories terlebih dahulu
      await tx.markerCategory.deleteMany({
        where: { markerId: params.id }
      });
      
      // Kemudian hapus marker
      await tx.marker.delete({
        where: { id: params.id }
      });
    });
    
    // Return 204 No Content untuk success delete
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting marker:', error);
    return json({ message: 'Terjadi kesalahan saat menghapus marker' }, { status: 500 });
  }
} 