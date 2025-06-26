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
  let showUserDropdown = $state(false); // State untuk dropdown user
  let showMobileMenu = $state(false); // State untuk menu mobile
  
  // Fungsi untuk toggle dropdown user
  const toggleUserDropdown = () => {
    showUserDropdown = !showUserDropdown;
  };

  // Fungsi untuk toggle menu mobile
  const toggleMobileMenu = () => {
    showMobileMenu = !showMobileMenu;
  };

  // Fungsi untuk menutup dropdown saat klik di luar
  const handleClickOutside = (event: MouseEvent) => {
    const userDropdown = document.getElementById('userDropdown');
    const userButton = document.getElementById('userButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const hamburgerButton = document.getElementById('hamburgerButton');
    
    if (userDropdown && userButton && showUserDropdown) {
      if (!userDropdown.contains(event.target as Node) && !userButton.contains(event.target as Node)) {
        showUserDropdown = false;
      }
    }
    
    // Tutup menu mobile jika klik di luar dan bukan pada tombol hamburger
    if (mobileMenu && hamburgerButton && showMobileMenu) {
      if (!mobileMenu.contains(event.target as Node) && !hamburgerButton.contains(event.target as Node)) {
        showMobileMenu = false;
      }
    }
  };
  
  // Fungsi untuk menampilkan dialog konfirmasi logout
  const confirmLogout = () => {
    showLogoutConfirm = true;
    showUserDropdown = false;
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
      
      // Pastikan CSRF token tersedia
      if (!$page.data.csrfToken) {
        console.error('CSRF token not available');
        logoutError = 'Token keamanan tidak tersedia';
        showLogoutConfirm = false;
        return;
      }
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken
        }
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
    
    // Simpan preferensi ke localStorage
    if (isDarkMode) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  };
  
  // Navigasi via menu
  const navigateTo = (path: string) => {
    showMobileMenu = false; // Tutup menu setelah navigasi
    goto(path);
  };
  
  // Cek status dark mode saat komponen dimuat
  import { onMount } from 'svelte';
  
  onMount(() => {
    // Tambahkan event listener untuk menutup dropdown saat klik di luar
    document.addEventListener('click', handleClickOutside);
    
    // Periksa preferensi tema dari localStorage terlebih dahulu
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
      // Jika pengguna sebelumnya memilih tema gelap
      document.documentElement.classList.add('dark');
      isDarkMode = true;
    } else if (savedTheme === 'light') {
      // Jika pengguna sebelumnya memilih tema terang
      document.documentElement.classList.remove('dark');
      isDarkMode = false;
    } else {
      // Jika belum ada preferensi, gunakan preferensi sistem
      if (document.documentElement.classList.contains('dark')) {
        isDarkMode = true;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // Jika pengguna memiliki preferensi dark mode, terapkan
        document.documentElement.classList.add('dark');
        isDarkMode = true;
      }
    }
    
    return () => {
      // Hapus event listener saat komponen di-unmount
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<header class="fixed top-0 left-0 right-[var(--scrollbar-width,17px)] bg-[#2463EB] dark:bg-[#1c4fd0] shadow-lg z-40">
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center h-[53px]">
      <!-- Hamburger Menu untuk Mobile -->
      {#if user && user.role === 'ADMIN'}
        <button 
          id="hamburgerButton"
          class="md:hidden flex items-center justify-center p-2 rounded text-white hover:bg-[#1d54cc] transition-colors"
          onclick={toggleMobileMenu}
          aria-label="Menu navigasi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      {/if}
      
      <!-- Logo dan Judul -->
      <a href="/" class="flex items-center gap-2">
        <div class="flex items-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span class="font-bold text-lg tracking-tight">Peta Ingatan "Petrus"</span>
        </div>
      </a>
      
      <!-- Kontrol User dan Dark Mode -->
      <div class="flex gap-3 items-center">
        {#if user}
          <div class="relative">
            <button 
              id="userButton"
              class="flex items-center gap-2 hover:bg-[#1d54cc] rounded-lg px-3 py-1.5 transition-colors text-white"
              onclick={toggleUserDropdown} 
              aria-expanded={showUserDropdown}
              aria-haspopup="true"
            >
              <div class="w-7 h-7 rounded-full bg-[#3b75eb] flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span class="text-sm hidden sm:inline">{user.username}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {#if showUserDropdown}
              <div 
                id="userDropdown"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div class="py-2">
                  {#if user.role === 'ADMIN'}
                    <a 
                      href="/admin/dashboard" 
                      class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-[#2463EB] dark:text-[#5b8bef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Dashboard
                    </a>
                  {/if}
                  <button 
                    onclick={confirmLogout} 
                    class="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    disabled={isLoggingOut}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            {/if}
          </div>
          
          {#if logoutError}
            <span class="text-xs text-red-400">{logoutError}</span>
          {/if}
        {/if}
        
        <button 
          onclick={toggleDarkMode} 
          class="p-2 rounded-full hover:bg-[#1d54cc] transition-colors duration-300 text-white" 
          aria-label="Toggle dark mode"
        >
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
  </div>
</header>

<!-- Mobile Menu Sidebar (untuk Admin) -->
{#if showMobileMenu && user && user.role === 'ADMIN'}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50" 
    onclick={toggleMobileMenu}
    onkeydown={(e) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && toggleMobileMenu()}
    role="button"
    tabindex="0"
    aria-label="Tutup menu seluler"
  ></div>
  <div 
    id="mobileMenu"
    class="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform {showMobileMenu ? 'translate-x-0' : '-translate-x-full'}"
  >
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div class="flex items-center">
        <div class="w-8 h-8 rounded-full bg-[#2463EB] flex items-center justify-center text-white mr-2">
          <span class="font-bold text-sm">AD</span>
        </div>
        <div>
          <div class="font-semibold text-gray-900 dark:text-white">{user.username}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">ADMIN</div>
        </div>
      </div>
      <button 
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
        onclick={toggleMobileMenu}
        aria-label="Tutup menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <nav class="p-2">
      <a href="/admin/dashboard" class="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-[#e9effd] dark:hover:bg-[#1c4fd0]/20 rounded-lg mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[#2463EB] dark:text-[#5b8bef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 001-1v-1a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 001 1" />
        </svg>
        Dashboard
      </a>
      
      <a href="/admin/users" class="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-[#e9effd] dark:hover:bg-[#1c4fd0]/20 rounded-lg mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[#2463EB] dark:text-[#5b8bef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Pengguna
      </a>
      
      <a href="/admin/markers" class="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-[#e9effd] dark:hover:bg-[#1c4fd0]/20 rounded-lg mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[#2463EB] dark:text-[#5b8bef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Marker
      </a>
      
      <a href="/admin/markers/add" class="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-[#e9effd] dark:hover:bg-[#1c4fd0]/20 rounded-lg mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[#2463EB] dark:text-[#5b8bef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Tambah Marker
      </a>
      
      <a href="/admin/settings/security" class="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-[#e9effd] dark:hover:bg-[#1c4fd0]/20 rounded-lg mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[#2463EB] dark:text-[#5b8bef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Keamanan
      </a>
    </nav>
  </div>
{/if}

<!-- Dialog Konfirmasi Logout -->
{#if showLogoutConfirm}
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
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
          onclick={cancelLogout}
          class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Batal
        </button>
        
        <button
          onclick={handleLogout}
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
  
  /* Animasi untuk dropdown */
  #userDropdown {
    animation: dropdownAnimation 0.2s ease-out forwards;
    transform-origin: top right;
  }
  
  /* Animasi untuk sidebar mobile */
  #mobileMenu {
    animation: slideInFromLeft 0.3s ease-out;
  }
  
  @keyframes slideInFromLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  @keyframes dropdownAnimation {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Deteksi lebar scrollbar saat halaman load */
  :global(:root) {
    --scrollbar-width: 17px;
  }
  
  /* Cek jika browser ada scrollbar */
  @media screen and (min-width: 0px) {
    :global(:root) {
      --scrollbar-width: calc(100vw - 100%);
    }
  }
</style>

<svelte:head>
  <!-- Skrip untuk mendeteksi lebar scrollbar -->
  <script>
    // Deteksi lebar scrollbar dan atur CSS variable
    function updateScrollbarWidth() {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');
    }
    // Panggil saat halaman dimuat
    updateScrollbarWidth();
    // Panggil saat ukuran jendela berubah
    window.addEventListener('resize', updateScrollbarWidth);
  </script>
</svelte:head>

