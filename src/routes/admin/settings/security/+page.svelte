<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { fetchWithAuth } from '$lib/client/auth';
  
  // State
  let loading = true;
  let error = '';
  let twoFactorEnabled = false;
  
  // State untuk notifikasi
  let showNotification = false;
  let notificationMessage = '';
  let notificationType = 'success'; // 'success', 'error', 'info'
  let notificationTimeout: number | null = null;
  
  // Fungsi untuk menampilkan notifikasi
  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 5000) {
    // Clear existing timeout if any
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    notificationMessage = message;
    notificationType = type;
    showNotification = true;
    
    // Auto hide after duration
    notificationTimeout = window.setTimeout(() => {
      showNotification = false;
    }, duration);
  }
  
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
        // Jika API tidak ada atau error, set default false dan tampilkan halaman
        console.warn('2FA status API not available:', response.status);
        twoFactorEnabled = false;
        // Jangan set error agar halaman tetap ditampilkan
      }
    } catch (err) {
      console.error('Error checking 2FA status:', err);
      // Set default false jika terjadi error
      twoFactorEnabled = false;
      // Jangan set error agar halaman tetap ditampilkan
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Peta Petrus - Pengaturan Keamanan</title>
  <style>
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .animate-slide-in-right {
      animation: slideInRight 0.3s ease-out;
    }
  </style>
</svelte:head>

<!-- Main Layout dengan Background Gradient -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
  
  <!-- Header Section -->
  <div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-5">
    <div class="container mx-auto px-4 py-4">
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <a href="/admin/dashboard" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
          </svg>
        </a>
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
        </svg>
        <span class="text-gray-500 dark:text-gray-500">Pengaturan</span>
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
        </svg>
        <span class="text-gray-900 dark:text-white font-medium">Keamanan</span>
      </nav>

      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Pengaturan Keamanan</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">Kelola keamanan akun dan sistem</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-3 mt-4 lg:mt-0">
          <button 
            onclick={() => checkTwoFactorStatus()}
            class="px-3 md:px-4 py-2 md:py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 flex items-center space-x-2 shadow-sm text-sm md:text-base"
          >
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="font-medium">Refresh</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Main Content -->
  <div class="container mx-auto px-4 py-8">
    {#if loading}
      <!-- Loading State -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {#each Array(4) as _}
          <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 animate-pulse">
            <div class="flex items-center justify-between mb-4">
              <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
            </div>
            <div class="space-y-2 mb-6">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        {/each}
      </div>
    {:else if error}
      <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
        <p>{error}</p>
      </div>
    {:else}
      <!-- Security Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- 2FA Status -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
          <div class="flex items-center justify-between mb-4">
            <div class="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <span class={`px-3 py-1 rounded-full text-sm font-medium ${
              twoFactorEnabled 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {twoFactorEnabled ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Autentikasi 2FA</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            {twoFactorEnabled ? 'Akun Anda terlindungi dengan baik' : 'Tingkatkan keamanan akun'}
          </p>
        </div>

        <!-- Password Security -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
          <div class="flex items-center justify-between mb-4">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"/>
              </svg>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Terkonfigurasi
            </span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Password</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            Password terenkripsi dengan aman
          </p>
        </div>

        <!-- Admin Access -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
          <div class="flex items-center justify-between mb-4">
            <div class="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              Admin
            </span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Hak Akses</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            Akses administrator penuh
          </p>
        </div>
      </div>

      <!-- Main Security Settings -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- 2FA Configuration -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-8">
          <div class="flex items-center space-x-4 mb-6">
            <div class="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Autentikasi Dua Faktor</h2>
              <p class="text-gray-600 dark:text-gray-400">Keamanan berlapis untuk akun Anda</p>
            </div>
          </div>

          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status Saat Ini</span>
              <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                twoFactorEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                <div class={`w-2 h-2 rounded-full mr-2 ${twoFactorEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                {twoFactorEnabled ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>
            
            <p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {#if twoFactorEnabled}
                🛡️ Akun admin Anda sudah dilindungi dengan autentikasi dua faktor. Ini membantu mencegah akses tidak sah meskipun password Anda diketahui orang lain.
              {:else}
                ⚠️ Sebagai admin, sangat direkomendasikan untuk mengaktifkan autentikasi dua faktor (2FA) untuk melindungi akun dan data sensitif aplikasi.
              {/if}
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <a 
              href="/admin/settings/security/2fa"
              class="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {twoFactorEnabled ? 'Kelola 2FA' : 'Aktifkan 2FA'}
            </a>
          </div>
        </div>

        <!-- Password Management -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-8">
          <div class="flex items-center space-x-4 mb-6">
            <div class="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Manajemen Password</h2>
              <p class="text-gray-600 dark:text-gray-400">Keamanan akses login Anda</p>
            </div>
          </div>

          <div class="mb-6">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Password Terenkripsi</span>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <div class="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
                  Aman
                </span>
              </div>
              
              <div class="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                <div class="flex items-start space-x-3">
                  <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white text-sm">Tips Keamanan Password</h4>
                    <ul class="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• Gunakan kombinasi huruf besar, kecil, angka, dan simbol</li>
                      <li>• Minimal 12 karakter untuk keamanan optimal</li>
                      <li>• Ubah password secara berkala setiap 3-6 bulan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <a 
              href="/admin/settings/security/change-password"
              class="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"/>
              </svg>
              Ubah Password
            </a>
          </div>
        </div>
      </div>

      <!-- Advanced Security Settings -->
      <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-8">
        <div class="flex items-center space-x-4 mb-6">
          <div class="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Pengaturan Lanjutan</h2>
            <p class="text-gray-600 dark:text-gray-400">Fitur keamanan tambahan untuk admin</p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Force 2FA for All Admins -->
          <div class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Wajibkan 2FA untuk Semua Admin</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                  Fitur ini akan memungkinkan Anda untuk mewajibkan semua admin mengaktifkan autentikasi dua faktor sebelum dapat mengakses panel admin.
                </p>
                <div class="flex items-center space-x-3">
                  <button 
                    class="inline-flex items-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 text-sm font-medium rounded-lg text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors cursor-not-allowed opacity-60"
                    disabled
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Segera Hadir
                  </button>
                  <span class="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                    🚧 Dalam Pengembangan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Activity Logs -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Log Aktivitas Keamanan</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                  Pantau semua aktivitas keamanan seperti login, perubahan password, upaya login gagal, dan aktivitas admin lainnya.
                </p>
                <div class="flex items-center space-x-3">
                  <button 
                    class="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-not-allowed opacity-60"
                    disabled
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    Lihat Log
                  </button>
                  <span class="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    🚧 Dalam Pengembangan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Session Management -->
          <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Manajemen Sesi Login</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                  Kelola dan pantau sesi login aktif, termasuk kemampuan untuk mengakhiri sesi dari perangkat lain secara remote.
                </p>
                <div class="flex items-center space-x-3">
                  <button 
                    class="inline-flex items-center px-4 py-2 border border-purple-300 dark:border-purple-600 text-sm font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-not-allowed opacity-60"
                    disabled
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                    </svg>
                    Kelola Sesi
                  </button>
                  <span class="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                    🚧 Dalam Pengembangan
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Notification Toast -->
{#if showNotification}
  <div class="fixed top-4 right-4 z-50 max-w-sm w-full animate-slide-in-right">
    <div class={`rounded-xl shadow-lg p-4 border backdrop-blur-sm ${
      notificationType === 'success' 
        ? 'bg-emerald-50/90 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' 
        : notificationType === 'error'
          ? 'bg-red-50/90 dark:bg-red-900/30 border-red-200 dark:border-red-800'
          : 'bg-blue-50/90 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
    }`}>
      <div class="flex items-start">
        <div class="flex-shrink-0">
          {#if notificationType === 'success'}
            <svg class="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          {:else if notificationType === 'error'}
            <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          {:else}
            <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          {/if}
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class={`text-sm font-medium ${
            notificationType === 'success'
              ? 'text-emerald-800 dark:text-emerald-200'
              : notificationType === 'error'
                ? 'text-red-800 dark:text-red-200'
                : 'text-blue-800 dark:text-blue-200'
          }`}>
            {notificationMessage}
          </p>
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button
            onclick={() => showNotification = false}
            class={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              notificationType === 'success'
                ? 'text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800 focus:ring-emerald-600'
                : notificationType === 'error'
                  ? 'text-red-500 hover:bg-red-100 dark:hover:bg-red-800 focus:ring-red-600'
                  : 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800 focus:ring-blue-600'
            }`}
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 