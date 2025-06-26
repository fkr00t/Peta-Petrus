import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '$lib/server/auth';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// Ambil daftar pengguna
export async function GET(event: RequestEvent) {
  try {
    // Cek apakah pengguna adalah admin
    if (!event.locals.user || event.locals.user.role !== 'ADMIN') {
      return json({ message: 'Akses ditolak' }, { status: 403 });
    }
    
    // Ambil semua pengguna
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({ message: 'Terjadi kesalahan saat mengambil data pengguna' }, { status: 500 });
  }
}

// Tambah pengguna baru
export async function POST(event: RequestEvent) {
  try {
    // Cek apakah pengguna adalah admin
    if (!event.locals.user || event.locals.user.role !== 'ADMIN') {
      return json({ message: 'Akses ditolak' }, { status: 403 });
    }
    
    const { username, password, role, csrf } = await event.request.json();
    
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    const csrfToken = csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(event.cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
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
        role: role || 'USER'
      }
    });
    
    return json({
      message: 'Pengguna berhasil ditambahkan',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt,
        twoFactorEnabled: newUser.twoFactorEnabled
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return json({ message: 'Terjadi kesalahan saat menambahkan pengguna' }, { status: 500 });
  }
}; 