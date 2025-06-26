import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, generateAccessToken, setSecureCookie } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import { verifyTurnstileToken } from '$lib/server/captcha';
import { verifyTwoFactorToken, verifyBackupCode, isTwoFactorEnabled } from '$lib/server/twoFactor';
import { strictRateLimit } from '$lib/server/rateLimit';
import logger from '$lib/server/logger';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { setFlash } from '$lib/server/flash';

const prisma = new PrismaClient();

// Simpan data percobaan login yang gagal (untuk kondisional captcha)
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number; isLocked: boolean; lockUntil: number }>();

// Membersihkan data login yang gagal setelah 1 jam
function cleanupOldFailedAttempts() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [ip, data] of failedLoginAttempts.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      failedLoginAttempts.delete(ip);
    }
  }
}

// Simpan data sesi 2FA yang belum selesai
const pendingTwoFactorSessions = new Map<string, { userId: string; username: string; rememberMe: boolean; expiry: number }>();

// Fungsi untuk membuat delay berdasarkan jumlah percobaan gagal
// Ini membantu melindungi dari serangan brute force
async function getFailureDelay(attempts: number): Promise<void> {
  if (attempts <= 1) return; // No delay for first attempt
  
  // Exponential backoff: 100ms, 200ms, 400ms, 800ms, dst.
  // Maksimum 2 detik untuk mencegah DoS
  const delay = Math.min(Math.pow(2, attempts - 1) * 100, 2000);
  
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Fungsi untuk membersihkan token yang kedaluwarsa - temporary replacement
async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  } catch (error) {
    logger.error('Error cleaning up expired tokens:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return 0;
  }
}

