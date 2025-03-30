import { verifyToken, getUserById } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Redirect untuk /auth/login
  if (event.url.pathname === '/auth/login') {
    throw redirect(302, '/login');
  }
  
  // Dapatkan token dari cookies
  const token = event.cookies.get('token');
  
  // Jika tidak ada token, lanjutkan tanpa autentikasi
  if (!token) {
    return await resolve(event);
  }
  
  // Verifikasi token
  const payload = verifyToken(token);
  
  // Jika token tidak valid, hapus cookie dan lanjutkan tanpa autentikasi
  if (!payload) {
    event.cookies.delete('token', { path: '/' });
    return await resolve(event);
  }
  
  // Dapatkan data user
  const user = await getUserById(payload.userId);
  
  // Jika user ada, simpan ke locals
  if (user) {
    event.locals.user = user;
    event.locals.isAdmin = user.role === 'ADMIN';
  }
  
  // Proses request
  return await resolve(event);
}; 