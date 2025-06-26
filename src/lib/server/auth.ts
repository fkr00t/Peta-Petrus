import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import { randomBytes } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import logger from '$lib/server/logger';

const prisma = new PrismaClient();

// Konfigurasi token
const configToken = {
  accessToken: {
    secret: env.ACCESS_TOKEN_SECRET || (() => {
      throw new Error('ACCESS_TOKEN_SECRET tidak ditemukan di environment');
    })(),
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN || '15m'
  }
};

// Environment detection
const isProduction = !dev;

// Konfigurasi Argon2 berdasarkan environment
const argon2Config = isProduction ? {
  // Konfigurasi produksi - lebih aman, lebih lambat
  timeCost: 4, // default: 3
  memoryCost: 65536, // 64 MiB, default: 12 (2^12 KiB)
  parallelism: 2, // default: 1
  type: argon2.argon2id // Argon2id
} : {
  // Konfigurasi development - lebih cepat
  timeCost: 2,
  memoryCost: 16384, // 16 MiB
  parallelism: 1,
  type: argon2.argon2id
};

// Fungsi untuk mendapatkan user berdasarkan ID
export async function getUserById(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    logger.error(`Error fetching user by ID (${userId}):`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

// Middleware untuk mengecek apakah user adalah admin
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role === 'ADMIN';
  } catch (error) {
    logger.error(`Error checking if user (${userId}) is admin:`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

// Alias untuk generateAccessToken (kompatibilitas dengan kode lama)
export async function createAccessToken(userId: string, role: 'USER' | 'ADMIN'): Promise<string> {
  return generateAccessToken(userId, role);
}

// Fungsi untuk membuat refresh token
export async function createRefreshToken(userId: string, event?: RequestEvent, rememberMe: boolean = false): Promise<string> {
  try {
    // Generate random token
    const tokenValue = randomBytes(40).toString('hex');
    
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

// Fungsi untuk verifikasi refresh token dari database
export async function verifyRefreshToken(token: string): Promise<{ userId: string; role: 'USER' | 'ADMIN' } | null> {
  try {
    // Cari token di database
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });
    
    // Validasi token
    if (!refreshToken || refreshToken.revoked || refreshToken.expiresAt < new Date()) {
      logger.warn("Invalid, revoked, or expired refresh token", {
        token: token.substring(0, 10) + '...' // Log sebagian token untuk keamanan
      });
      return null;
    }
    
    return {
      userId: refreshToken.userId,
      role: refreshToken.user.role as 'USER' | 'ADMIN'
    };
  } catch (error) {
    logger.error("Error verifying refresh token:", {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

// Fungsi untuk merevoke semua refresh token pengguna
export async function revokeAllUserTokens(userId: string): Promise<boolean> {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
    });
    return true;
  } catch (error) {
    logger.error(`Error revoking tokens for user (${userId}):`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

// Fungsi untuk merevoke satu refresh token
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true }
    });
    return true;
  } catch (error) {
    logger.error("Error revoking refresh token:", {
      error: error instanceof Error ? error.message : String(error),
      token: token.substring(0, 10) + '...' // Log sebagian token untuk keamanan
    });
    return false;
  }
}

// Fungsi untuk membersihkan refresh token yang expired
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  } catch (error) {
    logger.error("Error cleaning up expired tokens:", {
      error: error instanceof Error ? error.message : String(error)
    });
    return 0;
  }
}

// Fungsi untuk menangani error di auth
export function handleAuthError(error: any): { message: string; status: number } {
  logger.error('Authentication error:', {
    error: error instanceof Error ? error.message : String(error)
  });
  
  if (error instanceof Error) {
    return {
      message: 'Authentication error: ' + error.message,
      status: 401
    };
  }
  
  return {
    message: 'Unknown authentication error',
    status: 401
  };
}

// Fungsi untuk generate CSRF token
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Event handler untuk validasi CSRF di request masuk
export function validateCsrfToken(event: RequestEvent) {
  const requestToken = event.request.headers.get('x-csrf-token');
  const cookieToken = event.cookies.get('csrf');
  
  if (!requestToken || !cookieToken || requestToken !== cookieToken) {
    return {
      valid: false,
      error: 'CSRF token invalid'
    };
  }
  
  return {
    valid: true
  };
}

// Fungsi untuk hash password menggunakan Argon2
export async function hashPassword(password: string): Promise<string> {
  // Menggunakan konfigurasi Argon2 berdasarkan environment
  return await argon2.hash(password, argon2Config);
}

// Fungsi untuk verifikasi password
export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch (error) {
    return false;
  }
}

// Fungsi untuk generate access token
export async function generateAccessToken(userId: string, role: 'USER' | 'ADMIN'): Promise<string> {
  try {
    const token = jwt.sign(
      { userId, role, type: 'access' },
      configToken.accessToken.secret,
      { expiresIn: configToken.accessToken.expiresIn } as jwt.SignOptions
    );
    return token;
  } catch (error) {
    logger.error('Error generating access token:', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Gagal membuat token akses');
  }
}

// Fungsi untuk verifikasi access token
export function verifyAccessToken(token: string): { userId: string; role: 'USER' | 'ADMIN' } | null {
  try {
    const decoded = jwt.verify(token, configToken.accessToken.secret) as { 
      userId: string; 
      role: 'USER' | 'ADMIN';
    };
    
    return {
      userId: decoded.userId,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

// Fungsi untuk menetapkan cookie dengan aman
export function setSecureCookie(
  cookies: import('@sveltejs/kit').Cookies,
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
  }
) {
  cookies.set(name, value, {
    path: options.path || '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: options.maxAge || 60 * 60 * 24 * 7 // 7 hari default
  });
}

// Fungsi untuk menghapus cookie dengan aman
export function clearSecureCookie(cookies: import('@sveltejs/kit').Cookies, name: string, path: string = '/') {
  cookies.delete(name, {
    path,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  });
}

export async function generateJWT(payload: object, expiresIn = configToken.accessToken.expiresIn) {
  return jwt.sign(payload, configToken.accessToken.secret, { expiresIn } as jwt.SignOptions);
}

export function verifyJWT<T extends object>(token: string): T | null {
  try {
    return jwt.verify(token, configToken.accessToken.secret) as T;
  } catch (error) {
    return null;
  }
}

// Fungsi untuk validasi login
export async function validateLogin(username: string, password: string) {
  if (!username || !password) {
    return {
      success: false,
      error: 'Username dan password harus diisi'
    };
  }

  try {
    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return {
        success: false,
        error: 'Kredensial tidak valid'
      };
    }

    // Verifikasi password
    const isPasswordValid = await verifyPassword(user.password, password);
    
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Kredensial tidak valid'
      };
    }

    // Kembalikan data user tanpa password
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      success: true,
      user: userWithoutPassword
    };
  } catch (error) {
    logger.error('Login error:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: 'Terjadi kesalahan saat proses login'
    };
  }
} 