import { verifyAccessToken, getUserById } from '$lib/server/auth';
import { setCsrfCookie, validateCsrfRequest, getCsrfTokenFromRequest, CSRF } from '$lib/server/csrf';
import type { Handle } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Redirect untuk /auth/login
  if (event.url.pathname === '/auth/login') {
    throw redirect(302, '/login');
  }
  
  // Periksa apakah ini adalah permintaan untuk menyegarkan token
  const isRefreshRequest = event.url.pathname === '/api/auth/refresh' && event.request.method === 'POST';
  
  // Penanganan CSRF untuk request modifikasi data
  const isMutationRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method);
  const isApiRequest = event.url.pathname.startsWith('/api/');
  
  // Generate CSRF token jika belum ada dan bukan API request
  if (!event.cookies.get(CSRF.COOKIE_NAME) && !isApiRequest) {
    const token = setCsrfCookie(event.cookies);
    // Tambahkan token ke locals agar bisa digunakan di layout
    event.locals.csrfToken = token;
  } else if (!isApiRequest) {
    // Jika sudah ada token di cookie dan bukan API request, 
    // tambahkan token ke locals untuk digunakan di form
    event.locals.csrfToken = event.cookies.get(CSRF.COOKIE_NAME);
  }
  
  // Validasi CSRF untuk request modifikasi
  if (isMutationRequest && isApiRequest && !isRefreshRequest) {
    const requestToken = getCsrfTokenFromRequest(event.request);
    const isValidCsrf = requestToken ? validateCsrfRequest(event.cookies, requestToken) : false;
    
    if (!isValidCsrf) {
      throw error(403, 'CSRF validation failed');
    }
  }
  
  // Jika bukan permintaan refresh, maka gunakan access token untuk autentikasi
  if (!isRefreshRequest) {
    // Periksa access token
    const accessToken = event.cookies.get('accessToken');
    
    // Jika access token ada, verifikasi
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      
      if (payload) {
        // Dapatkan data user
        const user = await getUserById(payload.userId);
        
        // Jika user ada, simpan ke locals
        if (user) {
          event.locals.user = user;
          event.locals.isAdmin = user.role === 'ADMIN';
          return await resolve(event);
        }
      } else {
        // Jika access token tidak valid, hapus cookie
        event.cookies.delete('accessToken', { path: '/' });
      }
    }
  }
  
  // Jika tidak ada token atau token tidak valid,
  // lanjutkan tanpa autentikasi
  return await resolve(event);
}; 