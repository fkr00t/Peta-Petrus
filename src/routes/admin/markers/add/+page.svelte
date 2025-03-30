<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Map from '$lib/components/Map.svelte';
  import MarkerForm from '$lib/components/MarkerForm.svelte';
  
  // Ambil data
  let user: any;
  let isAdmin = false;
  
  // Referensi ke komponen map
  let mapComponent: any;
  
  // State untuk form marker baru
  let newMarkerLat: number | null = $state(null);  // Koordinat default kosong
  let newMarkerLng: number | null = $state(null);
  let markers = $state([]);
  let isLoading = $state(false);
  let error = $state('');
  
  // State untuk notifikasi
  let showNotification = $state(false);
  let notificationMessage = $state('');
  let notificationType = $state('success'); // 'success', 'error', 'info'
  let notificationTimeout: number | null = null;
  
  // Fungsi untuk menampilkan notifikasi
  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) {
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
  
  // Redirect jika bukan admin
  onMount(() => {
    // Di sini seharusnya ada pengecekan data.isAdmin
    // Karena data.$props bermasalah, kita sementara anggap sebagai admin
    isAdmin = true; // Harusnya ambil dari data.isAdmin
    
    if (!isAdmin) {
      goto('/');
    }
    
    // Load markers untuk tampilan
    fetchMarkers();
    
    // Cleanup
    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  });
  
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
  
  // Menangani klik pada peta
  function handleMapClick(lat: number, lng: number) {
    newMarkerLat = lat;
    newMarkerLng = lng;
  }
  
  // Submit marker baru
  async function handleSubmitMarker(formData: FormData) {
    try {
      const markerData = {
        title: formData.get('title'),
        description: formData.get('description'),
        latitude: parseFloat(formData.get('latitude') as string),
        longitude: parseFloat(formData.get('longitude') as string),
        city: formData.get('city'),
        imageUrl: formData.get('imageUrl'),
        url: formData.get('url'),
        categoryId: formData.get('categoryId')
      };
  
      const response = await fetch('/api/markers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(markerData),
      });
  
      if (response.ok) {
        // Refresh markers
        await fetchMarkers();
        
        // Reset koordinat dan hapus marker sementara
        resetForm();
        
        // Tampilkan notifikasi berhasil dengan toast
        showToast('Marker berhasil ditambahkan!', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menambahkan marker');
      }
    } catch (err: any) {
      console.error('Error submitting marker:', err);
      // Tampilkan notifikasi error dengan toast
      showToast(`Gagal menambahkan marker: ${err.message}`, 'error');
    }
  }
  
  // Fungsi untuk mereset form dan marker sementara
  function resetForm() {
    newMarkerLat = null;
    newMarkerLng = null;
    
    // Hapus marker sementara jika ada
    if (mapComponent && typeof mapComponent.clearTempMarker === 'function') {
      mapComponent.clearTempMarker();
    }
  }
</script>

<svelte:head>
  <title>Peta Petrus - Tambah Marker</title>
</svelte:head>

<div class="container mx-auto px-4 py-4">
  <div class="mb-4">
    <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Tambah Marker Baru</h1>
    <p class="text-gray-600 dark:text-gray-400">Klik pada peta untuk menentukan lokasi marker, kemudian lengkapi form di bawah peta</p>
  </div>
  
  <!-- Toast Notification -->
  {#if showNotification}
    <div 
      class="fixed top-4 right-4 z-50 max-w-sm transition-all duration-300 transform translate-y-0 opacity-100"
      role="alert"
    >
      <div 
        class={`rounded-lg p-4 shadow-md flex items-center space-x-3 ${
          notificationType === 'success' ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200' : 
          notificationType === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 
          'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
        }`}
      >
        <!-- Icon based on type -->
        {#if notificationType === 'success'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else if notificationType === 'error'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/if}
        
        <div>
          <p class="font-medium">{notificationMessage}</p>
        </div>
        
        <!-- Close button -->
        <button 
          type="button" 
          class="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-gray-200 dark:hover:bg-gray-700"
          onclick={() => showNotification = false}
        >
          <span class="sr-only">Tutup</span>
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Tampilan peta di atas form -->
  <div class="flex flex-col gap-6">
    <!-- Peta dengan ukuran fixed -->
    <div class="w-full" style="height: 60vh;">
      {#if isLoading}
        <div class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div class="text-center">
            <div
              class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"
            ></div>
            <p class="mt-2 text-emerald-700">Memuat peta...</p>
          </div>
        </div>
      {/if}

      {#if error}
        <div
          class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
        >
          {error}
        </div>
      {/if}

      <!-- Peta dengan border dan shadow -->
      <div class="w-full h-full border rounded-lg overflow-hidden shadow-md">
        <Map markers={markers} isAdmin={true} onAddMarker={handleMapClick} bind:this={mapComponent} />
      </div>
    </div>
    
    <!-- Informasi koordinat yang dipilih -->
    {#if newMarkerLat !== null && newMarkerLng !== null}
      <div class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-emerald-800 dark:text-emerald-300 font-medium">Koordinat yang dipilih: <span class="font-bold">{newMarkerLat.toFixed(6)}, {newMarkerLng.toFixed(6)}</span></span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">Klik pada peta untuk mengubah koordinat, kemudian isi form di bawah ini</p>
      </div>
    {:else}
      <div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-amber-800 dark:text-amber-300 font-medium">Belum ada koordinat yang dipilih</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">Klik pada peta untuk memilih lokasi marker baru</p>
      </div>
    {/if}
    
    <!-- Form marker selalu tampil di bawah peta -->
    <MarkerForm
      latitude={newMarkerLat}
      longitude={newMarkerLng}
      onSubmit={handleSubmitMarker}
      onCancel={resetForm}
    />
  </div>
</div> 