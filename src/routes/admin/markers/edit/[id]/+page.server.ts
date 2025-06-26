import { error, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const load = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const admin = await isAdmin(locals.user.id);
  
  if (!admin) {
    throw error(403, 'Anda tidak memiliki akses ke halaman ini');
  }
  
  const markerId = params.id;
  
  try {
    const marker = await prisma.marker.findUnique({
      where: { id: markerId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    if (!marker) {
      throw error(404, 'Marker tidak ditemukan');
    }
    
    return {
      marker,
      user: locals.user,
      isAdmin: admin
    };
  } catch (err) {
    console.error('Error fetching marker:', err);
    throw error(500, 'Terjadi kesalahan saat mengambil data marker');
  }
}; 