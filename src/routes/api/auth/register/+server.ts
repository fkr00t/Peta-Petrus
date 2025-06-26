import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import { verifyTurnstileToken } from '$lib/server/captcha';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

export async function POST(event: RequestEvent) {
  try {
    // Cek apakah pengguna yang melakukan request adalah admin
    if (!event.locals.user || event.locals.user.role !== 'ADMIN') {
      return json({ message: 'Akses ditolak' }, { status: 403 });
    }
    
    const { username, password, csrf, captchaToken } = await event.request.json();
    
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Validasi Captcha - opsional untuk admin
    if (captchaToken) {
      const isValidCaptcha = await verifyTurnstileToken(captchaToken, event.getClientAddress());
      if (!isValidCaptcha) {
        return json({ message: 'Verifikasi captcha tidak valid' }, { status: 400 });
      }
    }
    
    // Validasi input
    if (!username || !password) {
      return json({ message: 'Username dan password diperlukan' }, { status: 400 });
    }
    
    // Cek apakah username sudah digunakan
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUser) {
      return json({ message: 'Username sudah digunakan' }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Buat user baru
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        // Default role adalah USER
      }
    });
    
    return json({
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return json({ message: 'Terjadi kesalahan saat registrasi' }, { status: 500 });
  }
}; 