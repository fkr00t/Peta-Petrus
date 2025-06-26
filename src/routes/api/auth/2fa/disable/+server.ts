import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { disableTwoFactor, verifyTwoFactorToken } from '$lib/server/twoFactor';
import { verifyAccessToken, verifyPassword } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// POST: Nonaktifkan 2FA
export async function POST(event: RequestEvent) {
  try {
    // Validasi user
    const accessToken = event.cookies.get('accessToken');
    if (!accessToken) {
      return json({ message: 'Autentikasi diperlukan' }, { status: 401 });
    }
    
    const userData = verifyAccessToken(accessToken);
    if (!userData) {
      return json({ message: 'Token tidak valid' }, { status: 401 });
    }
    
    // Validasi CSRF token
    const body = await event.request.json();
    const { password, twoFactorCode, csrf } = body;
    
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Validasi input
    if (!password) {
      return json({ message: 'Password diperlukan' }, { status: 400 });
    }
    
    if (!twoFactorCode) {
      return json({ message: 'Kode verifikasi 2FA diperlukan' }, { status: 400 });
    }
    
    // Validasi password
    const user = await prisma.user.findUnique({
      where: { id: userData.userId }
    });
    
    if (!user || !(await verifyPassword(user.password, password))) {
      return json({ message: 'Password salah' }, { status: 401 });
    }
    
    // Verifikasi kode 2FA
    const isValid = await verifyTwoFactorToken(userData.userId, twoFactorCode);
    if (!isValid) {
      return json({ message: 'Kode verifikasi 2FA tidak valid' }, { status: 400 });
    }
    
    // Nonaktifkan 2FA
    const success = await disableTwoFactor(userData.userId);
    
    if (!success) {
      return json({ message: 'Gagal menonaktifkan 2FA' }, { status: 500 });
    }
    
    return json({
      message: 'Autentikasi dua faktor berhasil dinonaktifkan'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return json({ 
      message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menonaktifkan 2FA' 
    }, { status: 500 });
  }
} 