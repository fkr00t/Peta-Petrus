import { randomBytes, createHmac } from 'crypto';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';

// Konstanta
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60; // 1 hari dalam detik

// Secret untuk menandatangani token
const CSRF_SECRET = (() => {
  const secret = env.CSRF_SECRET || env.ACCESS_TOKEN_SECRET;
  if (!secret && !dev) {
    throw new Error('CSRF_SECRET or ACCESS_TOKEN_SECRET must be set in production environment');
  }
  if (!secret) {
    console.warn('WARNING: Using default CSRF_SECRET in development. This is insecure for production!');
    return 'dev_csrf_secret_for_development_only';
  }
  return secret;
})();

/**
 * Menghasilkan token CSRF baru
 * @returns CSRF token
 */
export function generateCsrfToken(): string {
  // Generate token random
  const randomToken = randomBytes(32).toString('hex');
  
  // Generate timestamp
  const timestamp = Date.now().toString();
  
  // Gabungkan random token dengan timestamp
  const tokenData = `${randomToken}|${timestamp}`;
  
  // Buat signature dengan HMAC
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(tokenData)
    .digest('hex');
    
  // Token akhir = data + signature
  return `${tokenData}|${signature}`;
}

/**
 * Memverifikasi token CSRF
 * @param token Token CSRF yang akan diverifikasi
 * @returns Boolean yang menunjukkan apakah token valid
 */
export function verifyCsrfToken(token: string): boolean {
  try {
    // Parsing token
    const parts = token.split('|');
    if (parts.length !== 3) return false;
    
    const [randomToken, timestamp, originalSignature] = parts;
    
    // Recalculate signature
    const tokenData = `${randomToken}|${timestamp}`;
    const calculatedSignature = createHmac('sha256', CSRF_SECRET)
      .update(tokenData)
      .digest('hex');
    
    // Compare signatures (constant time comparison to prevent timing attacks)
    if (originalSignature !== calculatedSignature) return false;
    
    // Validate timestamp tidak lebih dari 24 jam
    const tokenTime = parseInt(timestamp);
    const currentTime = Date.now();
    if (currentTime - tokenTime > CSRF_TOKEN_EXPIRY * 1000) return false;
    
    return true;
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    return false;
  }
}

/**
 * Set CSRF token di cookies
 * @param cookies Cookie object dari SvelteKit
 */
export function setCsrfCookie(cookies: Cookies): string {
  const token = generateCsrfToken();
  
  // Set token di cookie
  cookies.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: !dev, // True di production, false di development
    maxAge: CSRF_TOKEN_EXPIRY
  });
  
  return token;
}

/**
 * Validasi CSRF dari request
 * @param cookies Cookie object dari SvelteKit
 * @param requestToken Token dari header atau body
 * @returns Boolean hasil validasi
 */
export function validateCsrfRequest(cookies: Cookies, requestToken?: string): boolean {
  // Get the token from cookies
  const cookieToken = cookies.get(CSRF_COOKIE_NAME);
  
  // Jika tidak ada token di cookie, request tidak valid
  if (!cookieToken) return false;
  
  // Jika tidak ada token di request, request tidak valid
  if (!requestToken) return false;
  
  // Verifikasi token match dan valid
  return verifyCsrfToken(cookieToken) && cookieToken === requestToken;
}

// Fungsi untuk membantu mendapatkan token dari request
export function getCsrfTokenFromRequest(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) return headerToken;
  
  // Jika adalah form data, coba dapatkan dari body
  // Catatan: body request hanya bisa dibaca sekali, 
  // jadi ini sebaiknya ditangani di middleware atau handle secara khusus
  
  return null;
}

// Ekspor konstanta
export const CSRF = {
  COOKIE_NAME: CSRF_COOKIE_NAME,
  HEADER_NAME: CSRF_HEADER_NAME
}; 