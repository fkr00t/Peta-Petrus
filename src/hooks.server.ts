import { verifyAccessToken, getUserById } from '$lib/server/auth';
import { setCsrfCookie, validateCsrfRequest, getCsrfTokenFromRequest, CSRF } from '$lib/server/csrf';
import type { Handle } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import { sanitizeString } from '$lib/utils';
import { dev } from '$app/environment';
import logger from '$lib/server/logger';

// Fungsi untuk sanitasi data request (body JSON)
async function sanitizeRequestData(request: Request): Promise<Request> {
  const contentType = request.headers.get('content-type');
  
  // Hanya sanitasi data dengan content-type JSON yang valid
  if (contentType && contentType.includes('application/json')) {
    try {
      // Clone request terlebih dahulu untuk menghindari "body already read"
      const clonedRequest = request.clone();
      
      // Gunakan text() daripada json() agar lebih aman
      const text = await clonedRequest.text();
      
      // Jika body kosong, langsung kembalikan request asli
      if (!text || text.trim() === '') {
        return request;
      }
      
      try {
        // Parse text menjadi JSON
        const body = JSON.parse(text);
        const sanitizedBody = sanitizeRequestBody(body);
        
        // Buat request baru dengan body yang sudah disanitasi
        const newRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(sanitizedBody),
          mode: request.mode,
          credentials: request.credentials,
          cache: request.cache,
          redirect: request.redirect,
          referrer: request.referrer,
          integrity: request.integrity
        });
        
        return newRequest;
      } catch (parseError) {
        // Jika gagal parse JSON, hanya log dan kembalikan request asli
        logger.warn('Request memiliki content-type JSON tapi body bukan JSON valid', {
          url: request.url,
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        return request;
      }
    } catch (err) {
      logger.error('Error sanitizing request data:', {
        error: err instanceof Error ? err.message : String(err)
      });
      // Jika error, kembalikan request asli
      return request;
    }
  }
  
  return request;
}

// Fungsi rekursif untuk sanitasi semua properti objek
function sanitizeRequestBody(data: any): any {
  if (typeof data === 'string') {
    return sanitizeString(data);
  } else if (Array.isArray(data)) {
    return data.map(item => sanitizeRequestBody(item));
  } else if (data instanceof Object) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeRequestBody(value);
    }
    return result;
  }
  
  return data;
}

// Fungsi untuk menerapkan security headers
function applySecurityHeaders(response: Response, pathname?: string): Response {
  // Pastikan Content-Type header ditentukan jika belum ada
  if (!response.headers.has('Content-Type') && response.headers.get('Content-Type') !== 'text/html') {
    response.headers.set('Content-Type', 'text/html; charset=utf-8');
  }

  const isProduction = !dev;

  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    // Di development, kita perlu 'unsafe-eval' untuk Vite HMR
    isProduction 
      ? "script-src 'self' 'unsafe-inline' https://unpkg.com https://nominatim.openstreetmap.org https://challenges.cloudflare.com" 
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://nominatim.openstreetmap.org https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://challenges.cloudflare.com https://fonts.googleapis.com",
    "img-src 'self' data: https://*.tile.openstreetmap.org https://unpkg.com blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://nominatim.openstreetmap.org https://challenges.cloudflare.com" + (isProduction ? "" : " ws://localhost:*"),
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'"
  ].join('; ');

  // Tambahkan CSP header
  response.headers.set('Content-Security-Policy', cspDirectives);
  
  // Tambahkan X-Content-Type-Options untuk mencegah MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options untuk mencegah clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );
  
  // HSTS - Strict Transport Security (aktif di production)
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  // Cache Control untuk halaman sensitif (login, admin)
  if (pathname) {
    if (pathname.includes('/login') || 
        pathname.includes('/admin') || 
        pathname.includes('/register')) {
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      response.headers.set('Pragma', 'no-cache');
    } else if (pathname.startsWith('/assets/') || pathname.startsWith('/_app/immutable/')) {
      // Cache assets statis untuk waktu yang lama
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (pathname === '/favicon.ico' || pathname === '/manifest.json') {
      // Cache favicon dan manifest untuk jangka waktu sedang
      response.headers.set('Cache-Control', 'public, max-age=86400');
    } else if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
      // Jangan cache API dan endpoint autentikasi
      response.headers.set('Cache-Control', 'no-store, max-age=0');
    } else {
      // Cache control default untuk halaman lainnya
      if (!response.headers.has('Cache-Control')) {
        // Lebih lama di production
        const maxAge = isProduction ? 86400 : 3600; // 24 jam di production, 1 jam di development
        response.headers.set('Cache-Control', `public, max-age=${maxAge}`);
      }
    }
  }
  
  return response;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Jika mode maintenance diaktifkan, arahkan semua permintaan (non-API & non-assets)
  // ke halaman /maintenance agar pengunjung mengetahui situs sedang diperbaiki.
  // Aktifkan dengan men-set environment variable MAINTENANCE_MODE=true
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const isAssetRequest = event.url.pathname.startsWith('/_app/') || event.url.pathname.startsWith('/assets/') || event.url.pathname.startsWith('/favicon') || event.url.pathname.startsWith('/robots') || event.url.pathname.startsWith('/sitemap');
  const isMaintenancePage = event.url.pathname === '/maintenance';

  if (maintenanceMode && !isMaintenancePage && !isAssetRequest && !event.url.pathname.startsWith('/api/')) {
    throw redirect(302, '/maintenance');
  }
  
  // Sanitasi data request
  if (['POST', 'PUT', 'PATCH'].includes(event.request.method)) {
    event.request = await sanitizeRequestData(event.request);
  }
  
  // Redirect untuk /auth/login
  if (event.url.pathname === '/auth/login') {
    throw redirect(302, '/login');
  }
  
  // Redirect untuk /admin/security ke path baru
  if (event.url.pathname === '/admin/security') {
    throw redirect(302, '/admin/settings/security');
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
          
          // Resolve response dan tambahkan security headers
          const response = await resolve(event);
          return applySecurityHeaders(response, event.url.pathname);
        }
      } else {
        // Jika access token tidak valid, hapus cookie
        event.cookies.delete('accessToken', { path: '/' });
      }
    }
  }
  
  // Jika tidak ada token atau token tidak valid,
  // lanjutkan tanpa autentikasi
  const response = await resolve(event);
  return applySecurityHeaders(response, event.url.pathname);
}; 