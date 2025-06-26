import { json } from '@sveltejs/kit';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { validateCsrfRequest } from '$lib/server/csrf';
import { isAdmin } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import logger from '$lib/server/logger';

// Direktori penyimpanan gambar (relatif terhadap root project)
const UPLOAD_DIR = 'static/uploads/images';

// DELETE - Untuk menghapus file gambar yang tidak digunakan
export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  
  // Pastikan pengguna sudah login
  if (!user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  // Pengguna harus memiliki role ADMIN
  if (user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk menghapus gambar' }, { status: 403 });
  }
  
  try {
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    if (!csrfHeader || !validateCsrfRequest(event.cookies, csrfHeader)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Ambil data dari request
    const requestData = await event.request.json();
    const { imageUrl } = requestData;
    
    if (!imageUrl) {
      return json({ message: 'URL gambar tidak diberikan' }, { status: 400 });
    }
    
    // Pastikan hanya file di direktori uploads/images yang bisa dihapus
    // Ini penting untuk keamanan, mencegah penghapusan file sistem lainnya
    if (!imageUrl.startsWith('/uploads/images/')) {
      return json({ 
        message: 'Hanya file di direktori uploads yang dapat dihapus' 
      }, { status: 400 });
    }
    
    // Ekstrak nama file dari URL
    const fileName = imageUrl.split('/').pop();
    if (!fileName) {
      return json({ message: 'Format URL gambar tidak valid' }, { status: 400 });
    }
    
    // Gabung direktori uploads dengan nama file
    const filePath = join(process.cwd(), 'static', 'uploads', 'images', fileName);
    
    // Hapus file dari sistem
    await unlink(filePath);
    
    logger.info('File berhasil dihapus', {
      file: fileName,
      userId: user.id,
      username: user.username
    });
    
    return json({
      message: 'File berhasil dihapus',
      deletedFile: fileName
    }, { status: 200 });
    
  } catch (error: any) {
    // Jika file tidak ditemukan, berikan respons yang lebih ramah
    if (error.code === 'ENOENT') {
      return json({ 
        message: 'File tidak ditemukan, mungkin sudah dihapus sebelumnya'
      }, { status: 404 });
    }
    
    logger.error('Error deleting file:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user?.id
    });
    
    return json({ 
      message: 'Terjadi kesalahan saat menghapus file',
      error: error.message
    }, { status: 500 });
  }
}; 