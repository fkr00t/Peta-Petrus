import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, createToken } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

const prisma = new PrismaClient();

export async function POST(event: RequestEvent) {
  try {
    const { username, password } = await event.request.json();
    
    // Validasi input
    if (!username || !password) {
      return json({ message: 'Username dan password diperlukan' }, { status: 400 });
    }
    
    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    // Jika user tidak ditemukan
    if (!user) {
      return json({ message: 'Username atau password salah' }, { status: 401 });
    }
    
    // Verifikasi password
    const isPasswordValid = await verifyPassword(user.password, password);
    
    if (!isPasswordValid) {
      return json({ message: 'Username atau password salah' }, { status: 401 });
    }
    
    // Buat token JWT
    const token = createToken(user.id, user.role);
    
    // Set cookie dengan token
    event.cookies.set('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: !dev,
      maxAge: 60 * 60 * 24 * 7 // 7 hari
    });
    
    // Return data user tanpa password
    return json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ message: 'Terjadi kesalahan saat login' }, { status: 500 });
  }
}; 