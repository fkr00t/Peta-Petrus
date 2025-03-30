import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import { randomBytes } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// Definisikan tipe Role
type Role = 'USER' | 'ADMIN';

// Konfigurasi token
const config = {
  accessToken: {
    secret: env.ACCESS_TOKEN_SECRET || '8a3798b2f3e00068f1b1c28078485fef12cb598ec3c8ddb9d5c462f61a3c5b55',
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN || '15m'  // 15 menit
  }
};

// Fungsi untuk hash password menggunakan Argon2
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

// Fungsi untuk verifikasi password
export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
  return await argon2.verify(hashedPassword, password);
}

// Fungsi untuk membuat access token
export function createAccessToken(userId: string, role: Role): string {
  try {
    console.log(`Creating access token for user: ${userId}, role: ${role}`);
    
    const token = jwt.sign(
      { userId, role, type: 'access' },
      config.accessToken.secret,
      { expiresIn: config.accessToken.expiresIn } as jwt.SignOptions
    );
    return token;
  } catch (error) {
    console.error("Error creating access token:", error);
    throw error;
  }
}

// Fungsi untuk membuat refresh token
export async function createRefreshToken(userId: string, event?: RequestEvent): Promise<string> {
  try {
    // Generate random token
    const tokenValue = randomBytes(40).toString('hex');
    
    // Tambahkan ke database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 hari dari sekarang
    
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
    console.error("Error creating refresh token:", error);
    throw error;
  }
}

// Fungsi untuk verifikasi access token
export function verifyAccessToken(token: string): { userId: string; role: Role } | null {
  try {
    const decoded = jwt.verify(token, config.accessToken.secret) as { 
      userId: string; 
      role: Role;
      type: string;
    };
    
    // Pastikan ini adalah access token
    if (decoded.type !== 'access') {
      console.error("Invalid token type, expected access token");
      return null;
    }
    
    return {
      userId: decoded.userId,
      role: decoded.role
    };
  } catch (error) {
    console.error("Error verifying access token:", error);
    return null;
  }
}

// Fungsi untuk verifikasi refresh token dari database
export async function verifyRefreshToken(token: string): Promise<{ userId: string; role: Role } | null> {
  try {
    // Cari token di database
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });
    
    // Validasi token
    if (!refreshToken || refreshToken.revoked || refreshToken.expiresAt < new Date()) {
      console.error("Invalid, revoked, or expired refresh token");
      return null;
    }
    
    return {
      userId: refreshToken.userId,
      role: refreshToken.user.role as Role
    };
  } catch (error) {
    console.error("Error verifying refresh token:", error);
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
    console.error(`Error revoking tokens for user (${userId}):`, error);
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
    console.error("Error revoking refresh token:", error);
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
    console.error("Error cleaning up expired tokens:", error);
    return 0;
  }
}

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
    console.error(`Error fetching user by ID (${userId}):`, error);
    return null;
  }
}

// Fungsi untuk mendapatkan user berdasarkan username
export async function getUserByUsername(username: string) {
  try {
    return await prisma.user.findUnique({
      where: { username }
    });
  } catch (error) {
    console.error(`Error fetching user by username (${username}):`, error);
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
    console.error(`Error checking if user (${userId}) is admin:`, error);
    return false;
  }
} 