import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }: { locals: any }) => {
  return {
    user: locals.user || null,
    isAdmin: locals.isAdmin || false
  };
}; 