import { error, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const admin = await isAdmin(locals.user.id);
  
  if (!admin) {
    throw error(403, 'Anda tidak memiliki akses ke halaman ini');
  }

  // Ambil jumlah total marker
  const totalMarkers = await prisma.marker.count();

  // Ambil aktivitas terbaru berdasarkan marker yang dibuat/diedit
  const recentMarkers = await prisma.marker.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      createdBy: {
        select: {
          username: true
        }
      }
    }
  });

  // Format aktivitas dari marker
  const activities = recentMarkers.map(marker => {
    // Tentukan jenis aktivitas berdasarkan updatedAt vs createdAt
    const isUpdated = marker.updatedAt.getTime() > marker.createdAt.getTime();
    const timeAgo = getTimeAgo(isUpdated ? marker.updatedAt : marker.createdAt);
    
    return {
      id: marker.id,
      action: isUpdated ? 'Perbarui marker' : 'Tambah marker',
      user: marker.createdBy?.username || 'admin',
      time: timeAgo,
      location: marker.title
    };
  });

  return {
    user: locals.user,
    isAdmin: admin,
    totalMarkers,
    activities
  };
};

// Fungsi helper untuk format waktu
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Baru saja';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} menit yang lalu`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} jam yang lalu`;
  } else if (diffInSeconds < 172800) {
    return 'Kemarin';
  } else {
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
} 