<!-- Komponen untuk input kode autentikasi dua faktor -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let error = '';
  export let placeholder = 'Masukkan kode verifikasi 6 digit';
  export let showBackupOption = true;
  export let autoFocus = true;
  
  // State
  let token = '';
  let usingBackupCode = false;
  let inputRef: HTMLInputElement;
  
  // Dispatcher untuk events
  const dispatch = createEventDispatcher<{
    submit: { code: string, isBackup: boolean };
    useBackup: void;
    useCode: void;
  }>();
  
  // Functions
  function handleSubmit() {
    if (!token) return;
    
    dispatch('submit', {
      code: token,
      isBackup: usingBackupCode
    });
  }
  
  function toggleBackupCode() {
    usingBackupCode = !usingBackupCode;
    token = '';
    
    if (usingBackupCode) {
      dispatch('useBackup');
    } else {
      dispatch('useCode');
    }
    
    // Focus input after toggling
    setTimeout(() => {
      inputRef?.focus();
    }, 50);
  }
  
  function handleKeyInput(e: KeyboardEvent) {
    // Format backup code to match XXXX-XXXX
    if (usingBackupCode && token.length === 4 && !token.includes('-') && e.key !== 'Backspace') {
      token = token + '-';
    }
    
    // Prevent non-numeric input for 2FA code
    if (!usingBackupCode && !/^\d*$/.test(token)) {
      token = token.replace(/\D/g, '');
    }
  }
</script>

<div class="space-y-4">
  <!-- Input field -->
  <div>
    <label for="twoFactorCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {usingBackupCode ? 'Kode Cadangan' : 'Kode Verifikasi'}
    </label>
    
    <div class="relative">
      <input
        bind:this={inputRef}
        bind:value={token}
        onkeydown={handleKeyInput}
        onkeyup={(e) => e.key === 'Enter' && handleSubmit()}
        id="twoFactorCode"
        type="text"
        autocomplete={usingBackupCode ? 'one-time-code' : 'off'}
        maxlength={usingBackupCode ? 9 : 6}
        placeholder={usingBackupCode ? 'XXXX-XXXX' : placeholder}
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-all duration-200"
        class:border-red-500={error}
        class:dark:border-red-500={error}
        autofocus={autoFocus}
      />
    </div>
    
    {#if error}
      <p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    {/if}
  </div>
  
  <!-- Tombol Verifikasi -->
  <button 
    onclick={handleSubmit}
    class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
    disabled={!token || (usingBackupCode ? token.length < 9 : token.length < 6)}
  >
    Verifikasi
  </button>
  
  <!-- Toggle untuk backup code -->
  {#if showBackupOption}
    <div class="text-center">
      <button 
        type="button" 
        onclick={toggleBackupCode}
        class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
      >
        {usingBackupCode ? 'Gunakan kode verifikasi' : 'Gunakan kode cadangan'}
      </button>
    </div>
  {/if}
</div> 