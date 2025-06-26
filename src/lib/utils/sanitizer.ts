/**
 * @file sanitizer.ts
 * Utilitas untuk sanitasi input pengguna. File ini menyediakan fungsi-fungsi
 * untuk membantu mencegah serangan XSS (Cross-Site Scripting) dan memastikan 
 * bahwa data yang dikirim aman.
 */
import DOMPurify from 'dompurify';

/**
 * Sanitasi string sederhana
 * @param input String yang akan disanitasi
 * @returns String yang sudah disanitasi atau null jika input null/undefined
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  
  try {
    // Coba gunakan DOMPurify jika tersedia
    if (typeof DOMPurify?.sanitize === 'function') {
      return DOMPurify.sanitize(String(input).trim());
    } 
  } catch (error) {
    console.error("DOMPurify error:", error);
  }
  
  // Fallback: Sanitasi dasar tanpa DOMPurify
  return String(input)
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validasi URL
 * @param url String URL yang akan divalidasi
 * @returns Boolean true jika URL valid, false jika tidak
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Sanitasi data formulir secara rekursif
 * Fungsi ini akan melakukan sanitasi pada semua string dalam objek,
 * termasuk string dalam array dan objek bersarang
 * 
 * @param formData Object data form yang akan disanitasi
 * @returns Object baru dengan semua string sudah disanitasi
 */
export function sanitizeFormData<T extends Record<string, any>>(formData: T): Record<string, any> {
  if (!formData || typeof formData !== 'object') {
    return formData;
  }
  
  const sanitizedData: Record<string, any> = { ...formData };
  
  for (const key in sanitizedData) {
    if (!Object.prototype.hasOwnProperty.call(sanitizedData, key)) continue;
    
    const value = sanitizedData[key];
    
    if (typeof value === 'string') {
      sanitizedData[key] = sanitizeString(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitizedData[key] = sanitizeFormData(value);
    } else if (Array.isArray(value)) {
      sanitizedData[key] = value.map((item: any) => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' && item !== null ? sanitizeFormData(item) : item
      );
    }
  }
  
  return sanitizedData as T;
}

/**
 * Sanitasi semua parameter URL
 * @param url URL yang akan disanitasi parameter-nya
 * @returns URL dengan parameter yang telah disanitasi
 */
export function sanitizeUrlParams(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    params.forEach((value, key) => {
      params.set(key, sanitizeString(value) || '');
    });
    
    urlObj.search = params.toString();
    return urlObj.toString();
  } catch (e) {
    return sanitizeString(url) || '';
  }
}

/**
 * Sanitasi input formulir HTML
 * @param form Element form HTML yang akan disanitasi
 * @returns Object berisi data form yang telah disanitasi
 */
export function sanitizeFormElement(form: HTMLFormElement): Record<string, any> {
  const formData = new FormData(form);
  const data: Record<string, any> = {};
  
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      data[key] = value;
    } else {
      data[key] = value; // File atau data lain
    }
  });
  
  return sanitizeFormData(data);
}

/**
 * Membersihkan string HTML dan hanya menyisakan teks
 * Berguna untuk menghapus semua tag HTML, tidak hanya yang berbahaya
 * @param html String HTML yang akan dibersihkan
 * @returns String teks tanpa tag HTML
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  try {
    // Coba gunakan DOMPurify jika tersedia
    if (typeof DOMPurify?.sanitize === 'function') {
      return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
    }
  } catch (error) {
    console.error("DOMPurify error in stripHtml:", error);
  }
  
  // Fallback: Hapus semua tag HTML dengan regex
  return String(html)
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Mengenkripsi HTML untuk ditampilkan sebagai teks (mencegah eksekusi HTML)
 * @param html String HTML yang akan dienkripsi
 * @returns String yang aman untuk ditampilkan
 */
export function escapeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
} 