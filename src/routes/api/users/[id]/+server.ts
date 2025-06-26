import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { validateCsrfRequest } from '$lib/server/csrf';

// DELETE - Hapus pengguna (hanya admin yang boleh akses)
export const DELETE: RequestHandler = async (event) => {
  // Cek apakah user sudah login dan memiliki role ADMIN
  if (!event.locals.user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  if (event.locals.user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk menghapus pengguna' }, { status: 403 });
  }
  
  // Validasi CSRF token
  const body = await event.request.json();
  const { csrf } = body;
  
  const csrfHeader = event.request.headers.get('X-CSRF-Token');
  const csrfToken = csrf || csrfHeader;
  
  if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
    return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
  }
  
  const userId = event.params.id;
  
  // Cek kalau user yang dihapus bukan diri sendiri
  if (userId === event.locals.user.id) {
    return json({ message: 'Anda tidak dapat menghapus akun diri sendiri' }, { status: 400 });
  }
  
  try {
    // Periksa apakah pengguna yang akan dihapus ada
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        twoFactorSecret: true,
        refreshTokens: true
      }
    });
    
    if (!userToDelete) {
      return json({ message: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    
    // Hapus semua data terkait pengguna secara berurutan
    if (userToDelete.twoFactorSecret) {
      await prisma.twoFactorSecret.delete({
        where: { userId }
      });
    }
    
    if (userToDelete.refreshTokens.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId }
      });
    }
    
    // Hapus markers yang dibuat oleh pengguna (opsional, tergantung kebutuhan)
    // Komentar kode di bawah jika ingin mempertahankan markers
    await prisma.marker.deleteMany({
      where: { userId }
    });
    
    // Terakhir, hapus pengguna
    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    });
    
    return json({
      message: `Pengguna ${deletedUser.username} berhasil dihapus`,
      userId: deletedUser.id
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return json({ message: 'Terjadi kesalahan saat menghapus pengguna' }, { status: 500 });
  }
}; 