// Temporary function to create refresh token
async function createRefreshToken(userId: string, event?: RequestEvent, rememberMe: boolean = false): Promise<string> {
  try {
    // Generate random token
    const tokenValue = (Math.random() + 1).toString(36).substring(2);
    
    // Tambahkan ke database
    const expiresAt = new Date();
    const expirationDays = rememberMe ? 30 : 7; // 30 hari jika remember me, 7 hari jika tidak
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
    
    // Simpan info user-agent dan IP jika tersedia
    const userAgent = event?.request.headers.get('user-agent') || null;
    const ipAddress = event?.getClientAddress() || null;
    
    await prisma.refreshToken.create({
      data: {
        token: tokenValue,
        userId,
        expiresAt,
        userAgent,
        ipAddress
      }
    });
    
    return tokenValue;
  } catch (error) {
    logger.error("Error creating refresh token:", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Temporary function to create access token
async function createAccessToken(userId: string, role: 'USER' | 'ADMIN'): Promise<string> {
  try {
    const token = await generateAccessToken(userId, role);
    return token;
  } catch (error) {
    logger.error("Error creating access token:", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function POST(event: RequestEvent) {
  try {
    // Terapkan rate limiting untuk endpoint login (10 requests/menit)
    await strictRateLimit(event);
    
    // Bersihkan data login yang lama
    cleanupOldFailedAttempts();
    
    const clientIP = event.getClientAddress();
    const body = await event.request.json();
    const { 
      username, 
      password, 
      rememberMe = false, 
      csrf, 
      captchaToken,
      twoFactorCode,
      backupCode,
      twoFactorSessionId,
      'cf-turnstile-response': turnstileResponse
    } = body;
    
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Verify Turnstile response jika disediakan
    if (turnstileResponse) {
      const validTurnstile = await verifyTurnstileToken(turnstileResponse, clientIP);
      if (!validTurnstile) {
        logger.security('Login gagal: Validasi Turnstile gagal', {
          ip: clientIP,
          username
        });
        
        return json({
          success: false,
          error: 'Verifikasi keamanan gagal. Silakan coba lagi.'
        }, { status: 400 });
      }
    }
    
    // --- Step 2: Verifikasi 2FA (jika sesi 2FA pending) ---
    if (twoFactorSessionId) {
      const session = pendingTwoFactorSessions.get(twoFactorSessionId);
      
      // Validasi sesi 2FA
      if (!session) {
        return json({ message: 'Sesi 2FA tidak valid atau telah kedaluwarsa' }, { status: 400 });
      }
      
      // Cek apakah sesi sudah kedaluwarsa
      if (Date.now() > session.expiry) {
        pendingTwoFactorSessions.delete(twoFactorSessionId);
        return json({ message: 'Sesi 2FA telah kedaluwarsa, silakan login ulang' }, { status: 400 });
      }
      
      // Verifikasi kode 2FA atau backup code
      let twoFactorValid = false;
      
      if (twoFactorCode) {
        twoFactorValid = await verifyTwoFactorToken(session.userId, twoFactorCode);
      } else if (backupCode) {
        twoFactorValid = await verifyBackupCode(session.userId, backupCode);
      } else {
        return json({ message: 'Kode verifikasi 2FA diperlukan' }, { status: 400 });
      }
      
      if (!twoFactorValid) {
        return json({ message: 'Kode verifikasi 2FA tidak valid' }, { status: 401 });
      }
      
      // 2FA berhasil - hapus sesi pending
      pendingTwoFactorSessions.delete(twoFactorSessionId);
      
      // Ambil user dari database
      const user = await prisma.user.findUnique({
        where: { id: session.userId }
      });
      
      if (!user) {
        return json({ message: 'User tidak ditemukan' }, { status: 401 });
      }
      
      // Login berhasil - reset percobaan gagal
      failedLoginAttempts.delete(clientIP);
      
      // Bersihkan token kadaluwarsa (secara periodik)
      await cleanupExpiredTokens();
      
      // Buat access token
      const accessToken = await createAccessToken(user.id, user.role);
      
      // Buat refresh token dan simpan di database
      const refreshToken = await createRefreshToken(user.id, event, session.rememberMe);
      
      // Set cookie untuk access token (short-lived)
      setSecureCookie(event.cookies, 'accessToken', accessToken, {
        maxAge: 60 * 15 // 15 menit
      });
      
      // Set cookie untuk refresh token (long-lived)
      const refreshMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 hari jika "ingat saya" dicentang, otherwise 7 hari
      setSecureCookie(event.cookies, 'refreshToken', refreshToken, {
        maxAge: refreshMaxAge
      });
      
      // Set flash message
      setFlash(event.cookies, {
        type: 'success',
        message: 'Login berhasil!'
      });
      
      // Log login berhasil
      logger.info('Login berhasil', {
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      return json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        accessTokenExpiresIn: 15 * 60 // 15 menit dalam detik
      });
    }
    
    // --- Step 1: Verifikasi username dan password ---
    // Periksa percobaan login yang gagal untuk IP ini
    const failedAttempts = failedLoginAttempts.get(clientIP) || { count: 0, lastAttempt: 0, isLocked: false, lockUntil: 0 };
    
    // Periksa apakah IP dikunci
    if (failedAttempts.isLocked) {
      if (Date.now() < failedAttempts.lockUntil) {
        // Masih dalam periode kunci
        const minutesLeft = Math.ceil((failedAttempts.lockUntil - Date.now()) / 60000);
        return json({ 
          message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutesLeft} menit.`, 
          locked: true,
          minutesLeft
        }, { status: 429 });
      } else {
        // Reset status lock jika waktu lock sudah habis
        failedAttempts.isLocked = false;
      }
    }
    
    // Tambahkan delay berdasarkan jumlah percobaan gagal sebelumnya
    await getFailureDelay(failedAttempts.count);
    
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
      const newCount = failedAttempts.count + 1;
      
      // Kunci IP setelah 5 percobaan gagal
      const isLocked = newCount >= 5;
      const lockUntil = isLocked ? Date.now() + (15 * 60 * 1000) : 0; // Kunci selama 15 menit
      
      failedLoginAttempts.set(clientIP, {
        count: newCount,
        lastAttempt: Date.now(),
        isLocked,
        lockUntil
      });
      
      // Log percobaan login yang gagal (lebih detail untuk keamanan)
      const securityLogData = {
        ip: clientIP,
        username,
        timestamp: new Date().toISOString(),
        failCount: newCount,
        isLocked
      };
      
      // Gunakan logger khusus security
      logger.security('Failed login attempt', securityLogData);
      
      return json({ message: 'Username atau password salah' }, { status: 401 });
    }
    
    // Cek apakah user memiliki 2FA aktif
    const twoFactorEnabled = await isTwoFactorEnabled(user.id);
    
    if (twoFactorEnabled) {
      // Buat sesi 2FA
      const sessionId = generateSessionId();
      const SESSION_EXPIRY = 10 * 60 * 1000; // 10 menit
      
      pendingTwoFactorSessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        rememberMe,
        expiry: Date.now() + SESSION_EXPIRY
      });
      
      // Kirim respon yang menunjukkan 2FA diperlukan
      return json({
        requiresTwoFactor: true,
        twoFactorSessionId: sessionId,
        username: user.username,
        message: 'Verifikasi dua faktor diperlukan'
      }, { status: 200 });
    }
    
    // Login berhasil tanpa 2FA - reset percobaan gagal
    failedLoginAttempts.delete(clientIP);
    
    // Bersihkan token kadaluwarsa (secara periodik)
    await cleanupExpiredTokens();
    
    // Buat access token
    const accessToken = await createAccessToken(user.id, user.role);
    
    // Buat refresh token dan simpan di database
    const refreshToken = await createRefreshToken(user.id, event, rememberMe);
    
    // Set cookie untuk access token (short-lived)
    setSecureCookie(event.cookies, 'accessToken', accessToken, {
      maxAge: 60 * 15 // 15 menit
    });
    
    // Set cookie untuk refresh token (long-lived)
    const refreshMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 hari jika "ingat saya" dicentang, otherwise 7 hari
    setSecureCookie(event.cookies, 'refreshToken', refreshToken, {
      maxAge: refreshMaxAge
    });
    
    // Set flash message
    setFlash(event.cookies, {
      type: 'success',
      message: 'Login berhasil!'
    });
    
    // Log login berhasil
    logger.info('Login berhasil', {
      userId: user.id,
      username: user.username,
      role: user.role
    });
    
    return json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      accessTokenExpiresIn: 15 * 60 // 15 menit dalam detik
    });
  } catch (error) {
    // Log error
    logger.error('Kesalahan server saat login', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return json({
      success: false,
      error: 'Terjadi kesalahan internal server'
    }, { status: 500 });
  }
}

// Fungsi untuk generate ID sesi 2FA
function generateSessionId(): string {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `${random}${timestamp}`;
} 