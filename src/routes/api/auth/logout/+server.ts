import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { revokeRefreshToken } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';

export async function POST(event: RequestEvent) {
  try {
    // Validasi CSRF token (sudah dilakukan di hooks.server.ts)
    // Karena request POST sudah divalidasi di hooks.server.ts, kita bisa langsung lanjut proses logout
    // Jika sampai di sini, berarti validasi CSRF sudah berhasil
    
    // Ambil refresh token dari cookie
    const refreshToken = event.cookies.get('refreshToken');
    
    // Hapus cookie access token
    event.cookies.delete('accessToken', { path: '/' });
    
    // Hapus cookie refresh token
    event.cookies.delete('refreshToken', { path: '/' });
    
    // Revoke refresh token di database
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    
    return json({ message: 'Logout berhasil' });
  } catch (error) {
    console.error('Logout error:', error);
    return json({ message: 'Terjadi kesalahan saat logout' }, { status: 500 });
  }
}; 