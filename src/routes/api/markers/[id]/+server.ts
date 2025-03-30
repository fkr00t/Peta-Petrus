import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '$lib/server/auth';
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
export async function PUT({ request, params, locals }: RequestEvent) {
  try {
    if (!locals.user) {
      return json({ message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const admin = await isAdmin(locals.user.id);
    
    if (!admin) {
      return json({ message: 'Tidak memiliki izin untuk memperbarui marker' }, { status: 403 });
    }
    
    const { title, description, latitude, longitude } = await request.json();
    
    // Validasi input
    if (!title || latitude === undefined || longitude === undefined) {
      return json({ message: 'Judul dan koordinat harus diisi' }, { status: 400 });
    }
    
    // Cek apakah marker ada
    const existingMarker = await prisma.marker.findUnique({
      where: { id: params.id }
    });
    
    if (!existingMarker) {
      return json({ message: 'Marker tidak ditemukan' }, { status: 404 });
    }
    
    // Update marker
    const updatedMarker = await prisma.marker.update({
      where: { id: params.id },
      data: {
        title,
        description,
        latitude,
        longitude,
        updatedAt: new Date()
      }
    });
    
    return json(updatedMarker);
  } catch (error) {
    console.error('Error updating marker:', error);
    return json({ message: 'Terjadi kesalahan saat memperbarui marker' }, { status: 500 });
  }
}

// DELETE - Hapus marker
export async function DELETE({ params, locals }: RequestEvent) {
  try {
    if (!locals.user) {
      return json({ message: 'Tidak terautentikasi' }, { status: 401 });
    }
    
    const admin = await isAdmin(locals.user.id);
    
    if (!admin) {
      return json({ message: 'Tidak memiliki izin untuk menghapus marker' }, { status: 403 });
    }
    
    // Cek apakah marker ada
    const existingMarker = await prisma.marker.findUnique({
      where: { id: params.id }
    });
    
    if (!existingMarker) {
      return json({ message: 'Marker tidak ditemukan' }, { status: 404 });
    }
    
    // Hapus marker
    await prisma.marker.delete({
      where: { id: params.id }
    });
    
    // Return 204 No Content untuk success delete
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting marker:', error);
    return json({ message: 'Terjadi kesalahan saat menghapus marker' }, { status: 500 });
  }
} 