import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

// GET - Ambil semua pengguna (hanya admin yang boleh akses)
export const GET: RequestHandler = async (event) => {
  // Cek apakah user sudah login dan memiliki role ADMIN
  if (!event.locals.user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  if (event.locals.user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk mengakses data pengguna' }, { status: 403 });
  }
  
  try {
    // Ambil semua pengguna dengan informasi 2FA
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        twoFactorSecret: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data untuk menambahkan flag 2FA
    const transformedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      twoFactorEnabled: !!user.twoFactorSecret
    }));
    
    return json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({ message: 'Terjadi kesalahan saat mengambil data pengguna' }, { status: 500 });
  }
}; 