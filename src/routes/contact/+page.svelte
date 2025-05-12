<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  
  // State untuk status pengiriman
  let isSubmitting = false;
  let success = false;
  let error = '';
  let csrfToken = '';
  
  // Rate limiting
  let lastSubmitTime = 0;
  const SUBMIT_COOLDOWN = 60000; // 60 detik cooldown antara pengiriman
  
  // Inisialisasi CSRF
  onMount(() => {
    if (browser) {
      // Generate CSRF token
      const generateCSRFToken = () => {
        const random = new Uint8Array(16);
        window.crypto.getRandomValues(random);
        return Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
      };
      
      csrfToken = generateCSRFToken();
      localStorage.setItem('csrf_token', csrfToken);
    }
  });
  
  // Sanitasi input
  function sanitizeInput(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }); // Menghapus semua tag HTML
  }
  
  // Function untuk menangani pengiriman form
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    // Rate limiting check
    const now = Date.now();
    if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
      const waitTime = Math.ceil((SUBMIT_COOLDOWN - (now - lastSubmitTime)) / 1000);
      error = `Mohon tunggu ${waitTime} detik sebelum mengirim pesan lagi`;
      return;
    }
    
    isSubmitting = true;
    error = '';
    
    try {
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const formEntries = Object.fromEntries(formData);
      
      // Sanitasi input
      const sanitizedFormData: Record<string, any> = {
        access_key: "56fbc092-2db0-4475-ad91-cd37409ea31c",
        name: sanitizeInput(formEntries.name as string),
        email: sanitizeInput(formEntries.email as string),
        subject: sanitizeInput(formEntries.subject ? (formEntries.subject as string) : ''),
        message: sanitizeInput(formEntries.message as string),
        from_page: browser ? window.location.href : '',
        botcheck: false,
        csrf_token: csrfToken
      };
      
      // CSRF validation
      if (csrfToken !== localStorage.getItem('csrf_token')) {
        throw new Error('Validasi CSRF gagal. Silakan muat ulang halaman.');
      }
      
      // Kirim form ke Web3Forms
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sanitizedFormData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        success = true;
        (event.target as HTMLFormElement).reset();
        lastSubmitTime = Date.now(); // Update waktu submit terakhir
        
        // Reset success message setelah 5 detik
        setTimeout(() => {
          success = false;
        }, 5000);
      } else {
        throw new Error(result.message || 'Terjadi kesalahan saat mengirim pesan');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim pesan, silahkan coba lagi nanti';
      console.error('Error submitting contact form:', err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Kontak Kami - Peta Petrus</title>
  <meta name="description" content="Hubungi tim Peta Petrus untuk pertanyaan, informasi, dukungan, atau kontribusi." />
</svelte:head>

<div class="bg-white dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">Hubungi Kami</h1>
      <p class="max-w-2xl mx-auto text-base text-gray-600 dark:text-gray-400">
        Jika Anda memiliki pertanyaan, ingin berkontribusi, melaporkan informasi baru, atau mendukung projek ini, silakan hubungi tim kami.
      </p>
    </div>
    
    <!-- Form Kontak -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-5 border-b border-gray-200 dark:border-gray-700 pb-2">
        Kirim Pesan
      </h2>
      
      {#if success}
        <div class="bg-green-50 dark:bg-green-900/20 p-4 mb-6 rounded-md border-l-4 border-green-500">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                Pesan berhasil dikirim! Kami akan menghubungi Anda segera.
              </p>
            </div>
          </div>
        </div>
      {/if}
      
      {#if error}
        <div class="bg-red-50 dark:bg-red-900/20 p-4 mb-6 rounded-md border-l-4 border-red-500">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit} class="space-y-5">
        <input type="hidden" name="csrf_token" value={csrfToken}>
        <input type="hidden" name="from_page" value={browser ? window.location.href : ''}>
        <input type="checkbox" name="botcheck" class="hidden">
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required
              maxlength="100"
              class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" 
            />
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required
              maxlength="100"
              class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" 
            />
          </div>
        </div>
        
        <div>
          <label for="subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjek</label>
          <input 
            type="text" 
            id="subject" 
            name="subject" 
            maxlength="150"
            class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" 
          />
        </div>
        
        <div>
          <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pesan</label>
          <textarea 
            id="message" 
            name="message" 
            required
            maxlength="3000"
            rows="5" 
            class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          ></textarea>
        </div>
        
        <div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {#if isSubmitting}
              <span class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengirim...
              </span>
            {:else}
              Kirim Pesan
            {/if}
          </button>
        </div>
      </form>
    </div>
    
    <div class="mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
      <h3 class="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">Informasi Penting</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Semua komunikasi terkait pelanggaran HAM ditangani dengan serius dan dijaga kerahasiaannya. Kami menghargai kontribusi dan informasi yang Anda berikan.
      </p>
    </div>
  </div>
</div> 