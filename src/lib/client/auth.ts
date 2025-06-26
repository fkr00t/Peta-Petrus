import { goto } from '$app/navigation';

// Variabel untuk mengontrol penggunaan refresh token
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let accessTokenExpiry: number | null = null;

// Fungsi untuk menetapkan waktu kedaluwarsa token
export function setAccessTokenExpiry(expiresInSeconds: number) {
  // Set expiry time to current time + expiresInSeconds
  accessTokenExpiry = Date.now() + (expiresInSeconds * 1000);
}

// Fungsi untuk memeriksa apakah token access sudah kedaluwarsa
export function isAccessTokenExpired(): boolean {
  if (!accessTokenExpiry) return true;
  // Anggap token kedaluwarsa 30 detik sebelum waktu sebenarnya untuk antisipasi latensi jaringan
  return Date.now() > (accessTokenExpiry - 30000);
}

// Fungsi untuk refresh token
export async function refreshAccessToken(): Promise<boolean> {
  // Jika sudah ada proses refresh yang sedang berjalan, gunakan Promise yang sama
  if (isRefreshing) {
    return refreshPromise!;
  }
  
  // Tandai proses refresh sedang berlangsung
  isRefreshing = true;
  
  // Fungsi actual untuk merefresh token
  const doRefresh = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update access token expiry
        if (data.accessTokenExpiresIn) {
          setAccessTokenExpiry(data.accessTokenExpiresIn);
        }
        
        return true;
      } else {
        // Jika refresh gagal, logout user
        console.error('Failed to refresh token. Logging out...');
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  };
  
  // Simpan promise agar bisa direuse
  refreshPromise = doRefresh();
  return refreshPromise;
}

// Fungsi untuk mengecek autentikasi sebelum fetch
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // Jika token kedaluwarsa, refresh dulu
  if (isAccessTokenExpired()) {
    const refreshSuccess = await refreshAccessToken();
    
    if (!refreshSuccess) {
      throw new Error('Authentication required');
    }
  }
  
  // Default options
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  // Merge options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Lakukan request
  return fetch(url, mergedOptions);
}

// Fungsi untuk logout
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    // Reset variabel
    accessTokenExpiry = null;
    
    // Redirect ke halaman login
    goto('/login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
} 