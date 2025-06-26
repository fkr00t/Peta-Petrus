<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { fetchWithAuth } from '$lib/client/auth';
  import { sanitizeString } from '$lib/utils';
  
  // State
  let loading = false;
  let success = '';
  let error = '';
  let featureAvailable = true; // Ubah menjadi true karena API sudah tersedia
  
  // Form data
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  
  // Visibilitas password
  let showCurrentPassword = false;
  let showNewPassword = false;
  let showConfirmPassword = false;
  
  // Validasi password
  let passwordStrength = 0;
  let passwordFeedback = '';
  
  // Perbarui kekuatan password saat diketik
  function updatePasswordStrength(password: string) {
    // Reset
    passwordStrength = 0;
    passwordFeedback = '';
    
    if (!password) return;
    
    // Kriteria dasar: panjang
    if (password.length >= 8) {
      passwordStrength += 1;
    } else {
      passwordFeedback = 'Password minimal 8 karakter';
      return;
    }
    
    // Kriteria: huruf kecil dan kapital
    if (/[a-z]/.test(password)) passwordStrength += 1;
    if (/[A-Z]/.test(password)) passwordStrength += 1;
    
    // Kriteria: angka
    if (/\d/.test(password)) passwordStrength += 1;
    
    // Kriteria: karakter khusus
    if (/[^a-zA-Z0-9]/.test(password)) passwordStrength += 1;
    
    // Feedback berdasarkan kekuatan
    if (passwordStrength <= 2) {
      passwordFeedback = 'Password lemah';
    } else if (passwordStrength <= 4) {
      passwordFeedback = 'Password sedang';
    } else {
      passwordFeedback = 'Password kuat';
    }
  }
  
  // Submit form
  async function changePassword() {
    // Reset state
    success = '';
    error = '';
    
    // Validasi dasar
    if (!currentPassword) {
      error = 'Password saat ini wajib diisi';
      return;
    }
    
    if (!newPassword) {
      error = 'Password baru wajib diisi';
      return;
    }
    
    if (newPassword !== confirmPassword) {
      error = 'Password baru dan konfirmasi tidak cocok';
      return;
    }
    
    if (passwordStrength < 3) {
      error = 'Password baru terlalu lemah. Gunakan kombinasi huruf kecil, kapital, angka, dan karakter khusus';
      return;
    }
    
    try {
      loading = true;
      
      // currentPassword dan newPassword tidak disanitasi untuk menghindari modifikasi karakter khusus yang valid dalam password
      const response = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          csrf: $page.data.csrfToken
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        success = data.message || 'Password berhasil diubah';
        
        // Reset form setelah berhasil
        currentPassword = '';
        newPassword = '';
        confirmPassword = '';
        passwordStrength = 0;
        passwordFeedback = '';
      } else {
        const data = await response.json();
        error = data.message || 'Gagal mengubah password';
      }
    } catch (err) {
      console.error('Error changing password:', err);
      error = 'Terjadi kesalahan saat mengubah password';
    } finally {
      loading = false;
    }
  }
  
  // Toggle password visibility
  function togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    if (field === 'current') showCurrentPassword = !showCurrentPassword;
    if (field === 'new') showNewPassword = !showNewPassword;
    if (field === 'confirm') showConfirmPassword = !showConfirmPassword;
  }
</script>

<svelte:head>
  <title>Ubah Password - Panel Admin</title>
</svelte:head>

<div class="p-6">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Ubah Password</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Perbarui password akun admin Anda secara berkala untuk menjaga keamanan
    </p>
  </div>
  
  {#if success}
    <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-400 rounded-md">
      <p>{success}</p>
    </div>
  {/if}
  
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
      <p>{error}</p>
    </div>
  {/if}
  
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <form onsubmit={(e) => { e.preventDefault(); changePassword(); }} class="space-y-6">
      <!-- Password saat ini -->
      <div>
        <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password Saat Ini
        </label>
        <div class="relative">
          <input
            bind:value={currentPassword}
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            placeholder="Masukkan password saat ini"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 pr-10"
            required
          />
          <button 
            type="button"
            class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 focus:outline-none"
            onclick={(e) => togglePasswordVisibility('current')}
          >
            {#if showCurrentPassword}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
      
      <!-- Password baru -->
      <div>
        <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password Baru
        </label>
        <div class="relative">
          <input
            bind:value={newPassword}
            oninput={() => updatePasswordStrength(newPassword)}
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            placeholder="Masukkan password baru"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 pr-10"
            required
            minlength="8"
          />
          <button 
            type="button"
            class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 focus:outline-none"
            onclick={(e) => togglePasswordVisibility('new')}
          >
            {#if showNewPassword}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            {/if}
          </button>
        </div>
        
        {#if newPassword}
          <!-- Password strength indicator -->
          <div class="mt-2">
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                class={`h-full transition-all duration-300 ${
                  passwordStrength <= 2 ? 'bg-red-500' : 
                  passwordStrength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                }`} 
                style={`width: ${passwordStrength * 20}%`}
              ></div>
            </div>
            <p class="text-xs mt-1 text-gray-600 dark:text-gray-400">{passwordFeedback}</p>
          </div>
          
          <!-- Password requirements -->
          <div class="mt-3 text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <p>Password harus memenuhi kriteria berikut:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li class={newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                Minimal 8 karakter
              </li>
              <li class={/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                Mengandung huruf kecil
              </li>
              <li class={/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                Mengandung huruf kapital
              </li>
              <li class={/\d/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                Mengandung angka
              </li>
              <li class={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                Mengandung karakter khusus
              </li>
            </ul>
          </div>
        {/if}
      </div>
      
      <!-- Konfirmasi password -->
      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Konfirmasi Password Baru
        </label>
        <div class="relative">
          <input
            bind:value={confirmPassword}
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Masukkan ulang password baru"
            class={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 pr-10 ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-red-500 dark:border-red-500' : ''}`}
            required
          />
          <button 
            type="button"
            class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 focus:outline-none"
            onclick={(e) => togglePasswordVisibility('confirm')}
          >
            {#if showConfirmPassword}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            {/if}
          </button>
        </div>
        
        {#if newPassword && confirmPassword && newPassword !== confirmPassword}
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">
            Password tidak cocok
          </p>
        {/if}
      </div>
      
      <!-- Submit button -->
      <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <a 
          href="/admin/settings/security"
          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Kembali ke Pengaturan Keamanan
        </a>
        
        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 3}
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
        >
          {loading ? 'Memproses...' : 'Ubah Password'}
        </button>
      </div>
    </form>
  </div>
</div> 