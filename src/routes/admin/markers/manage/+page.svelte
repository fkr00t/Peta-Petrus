<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { sanitizeString } from '$lib/utils';
  
  interface CreatedBy {
    id: string;
    username: string;
  }
  
  interface MarkerWithUser {
    id: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    createdAt: string;
    updatedAt: string;
    userId: string;
    imageUrl: string | null;
    city: string | null;
    createdBy?: CreatedBy;
    allCategories?: {
      id: string;
      name: string;
    }[];
  }
  
  // Akses data page dari store
  let markers: MarkerWithUser[] = $state([]);
  let isLoading = $state(true);
  let error = $state('');
  
  // State untuk modal konfirmasi hapus
  let showConfirmModal = $state(false);
  let markerToDelete: MarkerWithUser | null = $state(null);
  let isDeleting = $state(false);
  
  // State untuk pencarian dan pengurutan
  let searchQuery = $state('');
  let sortField = $state('createdAt');
  let sortDirection = $state('desc');
  let selectedView = $state('cards'); // 'cards' atau 'table'
  
  // State untuk notifikasi
  let showNotification = $state(false);
  let notificationMessage = $state('');
  let notificationType = $state('success'); // 'success', 'error', 'info'
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
  
  // Fungsi untuk mendapatkan marker yang difilter
  function getFilteredMarkers(): MarkerWithUser[] {
    if (!searchQuery.trim()) return markers;
    
    const query = sanitizeString(searchQuery)?.toLowerCase() || '';
    return markers.filter(marker => 
      marker.title.toLowerCase().includes(query) || 
      (marker.description && marker.description.toLowerCase().includes(query)) ||
      (marker.city && marker.city.toLowerCase().includes(query)) ||
      marker.createdBy?.username.toLowerCase().includes(query)
    );
  }
  
  // Redirect jika bukan admin
  onMount(() => {
    // Cek apakah pengguna adalah admin dari data page
    if (!$page.data.isAdmin) {
      goto('/');
    } else {
      fetchMarkers();
      
      // Cek parameter URL untuk notifikasi
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const message = urlParams.get('message');
      
      if (success === 'true' && message) {
        showToast(message, 'success');
        
        // Clear URL parameters after showing notification
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        url.searchParams.delete('message');
        history.replaceState({}, '', url);
      }
    }
    
    // Cleanup
    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  });
  
  // Fetch markers
  async function fetchMarkers() {
    isLoading = true;
    error = '';
    
    try {
      const response = await fetch('/api/markers');
      
      if (response.ok) {
        markers = await response.json();
      } else {
        const errorData = await response.json();
        error = errorData.message || 'Terjadi kesalahan saat mengambil data marker';
      }
    } catch (err) {
      console.error('Error fetching markers:', err);
      error = 'Terjadi kesalahan saat mengambil data marker';
    } finally {
      isLoading = false;
    }
  }
  
  // Format tanggal
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Format tanggal pendek
  function formatDateShort(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
  
  // Buka modal konfirmasi hapus
  function openDeleteModal(marker: MarkerWithUser) {
    markerToDelete = marker;
    showConfirmModal = true;
  }
  
  // Tutup modal konfirmasi hapus
  function closeDeleteModal() {
    markerToDelete = null;
    showConfirmModal = false;
  }
  
  // Hapus gambar dari server
  async function deleteImage(imageUrl: string | null) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      return { success: true }; // Jika tidak ada gambar atau bukan gambar di direktori uploads, anggap sukses
    }
    
    try {
      const response = await fetch('/api/upload/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          imageUrl,
          csrf: $page.data.csrfToken
        })
      });
      
      if (!response.ok) {
        console.error('Gagal menghapus file gambar:', await response.json());
        return { success: false, error: 'Gagal menghapus file gambar' };
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error saat menghapus file gambar:', err);
      return { success: false, error: 'Terjadi kesalahan saat menghapus file gambar' };
    }
  }
  
  // Hapus marker
  async function deleteMarker() {
    if (!markerToDelete) return;
    
    const idToDelete = markerToDelete.id;
    const imageUrlToDelete = markerToDelete.imageUrl;
    const titleToDelete = markerToDelete.title;
    
    isDeleting = true;
    
    try {
      // Hapus gambar terlebih dahulu jika ada
      if (imageUrlToDelete) {
        const deleteImageResult = await deleteImage(imageUrlToDelete);
        if (!deleteImageResult.success) {
          console.warn('Gagal menghapus file gambar:', deleteImageResult.error);
          // Tetap lanjutkan dengan penghapusan marker meskipun gambar gagal dihapus
        }
      }
      
      // Hapus marker dari database
      const response = await fetch(`/api/markers/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': $page.data.csrfToken || ''
        }
      });
      
      if (response.ok) {
        // Refresh data
        await fetchMarkers();
        showConfirmModal = false;
        markerToDelete = null;
        
        // Tampilkan notifikasi berhasil
        showToast(`Marker "${titleToDelete}" berhasil dihapus`, 'success');
      } else {
        // Hanya coba parse errorData jika ada content
        let errorMessage = 'Gagal menghapus marker';
        if (response.headers.get('content-length') !== '0') {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
          }
        }
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Error deleting marker:', err);
      // Ganti alert dengan toast notification untuk error
      showToast(`Gagal menghapus marker: ${err.message}`, 'error');
      closeDeleteModal();
    } finally {
      isDeleting = false;
    }
  }
  
  // Urutkan marker
  function sortMarkers(field: string) {
    if (sortField === field) {
      // Balik arah pengurutan jika field yang sama diklik
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set field pengurutan baru dan default ke ascending
      sortField = field;
      sortDirection = 'asc';
    }
    
    markers = [...markers].sort((a, b) => {
      let valueA = field === 'createdBy' ? a.createdBy?.username || '' : (a as any)[field];
      let valueB = field === 'createdBy' ? b.createdBy?.username || '' : (b as any)[field];
      
      // String comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      // Number comparison
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }
</script>

<svelte:head>
  <title>Peta Petrus - Kelola Marker</title>
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
        <span class="text-gray-900 dark:text-white font-medium">Kelola Marker</span>
      </nav>

      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Kelola Marker</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">Lihat, edit, atau hapus marker pada peta</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-3 mt-4 lg:mt-0">
          <a 
            href="/admin/markers/add" 
            class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg transition-all duration-200 flex items-center space-x-2 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span class="font-medium">Tambah Marker</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container mx-auto px-4 py-8">
    <!-- Toast Notification -->
    {#if showNotification}
      <div 
        class="fixed top-20 right-4 z-50 max-w-sm transition-all duration-300 ease-in-out transform translate-y-0 opacity-100 animate-notification-in"
        role="alert"
      >
        <div 
          class={`rounded-xl p-4 shadow-2xl flex items-center space-x-3 backdrop-blur-sm ${
            notificationType === 'success' ? 'bg-emerald-50/95 dark:bg-emerald-900/95 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700' : 
            notificationType === 'error' ? 'bg-red-50/95 dark:bg-red-900/95 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700' : 
            'bg-blue-50/95 dark:bg-blue-900/95 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
          }`}
        >
          <!-- Icon based on type -->
          {#if notificationType === 'success'}
            <div class="p-1 bg-emerald-500 rounded-full">
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          {:else if notificationType === 'error'}
            <div class="p-1 bg-red-500 rounded-full">
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          {:else}
            <div class="p-1 bg-blue-500 rounded-full">
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          {/if}
          
          <div class="flex-1">
            <p class="font-medium text-sm">{notificationMessage}</p>
          </div>
          
          <button
            type="button"
            class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-current p-1.5 inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            onclick={() => showNotification = false}
            aria-label="Close"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- Search and Filter Section -->
    <div class="mb-8">
      <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <!-- Search Input -->
          <div class="flex-1 max-w-md">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Cari marker..." 
                class="w-full pl-10 pr-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm"
              />
            </div>
          </div>

          <!-- View Toggle and Stats -->
          <div class="flex items-center space-x-4">
            <!-- View Toggle -->
            <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                class={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedView === 'cards' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onclick={() => selectedView = 'cards'}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
              <button
                class={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedView === 'table' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onclick={() => selectedView = 'table'}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <!-- Stats -->
            <div class="flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span class="font-semibold">{getFilteredMarkers().length}</span>
              <span class="ml-1">marker</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Section -->
    <div class="space-y-6">
      {#if isLoading}
        <!-- Loading State -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12">
          <div class="flex flex-col items-center justify-center">
            <div class="relative">
              <div class="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
              <div class="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 class="mt-6 text-lg font-semibold text-gray-900 dark:text-white">Memuat Data Marker</h3>
            <p class="mt-2 text-gray-600 dark:text-gray-400">Sedang mengambil data dari server...</p>
          </div>
        </div>
      {:else if error}
        <!-- Error State -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
          <div class="text-center">
            <div class="p-4 bg-red-100 dark:bg-red-900/30 rounded-full inline-block mb-6">
              <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h3>
            <p class="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button 
              type="button"
              onclick={fetchMarkers}
              class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      {:else if getFilteredMarkers().length === 0}
        <!-- Empty State -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12">
          <div class="text-center">
            {#if searchQuery}
              <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-full inline-block mb-6">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tidak Ada Hasil</h3>
              <p class="text-gray-600 dark:text-gray-400 mb-6">Tidak ditemukan marker yang cocok dengan pencarian "{searchQuery}"</p>
              <button 
                type="button"
                onclick={() => searchQuery = ''}
                class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Hapus Pencarian</span>
              </button>
            {:else}
              <div class="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full inline-block mb-6">
                <svg class="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Belum Ada Marker</h3>
              <p class="text-gray-600 dark:text-gray-400 mb-6">Mulai dengan menambahkan marker pertama Anda ke peta</p>
              <a 
                href="/admin/markers/add" 
                class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Tambah Marker Pertama</span>
              </a>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Content Views -->
        {#if selectedView === 'cards'}
          <!-- Cards View -->
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {#each getFilteredMarkers() as marker (marker.id)}
              <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 overflow-hidden group transition-colors duration-300">
                <!-- Card Header -->
                <div class="relative">
                  {#if marker.imageUrl}
                    <img src={marker.imageUrl} alt={marker.title} class="w-full h-48 object-cover" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  {:else}
                    <div class="w-full h-48 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <svg class="w-16 h-16 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  {/if}
                  
                  <!-- Actions -->
                  <div class="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={`/admin/markers/edit/${marker.id}`}
                      class="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-blue-600 dark:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Edit marker"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </a>
                    <button 
                      type="button"
                      onclick={() => openDeleteModal(marker)}
                      class="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Hapus marker"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Card Content -->
                <div class="p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{marker.title}</h3>
                  
                  {#if marker.description}
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{marker.description}</p>
                  {/if}

                  <!-- Location Info -->
                  <div class="flex items-center space-x-3 mb-4">
                    <div class="flex items-center text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                    </div>
                    {#if marker.city}
                      <div class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full truncate max-w-[160px] inline-block" title={marker.city}>
                        📍 {marker.city}
                      </div>
                    {/if}
                  </div>

                  <!-- Categories -->
                  {#if marker.allCategories && marker.allCategories.length > 0}
                    <div class="flex flex-wrap gap-2 mb-4">
                      {#each marker.allCategories.slice(0, 2) as category}
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          🏷️ {category.name}
                        </span>
                      {/each}
                      {#if marker.allCategories.length > 2}
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          +{marker.allCategories.length - 2} lagi
                        </span>
                      {/if}
                    </div>
                  {/if}

                  <!-- Footer -->
                  <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center space-x-2">
                      <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-xs font-medium">
                          {marker.createdBy ? marker.createdBy.username.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {marker.createdBy ? marker.createdBy.username : 'Unknown'}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateShort(marker.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Table View -->
          <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
            <div class="p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Daftar Marker</h2>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Tampilan tabel detail marker</p>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50/50 dark:bg-gray-800/50">
                  <tr>
                    <th 
                      scope="col" 
                      class="px-4 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors" 
                      onclick={() => sortMarkers('title')}
                    >
                      <div class="flex items-center">
                        <span>Marker</span>
                        {#if sortField === 'title'}
                          <svg class="w-4 h-4 ml-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        {/if}
                      </div>
                    </th>
                    <th scope="col" class="px-4 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Lokasi
                    </th>
                    <th 
                      scope="col" 
                      class="px-4 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors" 
                      onclick={() => sortMarkers('createdAt')}
                    >
                      <div class="flex items-center">
                        <span>Dibuat</span>
                        {#if sortField === 'createdAt'}
                          <svg class="w-4 h-4 ml-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        {/if}
                      </div>
                    </th>
                    <th scope="col" class="px-4 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white/30 dark:bg-gray-800/30 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {#each getFilteredMarkers() as marker (marker.id)}
                    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                      <td class="px-4 py-6">
                        <div class="flex items-start space-x-4">
                          <div class="flex-shrink-0">
                            {#if marker.imageUrl}
                              <img src={marker.imageUrl} alt={marker.title} class="w-12 h-12 rounded-lg object-cover" />
                            {:else}
                              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                            {/if}
                          </div>
                          <div class="flex-1 min-w-0">
                            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{marker.title}</h3>
                            {#if marker.description}
                              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{marker.description}</p>
                            {/if}
                            {#if marker.allCategories && marker.allCategories.length > 0}
                              <div class="flex flex-wrap gap-1 mt-2">
                                {#each marker.allCategories.slice(0, 2) as category}
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                    {category.name}
                                  </span>
                                {/each}
                                {#if marker.allCategories.length > 2}
                                  <span class="text-xs text-gray-500 dark:text-gray-400">+{marker.allCategories.length - 2}</span>
                                {/if}
                              </div>
                            {/if}
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-6">
                        <div class="space-y-1">
                          <div class="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
                          </div>
                          {#if marker.city}
                            <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full truncate max-w-[160px] inline-block" title={marker.city}>
                                📍 {marker.city}
                              </span>
                            </div>
                          {/if}
                        </div>
                      </td>
                      <td class="px-4 py-6">
                        <div class="flex items-center space-x-3">
                          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span class="text-white text-xs font-medium">
                              {marker.createdBy ? marker.createdBy.username.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                              {marker.createdBy ? marker.createdBy.username : 'Unknown'}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateShort(marker.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-6">
                        <div class="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={`/admin/markers/edit/${marker.id}`}
                            class="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                            title="Edit marker"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </a>
                          <button 
                            type="button"
                            onclick={() => openDeleteModal(marker)}
                            class="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
                            title="Hapus marker"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<!-- Modal Konfirmasi Hapus -->
{#if showConfirmModal && markerToDelete}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
    <div class="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-modal-appear border border-white/20 dark:border-gray-700/30">
      <!-- Modal Header -->
      <div class="p-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 dark:from-red-400/10 dark:to-pink-400/10 border-b border-gray-200/50 dark:border-gray-700/50 rounded-t-2xl">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Konfirmasi Hapus</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300 mb-4">
          Apakah Anda yakin ingin menghapus marker berikut?
        </p>
        
        <!-- Marker Preview -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
          <div class="flex items-start space-x-3">
            {#if markerToDelete.imageUrl}
              <img src={markerToDelete.imageUrl} alt={markerToDelete.title} class="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            {:else}
              <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            {/if}
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-1 truncate max-w-full" title={markerToDelete.title}>{markerToDelete.title}</h4>
              {#if markerToDelete.description}
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {markerToDelete.description.length > 100 ? markerToDelete.description.substring(0, 100) + '...' : markerToDelete.description}
                </p>
              {/if}
              <div class="flex items-center space-x-2 mt-2">
                <span class="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  {markerToDelete.latitude.toFixed(4)}, {markerToDelete.longitude.toFixed(4)}
                </span>
                {#if markerToDelete.city}
                  <div class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full truncate max-w-[160px] inline-block" title={markerToDelete.city}>
                    📍 {markerToDelete.city}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Warning -->
        {#if markerToDelete.imageUrl && markerToDelete.imageUrl.startsWith('/uploads/')}
          <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
            <div class="flex items-start space-x-3">
              <div class="p-1 bg-amber-500 rounded-full flex-shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h5 class="font-medium text-amber-800 dark:text-amber-200 mb-1">Peringatan</h5>
                <p class="text-sm text-amber-700 dark:text-amber-300">
                  Marker ini memiliki gambar yang juga akan dihapus dari server.
                </p>
              </div>
            </div>
          </div>
        {/if}

        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Data marker, termasuk semua informasi terkait, akan dihapus secara permanen.
        </p>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
          <button 
            type="button" 
            onclick={closeDeleteModal}
            disabled={isDeleting}
            class="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button 
            type="button" 
            onclick={deleteMarker}
            disabled={isDeleting}
            class="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-70 flex items-center justify-center"
          >
            {#if isDeleting}
              <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Menghapus...
            {:else}
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus Marker
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Modern CSS animations and effects */
  @keyframes modal-appear {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes notification-in {
    0% {
      opacity: 0;
      transform: translateY(-20px) translateX(100px);
    }
    100% {
      opacity: 1;
      transform: translateY(0) translateX(0);
    }
  }

  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    0% {
      opacity: 0;
      transform: translateX(-20px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Animation classes */
  .animate-modal-appear {
    animation: modal-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out forwards;
  }
  
  .animate-notification-in {
    animation: notification-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.5s ease-out;
  }

  /* Card hover effects */
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Text utilities */
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Glassmorphism effect */
  .glass-card {
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    background-color: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.125);
  }

  .glass-card-dark {
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    background-color: rgba(31, 41, 55, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.125);
  }

  /* Button hover effects */
  .button-shimmer {
    position: relative;
    overflow: hidden;
  }

  .button-shimmer::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .button-shimmer:hover::before {
    left: 100%;
  }

  /* Loading animations */
  .loading-skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* Responsive improvements */
  @media (max-width: 640px) {
    .animate-fade-in-up {
      animation-delay: 0s !important;
    }
  }

  /* Dark mode transitions */
  * {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  /* Focus states */
  button:focus,
  a:focus {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 2px;
  }

  /* Selection styling */
  ::selection {
    background-color: rgba(59, 130, 246, 0.2);
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* Dark mode scrollbar */
  @media (prefers-color-scheme: dark) {
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
</style> 