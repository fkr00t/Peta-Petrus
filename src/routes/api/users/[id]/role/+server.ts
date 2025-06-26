import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { validateCsrfRequest } from '$lib/server/csrf';

// PATCH - Ubah role pengguna (hanya admin yang boleh akses)
export const PATCH: RequestHandler = async (event) => {
  // Cek apakah user sudah login dan memiliki role ADMIN
  if (!event.locals.user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  if (event.locals.user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk mengubah role pengguna' }, { status: 403 });
  }
  
  // Validasi CSRF token
  const body = await event.request.json();
  const { role, csrf } = body;
  
  const csrfHeader = event.request.headers.get('X-CSRF-Token');
  const csrfToken = csrf || csrfHeader;
  
  if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
    return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
  }
  
  // Validasi input
  if (!role || !['ADMIN', 'USER'].includes(role)) {
    return json({ message: 'Role tidak valid' }, { status: 400 });
  }
  
  const userId = event.params.id;
  
  // Cek kalau user yang diubah bukan diri sendiri
  if (userId === event.locals.user.id) {
    return json({ message: 'Anda tidak dapat mengubah role diri sendiri' }, { status: 400 });
  }
  
  try {
    // Periksa apakah pengguna yang akan diubah ada
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userToUpdate) {
      return json({ message: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    
    // Update role pengguna
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });
    
    return json({
      message: `Role pengguna ${updatedUser.username} berhasil diubah menjadi ${role}`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return json({ message: 'Terjadi kesalahan saat mengubah role pengguna' }, { status: 500 });
  }
}; 