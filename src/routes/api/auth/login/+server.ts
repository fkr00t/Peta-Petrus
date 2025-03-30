import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, createAccessToken, createRefreshToken, cleanupExpiredTokens } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import { verifyTurnstileToken } from '$lib/server/captcha';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

const prisma = new PrismaClient();

// Simpan data percobaan login yang gagal (untuk kondisional captcha)
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Membersihkan data login yang gagal setelah 1 jam
function cleanupOldFailedAttempts() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [ip, data] of failedLoginAttempts.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      failedLoginAttempts.delete(ip);
    }
  }
}

export async function POST(event: RequestEvent) {
  try {
    // Bersihkan data login yang lama
    cleanupOldFailedAttempts();
    
    const clientIP = event.getClientAddress();
    const { username, password, rememberMe = false, csrf, captchaToken } = await event.request.json();
    
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Periksa percobaan login yang gagal untuk IP ini
    const failedAttempts = failedLoginAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
    
    // Jika ada lebih dari 3 percobaan gagal, wajib captcha
    if (failedAttempts.count >= 3) {
      if (!captchaToken) {
        return json({ message: 'Verifikasi keamanan diperlukan' }, { status: 400 });
      }
      
      const isValidCaptcha = await verifyTurnstileToken(captchaToken, clientIP);
      if (!isValidCaptcha) {
        return json({ message: 'Verifikasi keamanan tidak valid' }, { status: 400 });
      }
    }
    
    // Validasi input
    if (!username || !password) {
      return json({ message: 'Username dan password diperlukan' }, { status: 400 });
    }
    
    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    // Jika user tidak ditemukan atau password salah
    if (!user || !(await verifyPassword(user.password, password))) {
      // Catat percobaan login yang gagal
      failedLoginAttempts.set(clientIP, {
        count: failedAttempts.count + 1,
        lastAttempt: Date.now()
      });
      
      return json({ message: 'Username atau password salah' }, { status: 401 });
    }
    
    // Login berhasil - reset percobaan gagal
    failedLoginAttempts.delete(clientIP);
    
    // Bersihkan token kadaluwarsa (secara periodik)
    await cleanupExpiredTokens();
    
    // Buat access token
    const accessToken = createAccessToken(user.id, user.role);
    
    // Buat refresh token dan simpan di database
    const refreshToken = await createRefreshToken(user.id, event);
    
    // Set cookie untuk access token (short-lived)
    event.cookies.set('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: !dev,
      maxAge: 60 * 15 // 15 menit
    });
    
    // Set cookie untuk refresh token (long-lived)
    const refreshMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 hari jika "ingat saya" dicentang, otherwise 7 hari
    event.cookies.set('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: !dev,
      maxAge: refreshMaxAge
    });
    
    // Return data user tanpa password
    return json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      accessTokenExpiresIn: 15 * 60 // 15 menit dalam detik
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ message: 'Terjadi kesalahan saat login' }, { status: 500 });
  }
}; 