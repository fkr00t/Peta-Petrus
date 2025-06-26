import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

// Implementasi in-memory rate limiting sederhana
// Untuk production, gunakan Redis atau sistem penyimpanan lain yang terdistribusi
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Membersihkan entri expired secara periodik
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Jalankan setiap 1 menit

/**
 * Middleware untuk rate limiting
 * @param event Request event
 * @param maxRequests Maksimum request dalam window waktu
 * @param windowMs Window waktu dalam milidetik
 * @param keyGenerator Fungsi untuk menghasilkan key rate limiting
 */
export async function rateLimit(
  event: RequestEvent,
  maxRequests: number = 60,
  windowMs: number = 60000, // 1 menit
  keyGenerator: (event: RequestEvent) => string = defaultKeyGenerator
): Promise<void> {
  const key = keyGenerator(event);
  const now = Date.now();
  
  // Ambil atau buat entry
  let entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitMap.set(key, entry);
  }
  
  // Tambah hitungan
  entry.count++;
  
  // Set header untuk informasi rate limiting
  event.setHeaders({
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': Math.ceil(entry.resetAt / 1000).toString()
  });
  
  // Cek apakah melewati batas
  if (entry.count > maxRequests) {
    // Set header Retry-After untuk memberitahu client kapan mencoba lagi
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    // Throw error dengan pesan yang sesuai
    throw error(429, 'Too many requests, please try again later');
  }
}

/**
 * Default key generator untuk rate limiting
 * Menggabungkan IP address dan endpoint path
 */
function defaultKeyGenerator(event: RequestEvent): string {
  const ip = event.getClientAddress() || 'unknown';
  const path = event.url.pathname;
  return `${ip}:${path}`;
}

/**
 * Middleware untuk rate limiting yang lebih ketat pada endpoint sensitif
 * seperti login, registrasi, dll
 */
export async function strictRateLimit(event: RequestEvent): Promise<void> {
  return rateLimit(event, 10, 60000); // 10 requests per menit
}

/**
 * Middleware untuk rate limiting pada endpoint API umum
 */
export async function standardRateLimit(event: RequestEvent): Promise<void> {
  return rateLimit(event, 60, 60000); // 60 requests per menit
} 