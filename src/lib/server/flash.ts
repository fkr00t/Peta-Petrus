import type { Cookies } from '@sveltejs/kit';

// Tipe untuk flash message
export interface FlashMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

/**
 * Menetapkan flash message di cookie
 * Flash message adalah pesan sementara yang hanya ditampilkan sekali
 * dan digunakan untuk memberikan feedback ke user setelah aksi tertentu
 * 
 * @param cookies - Cookies object dari SvelteKit
 * @param flash - Flash message untuk ditampilkan
 */
export function setFlash(cookies: Cookies, flash: FlashMessage): void {
  const encodedMessage = Buffer.from(JSON.stringify(flash)).toString('base64');
  
  cookies.set('flash', encodedMessage, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 5 // 5 menit - flash message seharusnya dibaca segera
  });
}

/**
 * Mengambil flash message dari cookie dan menghapusnya
 * 
 * @param cookies - Cookies object dari SvelteKit
 * @returns Flash message jika ada, null jika tidak ada
 */
export function getFlash(cookies: Cookies): FlashMessage | null {
  const encodedMessage = cookies.get('flash');
  
  if (!encodedMessage) return null;
  
  // Hapus cookie flash message
  cookies.delete('flash', {
    path: '/'
  });
  
  try {
    // Decode dan parse flash message
    return JSON.parse(Buffer.from(encodedMessage, 'base64').toString());
  } catch (error) {
    console.error('Error decoding flash message:', error);
    return null;
  }
} 