import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { RequestHandler } from './$types';

// DELETE - Menghapus kategori berdasarkan ID
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { id } = params;
  const user = locals.user;
  
  // Pastikan pengguna sudah login dan memiliki role ADMIN
  if (!user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  if (user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk menghapus kategori' }, { status: 403 });
  }
  
  try {
    // Cek apakah kategori ada
    const category = await prisma.category.findUnique({
      where: { id },
      include: { markers: true }
    });
    
    if (!category) {
      return json({ message: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    
    // Hapus referensi ke kategori dari marker yang terkait
    if (category.markers.length > 0) {
      await prisma.marker.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      });
    }
    
    // Hapus kategori
    await prisma.category.delete({
      where: { id }
    });
    
    return json({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return json({ message: 'Terjadi kesalahan saat menghapus kategori' }, { status: 500 });
  }
}; 