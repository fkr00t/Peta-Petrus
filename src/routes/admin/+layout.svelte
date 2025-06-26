<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  // Ambil data user
  let { children, data } = $props<{ children: any; data: { isAdmin: boolean; user: any } }>();
  
  // Redirect jika bukan admin
  onMount(() => {
    if (!data.isAdmin) {
      goto('/');
    }
    
    // Hanya manipulasi DOM jika berada di browser
    if (browser) {
      document.body.classList.add('admin-page');
    }
  });
  
  onDestroy(() => {
    // Hanya manipulasi DOM jika berada di browser
    if (browser) {
      document.body.classList.remove('admin-page');
    }
  });
  
  // Tab aktif
  let activeTab = $state('dashboard');
  
  // Set tab aktif berdasarkan URL saat ini
  let currentPath = $derived($page.url.pathname);
  $effect(() => {
    if (currentPath.includes('/admin/dashboard')) {
      activeTab = 'dashboard';
    } else if (currentPath.includes('/admin/markers/add')) {
      activeTab = 'add';
    } else if (currentPath.includes('/admin/markers/manage')) {
      activeTab = 'manage';
    } else if (currentPath.includes('/admin/markers/edit')) {
      activeTab = 'manage'; // Edit juga termasuk dalam "manage"
    }
  });

  // Toggle sidebar untuk mobile
  let showSidebar = $state(false);
  const toggleSidebar = () => {
    showSidebar = !showSidebar;
  };
</script>

<svelte:head>
  <title>Peta Petrus - Admin Panel</title>
</svelte:head>

<div class="flex h-screen bg-gray-100 dark:bg-gray-900">
  <!-- Sidebar - Desktop (fixed) & Mobile (overlay) -->
  <aside class={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 z-50 flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-md transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto`}>
    <!-- Logo and Brand -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <h1 class="text-xl font-bold text-gray-800 dark:text-white">Peta Petrus</h1>
      </div>
      <button onclick={toggleSidebar} class="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- User Info -->
    <div class="flex items-center px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
        {data.user?.username?.substring(0, 2).toUpperCase() || 'AD'}
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium text-gray-800 dark:text-white">{data.user?.username || 'Admin'}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">{data.user?.role || 'ADMIN'}</p>
      </div>
    </div>
    
    <!-- Navigation Links -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">      
      {#if $page.data.isAdmin}
        <div class="px-3 py-2">
          <!-- <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Administrasi
          </h3> -->
          <div class="mt-2 space-y-1">
            <a 
              href="/admin/dashboard" 
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-md {$page.url.pathname === '/admin/dashboard' ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}"
            >
              <svg 
                class="mr-3 h-5 w-5 {$page.url.pathname === '/admin/dashboard' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
            
            <a 
              href="/admin/users" 
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-md {$page.url.pathname.startsWith('/admin/users') ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}"
            >
              <svg 
                class="mr-3 h-5 w-5 {$page.url.pathname.startsWith('/admin/users') ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Pengguna
            </a>
            
            <!-- <a 
              href="/admin/categories" 
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-md {$page.url.pathname.startsWith('/admin/categories') ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}"
            >
              <svg 
                class="mr-3 h-5 w-5 {$page.url.pathname.startsWith('/admin/categories') ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Kategori
            </a> -->
            
            <a 
              href="/admin/markers/manage" 
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-md {$page.url.pathname.startsWith('/admin/markers') && !$page.url.pathname.startsWith('/admin/markers/add') ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}"
            >
              <svg 
                class="mr-3 h-5 w-5 {$page.url.pathname.startsWith('/admin/markers') && !$page.url.pathname.startsWith('/admin/markers/add') ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Marker
            </a>

                        <a 
              href="/admin/markers/add" 
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-md {$page.url.pathname.startsWith('/admin/markers/add') ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}"
            >
              <svg 
                class="mr-3 h-5 w-5 {$page.url.pathname.startsWith('/admin/markers/add') ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Marker
            </a>
            
            <a 
              href="/admin/settings/security" 
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-md {$page.url.pathname.startsWith('/admin/settings') ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}"
            >
              <svg 
                class="mr-3 h-5 w-5 {$page.url.pathname.startsWith('/admin/settings') ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Keamanan
            </a>
          </div>
        </div>
      {/if}
      
      <!-- <div class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700"> -->
      <!-- </div> -->
    </nav>
  </aside>

  <!-- Main Content -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Top Header Bar -->
    <header class="bg-white dark:bg-gray-800 shadow-sm z-10">
      <div class="px-4 py-3 flex items-center justify-between">
        <!-- Mobile Menu Button -->
        <button onclick={toggleSidebar} class="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <h1 class="text-lg font-semibold text-gray-800 dark:text-white md:block">Panel Admin</h1>
        
        <div class="flex items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400 hidden md:inline-block mr-4">
            {new Date().toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
          </span>
        </div>
      </div>
    </header>
    
    <!-- Content Area -->
    <main class="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
      <div class="container mx-auto">
        <!-- Render Child Component -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {@render children()}
        </div>
      </div>
    </main>
  </div>
</div>

<style>
  /* Ensure proper container behavior */
  :global(.admin-page html, .admin-page body) {
    height: 100%;
    /* Hanya atur overflow: hidden pada body, tapi biarkan konten dalam main dapat di-scroll */
  }

  /* Pastikan area utama konten selalu dapat di-scroll */
  main {
    overflow-y: auto !important;
    max-height: calc(100vh - 64px); /* Kurangi tinggi header */
  }
</style> 