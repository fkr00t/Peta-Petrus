<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { fetchWithAuth } from '$lib/client/auth';
  
  // State
  let loading = true;
  let error = '';
  let twoFactorEnabled = false;
  
  onMount(async () => {
    if (!$page.data.isAdmin) {
      return;
    }
    
    await checkTwoFactorStatus();
  });
  
  // Cek apakah admin sudah mengaktifkan 2FA
  async function checkTwoFactorStatus() {
    try {
      loading = true;
      const response = await fetchWithAuth('/api/auth/2fa/status');
      
      if (response.ok) {
        const data = await response.json();
        twoFactorEnabled = data.enabled;
      } else {
        const data = await response.json();
        error = data.message || 'Terjadi kesalahan saat memeriksa status 2FA';
      }
    } catch (err) {
      console.error('Error checking 2FA status:', err);
      error = 'Terjadi kesalahan saat memeriksa status 2FA';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Pengaturan Keamanan - Admin Panel</title>
</svelte:head>

<div class="p-6">
  <header class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Keamanan</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Kelola pengaturan keamanan untuk akun admin
    </p>
  </header>
  
  {#if loading}
    <div class="flex justify-center my-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
      <p>{error}</p>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Autentikasi Dua Faktor (2FA)</h2>
        
        <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${twoFactorEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
          {twoFactorEnabled ? 'Aktif' : 'Tidak Aktif'}
        </span>
      </div>
      
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {#if twoFactorEnabled}
          Akun admin Anda sudah dilindungi dengan autentikasi dua faktor. Ini membantu mencegah akses tidak sah ke akun admin meskipun password Anda diketahui oleh orang lain.
        {:else}
          Sebagai admin, sangat direkomendasikan untuk mengaktifkan autentikasi dua faktor (2FA) untuk melindungi akun Anda dan data sensitif di aplikasi.
        {/if}
      </p>
      
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <a 
          href="/admin/settings/security/2fa"
          class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {twoFactorEnabled ? 'Kelola Pengaturan 2FA' : 'Aktifkan 2FA'}
        </a>
        
        <a 
          href="/admin/settings/security/change-password"
          class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Ubah Password
        </a>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pengaturan Keamanan Lainnya</h2>
      
      <div class="space-y-6">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">Wajibkan 2FA untuk Semua Admin</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-2">
            Pengaturan ini memerlukan pengembangan lebih lanjut. Fitur ini akan memungkinkan Anda untuk mewajibkan semua admin mengaktifkan 2FA.
          </p>
          <button 
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 opacity-50 cursor-not-allowed"
            disabled
          >
            Belum Tersedia
          </button>
        </div>
        
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">Log Aktivitas Keamanan</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-2">
            Pengaturan ini memerlukan pengembangan lebih lanjut. Fitur ini akan memungkinkan Anda untuk melihat log aktivitas keamanan seperti login, perubahan password, dan upaya login yang gagal.
          </p>
          <button 
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 opacity-50 cursor-not-allowed"
            disabled
          >
            Belum Tersedia
          </button>
        </div>
      </div>
    </div>
  {/if}
</div> 