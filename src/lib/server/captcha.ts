import { env } from '$env/dynamic/private';

/**
 * Verifikasi token CAPTCHA dari Cloudflare Turnstile
 * @param token Token yang diterima dari frontend
 * @param ip IP address pengguna (opsional)
 * @returns Promise<boolean> Hasil verifikasi
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  try {
    if (!token) return false;
    
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    
    if (ip) {
      formData.append('remoteip', ip);
    }

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const result = await fetch(url, {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json();
    
    if (!outcome.success) {
      console.error('Turnstile validation failed:', outcome['error-codes']);
    }
    
    return outcome.success === true;
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return false;
  }
} 