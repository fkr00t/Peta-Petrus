import { error, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const admin = await isAdmin(locals.user.id);
  
  if (!admin) {
    throw error(403, 'Anda tidak memiliki akses ke halaman ini');
  }

  return {
    user: locals.user,
    isAdmin: admin,
    csrfToken: locals.csrfToken || null
  };
}; 