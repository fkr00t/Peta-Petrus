import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }: { locals: any }) => {
  // Cek apakah user sudah login dan memiliki role admin
  if (!locals.user || !locals.isAdmin) {
    throw redirect(302, '/login');
  }
  
  return {
    user: locals.user,
    isAdmin: locals.isAdmin
  };
}; 