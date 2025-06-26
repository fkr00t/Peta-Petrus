import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { validateCsrfRequest } from '$lib/server/csrf';
import { isAdmin } from '$lib/server/auth';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

// Daftar tipe file yang diizinkan
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

// Ukuran maksimum file (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Direktori penyimpanan gambar (relatif terhadap root project)
const UPLOAD_DIR = 'static/uploads/images';

// POST - Upload gambar
export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  
  // Pastikan pengguna sudah login
  if (!user) {
    return json({ message: 'Anda harus login terlebih dahulu' }, { status: 401 });
  }
  
  // Pengguna harus memiliki role ADMIN
  if (user.role !== 'ADMIN') {
    return json({ message: 'Tidak memiliki izin untuk mengupload gambar' }, { status: 403 });
  }
  
  try {
    // Validasi CSRF token
    const csrfHeader = event.request.headers.get('X-CSRF-Token');
    if (!csrfHeader || !validateCsrfRequest(event.cookies, csrfHeader)) {
      return json({ message: 'Validasi keamanan gagal' }, { status: 403 });
    }
    
    // Cek content-type untuk memastikan ini adalah multipart/form-data
    const contentType = event.request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return json({ message: 'Content-type harus multipart/form-data' }, { status: 400 });
    }
    
    // Parse form data
    const formData = await event.request.formData();
    const file = formData.get('image');
    
    // Validasi file
    if (!file || !(file instanceof File)) {
      return json({ message: 'File gambar tidak ditemukan' }, { status: 400 });
    }
    
    // Validasi tipe file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return json({ 
        message: 'Tipe file tidak didukung. Hanya JPEG, PNG, WebP yang diizinkan'
      }, { status: 400 });
    }
    
    // Validasi ukuran file
    if (file.size > MAX_FILE_SIZE) {
      return json({ 
        message: `Ukuran file terlalu besar. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 });
    }
    
    // Buat nama file unik untuk menghindari collision
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const relativePath = join(UPLOAD_DIR, fileName);
    const absolutePath = join(process.cwd(), relativePath);
    
    // Pastikan direktori upload ada
    await mkdir(dirname(absolutePath), { recursive: true });
    
    // Konversi File ke ArrayBuffer kemudian ke Buffer untuk menulis ke disk
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Tulis file ke disk
    await writeFile(absolutePath, buffer);
    
    // URL yang akan disimpan di database
    const fileUrl = `/uploads/images/${fileName}`;
    
    return json({
      message: 'File berhasil diupload',
      fileUrl,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return json({ message: 'Terjadi kesalahan saat mengupload file' }, { status: 500 });
  }
}; 