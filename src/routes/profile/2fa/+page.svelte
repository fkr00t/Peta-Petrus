<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import TwoFactorInput from '$lib/components/TwoFactorInput.svelte';
  import { fetchWithAuth } from '$lib/client/auth';
  
  // State
  let loading = true;
  let error = '';
  let twoFactorEnabled = false;
  let verificationError = '';
  let disableError = '';
  
  // Setup state
  let setupMode = false;
  let qrCodeUrl = '';
  let secret = '';
  let backupCodes: string[] = [];
  let showBackupCodes = false;
  let verifyPassword = '';
  let verifyCode = '';
  
  onMount(async () => {
    await checkTwoFactorStatus();
  });
  
  // Cek apakah user sudah mengaktifkan 2FA
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
  
  // Setup 2FA
  async function startSetup() {
    try {
      loading = true;
      setupMode = true;
      error = '';
      
      const response = await fetchWithAuth('/api/auth/2fa/setup');
      
      if (response.ok) {
        const data = await response.json();
        qrCodeUrl = data.qrCodeUrl;
        secret = data.secret;
      } else {
        const data = await response.json();
        error = data.message || 'Terjadi kesalahan saat setup 2FA';
        setupMode = false;
      }
    } catch (err) {
      console.error('Error setting up 2FA:', err);
      error = 'Terjadi kesalahan saat setup 2FA';
      setupMode = false;
    } finally {
      loading = false;
    }
  }
  
  // Verifikasi dan aktifkan 2FA
  async function verifyAndEnable(event: CustomEvent<{ code: string, isBackup: boolean }>) {
    try {
      const token = event.detail.code;
      
      if (!token) {
        verificationError = 'Kode verifikasi diperlukan';
        return;
      }
      
      loading = true;
      verificationError = '';
      
      const response = await fetchWithAuth('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          token,
          csrf: $page.data.csrfToken
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        backupCodes = data.backupCodes;
        showBackupCodes = true;
        // Update status
        twoFactorEnabled = true;
      } else {
        const data = await response.json();
        verificationError = data.message || 'Kode verifikasi tidak valid';
      }
    } catch (err) {
      console.error('Error verifying 2FA:', err);
      verificationError = 'Terjadi kesalahan saat verifikasi 2FA';
    } finally {
      loading = false;
    }
  }
  
  // Nonaktifkan 2FA
  async function disable2FA() {
    try {
      if (!verifyPassword || !verifyCode) {
        disableError = 'Password dan kode verifikasi diperlukan';
        return;
      }
      
      loading = true;
      disableError = '';
      
      const response = await fetchWithAuth('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          password: verifyPassword,
          twoFactorCode: verifyCode,
          csrf: $page.data.csrfToken
        })
      });
      
      if (response.ok) {
        await checkTwoFactorStatus();
        verifyPassword = '';
        verifyCode = '';
      } else {
        const data = await response.json();
        disableError = data.message || 'Gagal menonaktifkan 2FA';
      }
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      disableError = 'Terjadi kesalahan saat menonaktifkan 2FA';
    } finally {
      loading = false;
    }
  }
  
  // Tutup tampilan backup codes dan reset state
  function finishSetup() {
    setupMode = false;
    showBackupCodes = false;
    qrCodeUrl = '';
    secret = '';
    backupCodes = [];
  }
</script>

<svelte:head>
  <title>Pengaturan 2FA - Peta Petrus</title>
  <meta name="description" content="Pengaturan autentikasi dua faktor untuk keamanan akun Anda" />
</svelte:head>

