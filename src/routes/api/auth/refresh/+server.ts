import { json } from '@sveltejs/kit';
import { verifyRefreshToken, createAccessToken } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

export async function POST(event: RequestEvent) {
  try {
    // Ambil refresh token dari cookie
    const refreshToken = event.cookies.get('refreshToken');
    
    if (!refreshToken) {
      return json({ message: 'Refresh token tidak ditemukan' }, { status: 401 });
    }
    
    // Verifikasi refresh token
    const payload = await verifyRefreshToken(refreshToken);
    
    if (!payload) {
      // Hapus cookie jika refresh token invalid
      event.cookies.delete('refreshToken', { path: '/' });
      event.cookies.delete('accessToken', { path: '/' });
      return json({ message: 'Invalid refresh token' }, { status: 401 });
    }
    
    // Generate access token baru
    const newAccessToken = createAccessToken(payload.userId, payload.role);
    
    // Set cookie untuk access token baru
    event.cookies.set('accessToken', newAccessToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: !dev,
      maxAge: 60 * 15 // 15 menit
    });
    
    return json({
      success: true,
      accessTokenExpiresIn: 15 * 60 // 15 menit dalam detik
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return json({ message: 'Terjadi kesalahan saat memperbarui token' }, { status: 500 });
  }
}; 