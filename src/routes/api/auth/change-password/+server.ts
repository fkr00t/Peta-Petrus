import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { validateCsrfRequest } from '$lib/server/csrf';
import { verifyPassword, hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  try {
    // Ambil data dari request
    const data = await event.request.json();
    const { currentPassword, newPassword, csrf } = data;

    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }

    // Validasi input
    if (!currentPassword || !newPassword) {
      return json({ message: 'Password lama dan baru wajib diisi' }, { status: 400 });
    }

    // Cek apakah user sudah login
    if (!event.locals.user?.id) {
      return json({ message: 'Anda harus login untuk mengubah password' }, { status: 401 });
    }

    // Ambil data user
    const user = await prisma.user.findUnique({
      where: { id: event.locals.user.id }
    });

    if (!user) {
      return json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    // Verifikasi password lama - perbaikan urutan parameter
    const isValidPassword = await verifyPassword(user.password, currentPassword);
    if (!isValidPassword) {
      return json({ message: 'Password saat ini tidak valid' }, { status: 400 });
    }

    // Validasi password baru
    if (newPassword.length < 8) {
      return json({ message: 'Password baru minimal 8 karakter' }, { status: 400 });
    }

    // Pastikan password memenuhi kriteria keamanan
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(newPassword);

    if (!(hasLowercase && hasUppercase && hasNumber)) {
      return json({ 
        message: 'Password harus mengandung huruf kecil, huruf kapital, dan angka' 
      }, { status: 400 });
    }

    // Hash password baru
    const hashedPassword = await hashPassword(newPassword);

    // Update password di database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Log aktivitas untuk tujuan keamanan
    console.log(`User ${user.username} changed password. IP: ${event.getClientAddress()}`);

    return json({ message: 'Password berhasil diubah' }, { status: 200 });
  } catch (error) {
    console.error('Error changing password:', error);
    return json({ message: 'Terjadi kesalahan saat mengubah password' }, { status: 500 });
  }
}; 