import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { isTwoFactorEnabled } from '$lib/server/twoFactor';
import { verifyAccessToken } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// GET: Cek status 2FA
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
    
    // Cek status 2FA
    const enabled = await isTwoFactorEnabled(userData.userId);
    
    return json({
      enabled
    });
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return json({ 
      message: error instanceof Error ? error.message : 'Terjadi kesalahan saat memeriksa status 2FA' 
    }, { status: 500 });
  }
} 