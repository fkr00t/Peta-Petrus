import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
  // Hapus cookie token
  event.cookies.delete('token', { path: '/' });
  
  return json({ message: 'Logout berhasil' });
}; 