<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  let username = '';
  let password = '';
  let loading = false;
  let error = '';
  
  async function handleLogin() {
    if (!username || !password) {
      error = 'Username dan password harus diisi';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Login berhasil, cek role user
        if (data.user && data.user.role === 'ADMIN') {
          // Jika admin, redirect ke dashboard admin
          goto('/admin/dashboard');
        } else {
          // Jika bukan admin, redirect ke halaman utama
          goto('/');
        }
        
        // Solusi untuk masalah refresh: reload halaman untuk memastikan data user tersedia
        window.location.href = data.user && data.user.role === 'ADMIN' ? '/admin/dashboard' : '/';
      } else {
        // Login gagal, tampilkan pesan error
        error = data.message || 'Login gagal, silakan coba lagi.';
      }
    } catch (err) {
      console.error('Error during login:', err);
      error = 'Terjadi kesalahan saat login. Silakan coba lagi.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Peta Petrus</title>
  <meta name="description" content="Masuk ke akun Peta Petrus untuk mengakses fitur dokumentasi interaktif pelanggaran HAM" />
</svelte:head>

<div class="flex min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 dark:from-gray-900 dark:to-gray-800">
  <!-- Bagian kiri: Ilustrasi dan Deskripsi -->
  <div class="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-primary-700 text-white">
    <div class="max-w-md">
      <div class="mb-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <h1 class="text-3xl font-bold">Peta Petrus</h1>
      </div>
      
      <h2 class="text-2xl font-semibold mb-4">Dokumentasi Interaktif Pelanggaran HAM</h2>
      
      <p class="mb-6 opacity-90 leading-relaxed">
        Projek ini didedikasikan untuk mendokumentasikan peristiwa Penembakan Misterius (Petrus) 
        yang telah diakui sebagai pelanggaran HAM berat masa lalu oleh Presiden Joko Widodo.
      </p>
      
      <div class="grid grid-cols-2 gap-4 mb-8">
        <div class="bg-white/10 p-4 rounded-lg">
          <div class="text-3xl font-bold mb-2">30+</div>
          <div class="text-sm opacity-80">Lokasi Tercatat</div>
        </div>
        <div class="bg-white/10 p-4 rounded-lg">
          <div class="text-3xl font-bold mb-2">3000+</div>
          <div class="text-sm opacity-80">Korban Petrus</div>
        </div>
      </div>
      
      <div class="flex items-center space-x-2 opacity-80 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Data bersumber dari penyintas dan korban Petrus</span>
      </div>
    </div>
  </div>
  
  <!-- Bagian kanan: Form Login -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-6">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Selamat Datang Kembali</h2>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Masuk untuk melanjutkan</p>
      </div>
      
      {#if error}
        <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleLogin} class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <input
              id="username"
              name="username"
              type="text"
              bind:value={username}
              required
              class="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white transition-colors"
              placeholder="Masukkan username Anda"
            />
          </div>
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              id="password"
              name="password"
              type="password"
              bind:value={password}
              required
              class="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white transition-colors"
              placeholder="Masukkan password Anda"
            />
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            class="w-full py-3 px-4 flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 font-medium"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memproses...
            {:else}
              Masuk
            {/if}
          </button>
        </div>
      </form>
      
      <div class="mt-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">Belum punya akun?</p>
        <a href="/register" class="mt-1 inline-block font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          Daftar sekarang
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  /* Variabel untuk warna primary */
  :root {
    --color-primary-300: rgb(147, 197, 253);
    --color-primary-400: rgb(96, 165, 250);
    --color-primary-500: rgb(59, 130, 246);
    --color-primary-600: rgb(37, 99, 235);
    --color-primary-700: rgb(29, 78, 216);
  }
  
  /* Dukungan dark mode */
  :global(.dark) {
    --color-primary-300: rgb(180, 210, 255);
    --color-primary-400: rgb(129, 185, 255);
    --color-primary-500: rgb(88, 155, 255);
    --color-primary-600: rgb(55, 125, 255);
    --color-primary-700: rgb(37, 105, 240);
  }
  
  /* Kelas untuk warna primary */
  .bg-primary-600 { background-color: var(--color-primary-600); }
  .bg-primary-700 { background-color: var(--color-primary-700); }
  .hover\:bg-primary-700:hover { background-color: var(--color-primary-700); }
  .focus\:ring-primary-400:focus { --tw-ring-color: var(--color-primary-400); }
  .focus\:ring-primary-500:focus { --tw-ring-color: var(--color-primary-500); }
  .text-primary-600 { color: var(--color-primary-600); }
  .dark\:text-primary-400 { color: var(--color-primary-400); }
  .dark\:hover\:text-primary-300:hover { color: var(--color-primary-300); }
</style> 