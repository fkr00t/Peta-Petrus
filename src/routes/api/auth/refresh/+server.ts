import { json } from '@sveltejs/kit';
import { verifyRefreshToken, createAccessToken, revokeRefreshToken, createRefreshToken, setSecureCookie, clearSecureCookie } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import logger from '$lib/server/logger';

// Endpoint untuk refresh token
export async function POST(event: RequestEvent) {
  try {
    // Ambil refresh token dari cookie
    const refreshToken = event.cookies.get('refreshToken');
    
    // Jika tidak ada refresh token, kembalikan error
    if (!refreshToken) {
      return json({ message: 'Refresh token tidak ditemukan' }, { status: 401 });
    }
    
    // Verifikasi refresh token
    const payload = await verifyRefreshToken(refreshToken);
    
    // Jika refresh token tidak valid, hapus cookie dan kembalikan error
    if (!payload) {
      clearSecureCookie(event.cookies, 'refreshToken');
      clearSecureCookie(event.cookies, 'accessToken');
      return json({ message: 'Refresh token tidak valid' }, { status: 401 });
    }
    
    // Rotasi token: Revoke refresh token saat ini dan buat yang baru
    // Ini meningkatkan keamanan dengan mencegah token reuse
    await revokeRefreshToken(refreshToken);
    
    // Buat access token baru
    const newAccessToken = await createAccessToken(payload.userId, payload.role);
    
    // Buat refresh token baru
    const newRefreshToken = await createRefreshToken(payload.userId, event);
    
    // Set cookie untuk access token baru
    setSecureCookie(event.cookies, 'accessToken', newAccessToken, {
      maxAge: 60 * 15 // 15 menit
    });
    
    // Set cookie untuk refresh token baru
    setSecureCookie(event.cookies, 'refreshToken', newRefreshToken, {
      maxAge: 60 * 60 * 24 * 7 // 7 hari
    });
    
    // Kembalikan data user
    return json({
      user: {
        id: payload.userId,
        role: payload.role
      },
      accessTokenExpiresIn: 15 * 60 // 15 menit dalam detik
    });
  } catch (error) {
    logger.error('Error refreshing token:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Hapus cookie jika terjadi error
    clearSecureCookie(event.cookies, 'refreshToken');
    clearSecureCookie(event.cookies, 'accessToken');
    
    return json({ message: 'Gagal menyegarkan token' }, { status: 500 });
  }
} 