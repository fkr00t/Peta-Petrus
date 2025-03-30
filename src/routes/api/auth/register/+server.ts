import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

export async function POST(event: RequestEvent) {
  try {
    const { username, password } = await event.request.json();
    
    // Validasi input
    if (!username || !password) {
      return json({ message: 'Username dan password diperlukan' }, { status: 400 });
    }
    
    // Cek apakah username sudah digunakan
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUser) {
      return json({ message: 'Username sudah digunakan' }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Buat user baru
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        // Default role adalah USER
      }
    });
    
    return json({
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return json({ message: 'Terjadi kesalahan saat registrasi' }, { status: 500 });
  }
}; 