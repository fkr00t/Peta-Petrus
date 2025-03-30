import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

const prisma = new PrismaClient();

// Definisikan tipe Role
type Role = 'USER' | 'ADMIN';

// Fungsi untuk hash password menggunakan Argon2
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

// Fungsi untuk verifikasi password
export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
  return await argon2.verify(hashedPassword, password);
}

// Fungsi untuk membuat token JWT
export function createToken(userId: string, role: Role): string {
  const secret = env.JWT_SECRET || '8a3798b2f3e00068f1b1c28078485fef12cb598ec3c8ddb9d5c462f61a3c5b554ac7d94adf4479298456f8bb09427b4e62da9c51d7c5186126fba5fadc3b2a8a1f16a6e1d7279eb37c3bd2cc6b86ccc46e64527e8f4820290743be24376131f496453978b827fa0d0ed982103086adc7cf8af1553281716e78841625552a3470c99d2d703b869659dd20d9ff0d7ae449d030cc358a1234dd7052644c43661c3dfaea7cec1398548df6d85d5d01554be64c43d392c87420714346d571dbc067ee256e9985519bc00b9bf437751b0be513504981c162fd74d3388bf92868594fe678468e89094d3b0d8f931b99ec4a4c26245d61175a67c5027cfe262cf4bedd32';
  const expiresIn = env.JWT_EXPIRES_IN || '7d';
  
  // Tambahkan log untuk debugging
  console.log(`Creating token for user: ${userId}, role: ${role}`);
  
  try {
    const token = jwt.sign(
      { userId, role },
      secret,
      { expiresIn } as jwt.SignOptions
    );
    return token;
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
}

// Fungsi untuk verifikasi token JWT
export function verifyToken(token: string): { userId: string; role: Role } | null {
  try {
    const secret = env.JWT_SECRET || 'rahasia_petrus_peta_yang_sangat_aman';
    const decoded = jwt.verify(token, secret) as { userId: string; role: Role };
    return decoded;
  } catch (error) {
    console.error("Error verifying JWT token:", error);
    return null;
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