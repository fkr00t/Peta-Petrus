import type { ServerLoad } from '@sveltejs/kit';

export const load = (async ({ locals, url }) => {
  // Redirect /auth/login ke /login
  if (url.pathname === '/auth/login') {
    return {
      redirect: '/login'
    };
  }
  
  return {
    user: locals.user || null,
    isAdmin: locals.isAdmin || false,
    csrfToken: locals.csrfToken || null
  };
}) satisfies ServerLoad; 