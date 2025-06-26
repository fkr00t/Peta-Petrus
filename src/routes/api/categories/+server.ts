import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { validateCsrfRequest } from '$lib/server/csrf';
import type { RequestHandler } from './$types';

// GET - Mendapatkan semua kategori
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const includeCount = url.searchParams.get('includeCount') === 'true';
    
    if (includeCount) {
      // Ambil semua kategori dengan menghitung jumlah marker
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc'
        },
        include: {
          _count: {
            select: {
              markers: true
            }
          }
        }
      });
      
      // Format ulang hasil query untuk memasukkan jumlah marker
      const formattedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        userId: category.userId,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        markerCount: category._count.markers
      }));
      
      return json(formattedCategories);
    } else {
      // Versi sederhana tanpa menghitung marker
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc'
        }
      });
      
      return json(categories);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return json({ message: 'Terjadi kesalahan saat mengambil data kategori' }, { status: 500 });
  }
};

// POST - Membuat kategori baru
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const user = locals.user;
  
  // Pastikan pengguna sudah login dan memiliki role ADMIN
  if (!user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  if (user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk membuat kategori' }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    
    // Validasi CSRF token
    const csrfHeader = request.headers.get('X-CSRF-Token');
    const csrfToken = body.csrf || csrfHeader;
    
    if (!csrfToken || !validateCsrfRequest(cookies, csrfToken)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Validasi input
    if (!body.name) {
      return json({ message: 'Nama kategori tidak boleh kosong' }, { status: 400 });
    }
    
    // Cek apakah kategori dengan nama yang sama sudah ada
    const existingCategory = await prisma.category.findUnique({
      where: {
        name: body.name
      }
    });
    
    if (existingCategory) {
      return json({ message: 'Kategori dengan nama tersebut sudah ada' }, { status: 400 });
    }
    
    // Buat kategori baru
    const category = await prisma.category.create({
      data: {
        name: body.name,
        description: body.description || null,
        userId: user.id // User yang membuat kategori
      }
    });
    
    return json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return json({ message: 'Terjadi kesalahan saat membuat kategori' }, { status: 500 });
  }
}; 