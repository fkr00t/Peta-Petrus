<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
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
    createdBy?: CreatedBy;
  }
  
  // Menggunakan data dari props seperti di kode asli
  let { data } = $props<{ isAdmin: boolean; user: any }>();
  let markers: MarkerWithUser[] = $state([]);
  let isLoading = $state(true);
  let error = $state('');
  
  // State untuk modal konfirmasi hapus
  let showConfirmModal = $state(false);
  let markerToDelete: MarkerWithUser | null = $state(null);
  
  // State untuk pencarian dan pengurutan
  let searchQuery = $state('');
  let sortField = $state('createdAt');
  let sortDirection = $state('desc');
  
  // Fungsi untuk mendapatkan marker yang difilter
  function getFilteredMarkers(): MarkerWithUser[] {
    if (!searchQuery.trim()) return markers;
    
    const query = searchQuery.toLowerCase();
    return markers.filter(marker => 
      marker.title.toLowerCase().includes(query) || 
      (marker.description && marker.description.toLowerCase().includes(query)) ||
      marker.createdBy?.username.toLowerCase().includes(query)
    );
  }
  
  // Redirect jika bukan admin
  onMount(() => {
    // Menggunakan data.isAdmin dari props sesuai kode asli
    if (!data.isAdmin) {
      goto('/');
    } else {
      fetchMarkers();
    }
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
  
  // Hapus marker
  async function deleteMarker() {
    if (!markerToDelete) return;
    
    const idToDelete = markerToDelete.id;
    
    try {
      const response = await fetch(`/api/markers/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        // Beberapa browser tidak mendukung body untuk request DELETE,
        // tetapi kita tetap menggunakan header sebagai cara utama mengirimkan token CSRF
      });
      
      if (response.ok) {
        // Refresh data
        await fetchMarkers();
        showConfirmModal = false;
        markerToDelete = null;
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
      alert('Gagal menghapus marker: ' + err.message);
      closeDeleteModal();
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

<div class="container mx-auto px-4 py-6 max-w-7xl">
  <!-- Header -->
  <div class="mb-6 flex flex-wrap justify-between items-center gap-4">
    <div>
      <h1 class="text-2xl font-bold text-emerald-800 dark:text-emerald-400">Kelola Marker</h1>
      <p class="text-gray-600 dark:text-gray-400">Lihat, edit, atau hapus marker pada peta</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href="/admin/markers/add" class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Marker
      </a>
      <a href="/admin/dashboard" class="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm border border-gray-300 dark:border-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Dashboard
      </a>
    </div>
  </div>
  
  <!-- Search dan filter -->
  <div class="mb-5 flex justify-between items-center flex-wrap gap-4">
    <div class="relative w-full md:w-auto flex-grow md:max-w-md">
      <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Cari marker berdasarkan judul, deskripsi, atau pembuat..." 
        class="pl-10 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>
    <div class="text-sm text-gray-600 dark:text-gray-400">
      Total marker: <span class="font-medium">{getFilteredMarkers().length}</span>
    </div>
  </div>
  
  <!-- Main Content Card -->
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
    <div class="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
      <h2 class="text-xl font-semibold">Daftar Marker</h2>
    </div>
    
    {#if isLoading}
      <div class="flex justify-center items-center p-12">
        <div class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
        <span class="ml-3 text-gray-700 dark:text-gray-300">Memuat data marker...</span>
      </div>
    {:else if error}
      <div class="p-5 mx-5 my-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r">
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-medium">Gagal memuat data marker</p>
            <p class="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    {:else if getFilteredMarkers().length === 0}
      <div class="p-10 text-center">
        {#if searchQuery}
          <div class="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 class="text-gray-700 dark:text-gray-300 text-lg font-medium">Tidak ada hasil yang ditemukan</h3>
          <p class="text-gray-500 dark:text-gray-400 mt-1">Tidak ada marker yang cocok dengan pencarian "{searchQuery}"</p>
          <button 
            class="mt-4 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium"
            onclick={() => searchQuery = ''}
          >
            Hapus pencarian
          </button>
        {:else}
          <div class="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-gray-700 dark:text-gray-300 text-lg font-medium">Belum ada marker</h3>
          <p class="text-gray-500 dark:text-gray-400 mt-1">Anda belum menambahkan marker apa pun ke peta.</p>
          <a 
            href="/admin/markers/add" 
            class="mt-4 inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Marker Pertama
          </a>
        {/if}
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onclick={() => sortMarkers('title')}>
                <div class="flex items-center">
                  <span>Judul</span>
                  {#if sortField === 'title'}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                  {/if}
                </div>
              </th>
              <th scope="col" class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onclick={() => sortMarkers('createdAt')}>
                <div class="flex items-center">
                  <span>Waktu Dibuat</span>
                  {#if sortField === 'createdAt'}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                  {/if}
                </div>
              </th>
              <th scope="col" class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onclick={() => sortMarkers('createdBy')}>
                <div class="flex items-center">
                  <span>Pembuat</span>
                  {#if sortField === 'createdBy'}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                  {/if}
                </div>
              </th>
              <th scope="col" class="px-6 py-3.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {#each getFilteredMarkers() as marker (marker.id)}
              <tr class="group hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">{marker.title}</div>
                    {#if marker.description}
                      <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{marker.description.length > 100 ? marker.description.substring(0, 100) + '...' : marker.description}</div>
                    {/if}
                    <div class="mt-2 flex items-center space-x-2">
                      <div class="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium py-0.5 px-2 rounded-full">
                        Lat: {marker.latitude.toFixed(6)}
                      </div>
                      <div class="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-medium py-0.5 px-2 rounded-full">
                        Lng: {marker.longitude.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500 dark:text-gray-400">{formatDate(marker.createdAt)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mr-2">
                      <span class="font-medium text-sm">{marker.createdBy ? marker.createdBy.username.charAt(0).toUpperCase() : '?'}</span>
                    </div>
                    <div class="text-sm text-gray-900 dark:text-gray-100">{marker.createdBy ? marker.createdBy.username : '-'}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="flex items-center justify-center space-x-3">
                    <a 
                      href={`/admin/markers/edit/${marker.id}`} 
                      class="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                      title="Edit marker"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </a>
                    <button 
                      class="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
                      title="Hapus marker"
                      onclick={() => openDeleteModal(marker)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    {/if}
  </div>
</div>

<!-- Modal Konfirmasi Hapus -->
{#if showConfirmModal && markerToDelete}
  <div class="fixed inset-0 bg-gray-900/70 dark:bg-gray-900/80 flex items-center justify-center z-50 p-4">
    <div 
      class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden transform transition-all opacity-100 scale-100"
      style="animation: modal-appear 0.3s ease-out;"
    >
      <div class="bg-red-600 dark:bg-red-700 px-6 py-4 text-white">
        <h3 class="text-lg font-medium">Konfirmasi Hapus</h3>
      </div>
      <div class="p-6">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0 bg-red-100 dark:bg-red-900/40 rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus marker <span class="font-bold">{markerToDelete.title}</span>?
            </p>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Tindakan ini tidak dapat dibatalkan dan akan menghapus marker ini dari peta.
            </p>
            {#if markerToDelete.description}
              <div class="mt-3 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-600 dark:text-gray-400">
                {markerToDelete.description}
              </div>
            {/if}
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-3">
          <button 
            class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            onclick={closeDeleteModal}
          >
            Batal
          </button>
          <button 
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
            onclick={deleteMarker}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Hapus
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Modal Animation */
  @keyframes modal-appear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  /* Responsive behavior */
  @media (max-width: 640px) {
    table th:nth-child(2), 
    table td:nth-child(2) {
      display: none;
    }
  }
  
  /* Hover effects */
  button, a {
    transition: all 0.2s ease;
  }
  
  /* Selection style */
  ::selection {
    background-color: rgba(5, 150, 105, 0.2);
  }
</style> 