<div class="max-w-3xl mx-auto py-8 px-4">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Autentikasi Dua Faktor</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Tingkatkan keamanan akun Anda dengan menambahkan lapisan perlindungan ekstra
    </p>
  </div>
  
  {#if loading && !setupMode && !showBackupCodes}
    <div class="flex justify-center my-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
      <p>{error}</p>
    </div>
  {:else if showBackupCodes}
    <!-- Tampilkan backup codes setelah setup berhasil -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Simpan Kode Cadangan Anda</h2>
      <p class="mb-4 text-gray-600 dark:text-gray-400">
        Silakan simpan kode cadangan ini di tempat yang aman. Kode ini diperlukan jika Anda kehilangan akses 
        ke aplikasi authenticator Anda. Setiap kode hanya dapat digunakan satu kali.
      </p>
      
      <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <div class="grid grid-cols-2 gap-2">
          {#each backupCodes as code}
            <div class="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">
              {code}
            </div>
          {/each}
        </div>
      </div>
      
      <div class="flex justify-end">
        <button 
          onclick={finishSetup}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Saya sudah menyimpan kode cadangan
        </button>
      </div>
    </div>
  {:else if setupMode}
    <!-- Mode setup 2FA -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Setup Autentikasi Dua Faktor</h2>
      
      <ol class="mb-6 space-y-4">
        <li class="flex items-start">
          <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2">1</span>
          <div>
            <p class="text-gray-700 dark:text-gray-300">
              Unduh aplikasi authenticator seperti Google Authenticator, Authy, atau Microsoft Authenticator.
            </p>
          </div>
        </li>
        <li class="flex items-start">
          <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2">2</span>
          <div>
            <p class="text-gray-700 dark:text-gray-300">
              Scan QR code di bawah ini dengan aplikasi authenticator Anda. Secara alternatif, 
              Anda dapat memasukkan kode setup secara manual.
            </p>
            
            <div class="mt-4 bg-white p-4 rounded-lg border border-gray-300 dark:border-gray-600 inline-block">
              {#if qrCodeUrl}
                <img src={qrCodeUrl} alt="QR Code" class="w-40 h-40 mx-auto" />
              {:else}
                <div class="animate-pulse bg-gray-200 w-40 h-40"></div>
              {/if}
            </div>
            
            {#if secret}
              <div class="mt-2">
                <p class="text-sm text-gray-600 dark:text-gray-400">Jika Anda tidak dapat scan QR code, masukkan kode ini secara manual:</p>
                <code class="mt-1 block bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm font-mono select-all">
                  {secret}
                </code>
              </div>
            {/if}
          </div>
        </li>
        <li class="flex items-start">
          <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2">3</span>
          <div>
            <p class="text-gray-700 dark:text-gray-300 mb-2">
              Masukkan kode 6-digit dari aplikasi authenticator Anda untuk verifikasi.
            </p>
            
            <div class="max-w-xs">
              <TwoFactorInput 
                error={verificationError} 
                showBackupOption={false}
                on:submit={verifyAndEnable}
              />
            </div>
          </div>
        </li>
      </ol>
      
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
        <button 
          onclick={() => setupMode = false}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
        >
          Batal
        </button>
      </div>
    </div>
  {:else if twoFactorEnabled}
    <!-- 2FA sudah diaktifkan -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <div class="flex items-center mb-4">
        <div class="w-10 h-10 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Autentikasi Dua Faktor Aktif</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">Akun Anda dilindungi dengan lapisan keamanan tambahan</p>
        </div>
      </div>
      
      <div class="mb-6">
        <p class="text-gray-700 dark:text-gray-300">
          Untuk masuk ke akun Anda, Anda akan diminta memasukkan:
        </p>
        <ul class="mt-2 ml-6 list-disc text-gray-600 dark:text-gray-400">
          <li>Password Anda</li>
          <li>Kode verifikasi 6-digit dari aplikasi authenticator</li>
        </ul>
      </div>
      
      <details class="mb-6">
        <summary class="text-blue-600 dark:text-blue-400 cursor-pointer font-medium">
          Nonaktifkan Autentikasi Dua Faktor
        </summary>
        
        <div class="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p class="text-gray-700 dark:text-gray-300 mb-4">
            Untuk menonaktifkan 2FA, masukkan password Anda dan kode 2FA saat ini.
          </p>
          
          {#if disableError}
            <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
              <p>{disableError}</p>
            </div>
          {/if}
          
          <div class="space-y-4">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                bind:value={verifyPassword}
                id="password"
                type="password"
                placeholder="Masukkan password Anda"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              />
            </div>
            
            <div>
              <label for="verifyCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kode Verifikasi
              </label>
              <input
                bind:value={verifyCode}
                id="verifyCode"
                type="text"
                maxlength="6"
                placeholder="Kode 6-digit dari aplikasi authenticator"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              />
            </div>
            
            <button 
              onclick={disable2FA}
              class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors duration-200"
              disabled={loading || !verifyPassword || !verifyCode}
            >
              {loading ? 'Memproses...' : 'Nonaktifkan 2FA'}
            </button>
          </div>
        </div>
      </details>
    </div>
  {:else}
    <!-- 2FA belum diaktifkan -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tingkatkan Keamanan Akun Anda</h2>
      
      <div class="flex flex-col md:flex-row gap-6 mb-6">
        <div class="flex-1">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">Apa itu Autentikasi Dua Faktor?</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Autentikasi dua faktor (2FA) menambahkan lapisan keamanan tambahan untuk akun Anda. 
            Selain password, Anda juga memerlukan kode verifikasi dari aplikasi authenticator 
            untuk masuk ke akun Anda.
          </p>
        </div>
        
        <div class="flex-1">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">Keuntungan Menggunakan 2FA</h3>
          <ul class="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
            <li>Lebih aman dari password saja</li>
            <li>Melindungi dari serangan phishing</li>
            <li>Mencegah akses tidak sah ke akun Anda</li>
            <li>Mendeteksi upaya login yang mencurigakan</li>
          </ul>
        </div>
      </div>
      
      <div class="flex justify-center">
        <button 
          onclick={startSetup}
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center"
          disabled={loading}
        >
          {#if loading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Memuat...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Aktifkan Autentikasi Dua Faktor
          {/if}
        </button>
      </div>
    </div>
  {/if}
  
  <div class="text-center">
    <a 
      href="/profile"
      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
    >
      Kembali ke Profil
    </a>
  </div>
</div> 