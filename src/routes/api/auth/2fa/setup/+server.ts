import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { generateTwoFactorSecret, verifyTwoFactorToken, enableTwoFactor } from '$lib/server/twoFactor';
import { verifyAccessToken } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// GET: Dapatkan secret dan QR code untuk setup
export async function GET(event: RequestEvent) {
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
    
    // Generate secret dan QR code
    const { secret, qrCodeUrl } = await generateTwoFactorSecret(userData.userId);
    
    return json({
      secret,
      qrCodeUrl
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return json({ 
      message: error instanceof Error ? error.message : 'Terjadi kesalahan saat setup 2FA' 
    }, { status: 500 });
  }
}

// POST: Verifikasi token dan aktifkan 2FA
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
    const { token, csrf } = body;
    
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Validasi input
    if (!token) {
      return json({ message: 'Token verifikasi diperlukan' }, { status: 400 });
    }
    
    // Verifikasi token 2FA
    const isValid = await verifyTwoFactorToken(userData.userId, token);
    if (!isValid) {
      return json({ message: 'Kode verifikasi tidak valid' }, { status: 400 });
    }
    
    // Aktifkan 2FA dan dapatkan backup codes
    const backupCodes = await enableTwoFactor(userData.userId);
    
    return json({
      message: 'Autentikasi dua faktor berhasil diaktifkan',
      backupCodes
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return json({ 
      message: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengaktifkan 2FA' 
    }, { status: 500 });
  }
} 