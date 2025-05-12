/**
 * Utils index file
 * Mengekspor semua fungsi utilitas dari berbagai file
 */

import { sanitizeString } from './sanitizer';

// Konstanta untuk validasi
const MAX_USERNAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 64;
const MAX_URL_LENGTH = 2048;
const MAX_EMAIL_LENGTH = 254;
const MAX_TITLE_LENGTH = 100;

// Ekspor fungsi-fungsi dari sanitizer.ts
export * from './sanitizer';

/**
 * Format tanggal ke bahasa Indonesia
 * @param dateString String tanggal yang akan diformat
 * @returns String tanggal dalam format bahasa Indonesia
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Validasi username
 * @param username Username yang akan divalidasi
 * @returns Object hasil validasi
 */
export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username diperlukan' };
  }
  
  // Bersihkan username
  const sanitizedUsername = sanitizeString(username) || '';
  
  if (sanitizedUsername.length === 0) {
    return { valid: false, message: 'Username tidak boleh kosong' };
  }
  
  if (sanitizedUsername.length > MAX_USERNAME_LENGTH) {
    return { valid: false, message: `Username tidak boleh lebih dari ${MAX_USERNAME_LENGTH} karakter` };
  }
  
  // Hanya mengizinkan huruf, angka, dan beberapa karakter khusus
  const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!usernameRegex.test(sanitizedUsername)) {
    return { valid: false, message: 'Username hanya boleh berisi huruf, angka, dan karakter _.-' };
  }
  
  return { valid: true };
}

/**
 * Validasi password
 * @param password Password yang akan divalidasi
 * @returns Object hasil validasi
 */
export function validatePassword(password: string): { valid: boolean; message?: string; strength?: number } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password diperlukan' };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter` };
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, message: `Password maksimal ${MAX_PASSWORD_LENGTH} karakter` };
  }
  
  // Hitung kekuatan password
  let strength = 0;
  
  // Kriteria dasar: panjang
  if (password.length >= 12) strength += 1;
  
  // Kriteria: huruf kecil dan kapital
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  
  // Kriteria: angka
  if (/\d/.test(password)) strength += 1;
  
  // Kriteria: karakter khusus
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  
  // Validasi kekuatan password
  if (strength < 3) {
    return { 
      valid: false, 
      message: 'Password terlalu lemah. Gunakan kombinasi huruf kecil, kapital, angka, dan karakter khusus',
      strength 
    };
  }
  
  return { valid: true, strength };
}

/**
 * Validasi URL
 * @param url URL yang akan divalidasi
 * @param allowEmpty Mengizinkan URL kosong
 * @returns Object hasil validasi
 */
export function validateUrl(url: string, allowEmpty: boolean = false): { valid: boolean; message?: string } {
  // Jika URL kosong dan dibolehkan kosong
  if ((!url || url.trim() === '') && allowEmpty) {
    return { valid: true };
  }
  
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'URL diperlukan' };
  }
  
  // Bersihkan URL
  const sanitizedUrl = sanitizeString(url) || '';
  
  if (sanitizedUrl.length === 0) {
    return { valid: false, message: 'URL tidak boleh kosong' };
  }
  
  if (sanitizedUrl.length > MAX_URL_LENGTH) {
    return { valid: false, message: `URL tidak boleh lebih dari ${MAX_URL_LENGTH} karakter` };
  }
  
  // Validasi format URL yang ketat
  try {
    // Jika URL lokal (diawali /uploads/), abaikan validasi URL lengkap
    if (sanitizedUrl.startsWith('/uploads/')) {
      return { valid: true };
    }
    
    // Untuk URL lengkap, validasi dengan URL constructor
    const urlObj = new URL(sanitizedUrl);
    
    // Pastikan protocol adalah http atau https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { valid: false, message: 'URL harus menggunakan protokol http atau https' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, message: 'Format URL tidak valid' };
  }
}

/**
 * Validasi email
 * @param email Email yang akan divalidasi
 * @returns Object hasil validasi
 */
export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email diperlukan' };
  }
  
  // Bersihkan email
  const sanitizedEmail = sanitizeString(email) || '';
  
  if (sanitizedEmail.length === 0) {
    return { valid: false, message: 'Email tidak boleh kosong' };
  }
  
  if (sanitizedEmail.length > MAX_EMAIL_LENGTH) {
    return { valid: false, message: `Email tidak boleh lebih dari ${MAX_EMAIL_LENGTH} karakter` };
  }
  
  // Validasi format email menggunakan regex yang lebih ketat
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitizedEmail)) {
    return { valid: false, message: 'Format email tidak valid' };
  }
  
  return { valid: true };
}

/**
 * Validasi title
 * @param title Title yang akan divalidasi
 * @returns Object hasil validasi
 */
export function validateTitle(title: string): { valid: boolean; message?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, message: 'Judul diperlukan' };
  }
  
  // Bersihkan title
  const sanitizedTitle = sanitizeString(title) || '';
  
  if (sanitizedTitle.length === 0) {
    return { valid: false, message: 'Judul tidak boleh kosong' };
  }
  
  if (sanitizedTitle.length > MAX_TITLE_LENGTH) {
    return { valid: false, message: `Judul tidak boleh lebih dari ${MAX_TITLE_LENGTH} karakter` };
  }
  
  return { valid: true };
}

export { sanitizeString };

// Validasi URL simple yang digunakan di beberapa tempat
export function isValidUrl(url: string): boolean {
  const result = validateUrl(url);
  return result.valid;
} 