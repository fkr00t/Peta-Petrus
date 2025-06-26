import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestHandler } from './$types';

// DELETE - Menghapus kategori berdasarkan ID
export const DELETE: RequestHandler = async ({ params, locals, request, cookies }) => {
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
    
    // Cek apakah kategori ada dan berapa banyak marker yang menggunakannya
    const category = await prisma.category.findUnique({
      where: { id },
      include: { 
        markers: true // Ini akan mengambil MarkerCategory relations
      }
    });
    
    if (!category) {
      return json({ message: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    
    // Hapus relasi marker-category dari junction table terlebih dahulu
    if (category.markers.length > 0) {
      await prisma.markerCategory.deleteMany({
        where: { categoryId: id }
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