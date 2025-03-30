<!-- Navbar.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  let { user } = $props<{ user: { id: string; username: string; role: string } | null }>();
  
  // State untuk logout
  let isLoggingOut = $state(false);
  let logoutError = $state('');
  let showLogoutConfirm = $state(false); // State untuk dialog konfirmasi
  let isDarkMode = $state(false);
  
  // Fungsi untuk menampilkan dialog konfirmasi logout
  const confirmLogout = () => {
    showLogoutConfirm = true;
  };
  
  // Fungsi untuk membatalkan logout
  const cancelLogout = () => {
    showLogoutConfirm = false;
  };
  
  // Proses logout setelah konfirmasi
  const handleLogout = async () => {
    try {
      // Set loading state
      isLoggingOut = true;
      logoutError = '';
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Refresh halaman setelah logout berhasil
        window.location.href = '/login';
      } else {
        // Tangani error dengan lebih baik
        const errorData = await response.json();
        logoutError = errorData.message || 'Terjadi kesalahan saat logout';
        console.error('Error during logout:', logoutError);
        showLogoutConfirm = false; // Tutup dialog konfirmasi jika terjadi error
      }
    } catch (error) {
      logoutError = 'Terjadi kesalahan jaringan saat logout';
      console.error('Error during logout:', error);
      showLogoutConfirm = false; // Tutup dialog konfirmasi jika terjadi error
    } finally {
      isLoggingOut = false;
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark');
  };
  
  // Cek status dark mode saat komponen dimuat
  import { onMount } from 'svelte';
  
  onMount(() => {
    // Periksa preferensi tema pengguna atau status yang tersimpan
    if (document.documentElement.classList.contains('dark')) {
      isDarkMode = true;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Jika pengguna memiliki preferensi dark mode, terapkan
      document.documentElement.classList.add('dark');
      isDarkMode = true;
    }
  });
</script>

<header class="bg-primary-700 text-white p-3 shadow-md">
  <div class="container mx-auto flex justify-between items-center">
    <div class="flex items-center gap-2">
      <a href="/" class="flex items-center gap-2">
        <span class="text-xl font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Peta Petrus
        </span>
      </a>
    </div>
    
    <div class="flex gap-4 items-center">
      {#if user}
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <span class="text-sm">Halo, {user.username}</span>
        </div>
        
        {#if user.role === 'ADMIN'}
          <a href="/admin/dashboard" class="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white">
            Admin
          </a>
        {/if}
        
        <button 
          on:click={confirmLogout} 
          class="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-70"
          disabled={isLoggingOut}
        >
          {#if isLoggingOut}
            <span class="spinner-user-logoutBtn"></span>
          {/if}
          Logout
        </button>
        
        {#if logoutError}
          <span class="text-xs text-red-400">{logoutError}</span>
        {/if}
      {:else}
        <a href="/login" class="px-3 py-1 text-sm rounded bg-gray-600 hover:bg-gray-700 text-white">Login</a>
        <a href="/register" class="px-3 py-1 text-sm rounded bg-gray-600 hover:bg-gray-700 text-white">Register</a>
      {/if}
      
      <button on:click={toggleDarkMode} class="p-2 rounded-full hover:bg-primary-600 transition-colors duration-300" aria-label="Toggle dark mode">
        {#if isDarkMode}
          <!-- Ikon Matahari (Light Mode) -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        {:else}
          <!-- Ikon Bulan (Dark Mode) -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<!-- Dialog Konfirmasi Logout -->
{#if showLogoutConfirm}
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 mx-4 transform transition-all">
      <div class="flex items-center mb-4">
        <div class="flex-shrink-0 bg-red-100 dark:bg-red-900/30 rounded-full p-2 mr-3">
          <svg class="h-6 w-6 text-red-600 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Konfirmasi Logout</h3>
      </div>
      
      <div class="mt-2">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Apakah Anda yakin ingin keluar dari aplikasi? Sesi Anda akan berakhir.
        </p>
      </div>
      
      <div class="mt-6 flex justify-end space-x-3">
        <button
          on:click={cancelLogout}
          class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Batal
        </button>
        
        <button
          on:click={handleLogout}
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          disabled={isLoggingOut}
        >
          {#if isLoggingOut}
            <span class="spinner-user-logoutBtn inline-block align-middle"></span>
            Memproses...
          {:else}
            Ya, Logout
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .spinner-user-logoutBtn {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    margin-right: 0.5rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style> 