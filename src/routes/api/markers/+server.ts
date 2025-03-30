import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { RequestHandler } from './$types';

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
        category: true // Include kategori marker
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return json(markers);
  } catch (error) {
    console.error('Error fetching markers:', error);
    return json({ message: 'Terjadi kesalahan saat mengambil data marker' }, { status: 500 });
  }
};

// POST - Buat marker baru
export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;
  
  // Pastikan pengguna sudah login
  if (!user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  // Pengguna biasa hanya bisa membuat marker jika memiliki role ADMIN
  if (user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk membuat marker' }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    
    // Validasi input
    if (!body.title) {
      return json({ message: 'Judul marker tidak boleh kosong' }, { status: 400 });
    }
    
    if (!body.latitude || !body.longitude) {
      return json({ message: 'Koordinat latitude dan longitude harus diisi' }, { status: 400 });
    }
    
    // Buat marker baru
    const markerData = {
      title: body.title,
      description: body.description || null,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      imageUrl: body.imageUrl || null,       // Field baru untuk URL gambar
      url: body.url || null,                 // Field baru untuk URL terkait
      categoryId: body.categoryId || null,   // Field baru untuk kategori
      userId: user.id
    };
    
    const marker = await prisma.marker.create({
      data: markerData,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
        category: true // Include kategori marker
      }
    });
    
    return json(marker, { status: 201 });
  } catch (error) {
    console.error('Error creating marker:', error);
    return json({ message: 'Terjadi kesalahan saat membuat marker' }, { status: 500 });
  }
}; 