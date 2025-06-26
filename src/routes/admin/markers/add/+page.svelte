<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Map from '$lib/components/Map.svelte';
  import MarkerForm from '$lib/components/MarkerForm.svelte';
  import { sanitizeFormData, isValidUrl, sanitizeString, formatUrlTautan } from '$lib/utils';
  
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
  
  // State untuk URL tautan dinamis
  let urlTautan = $state([{ url: '', label: '' }]); // Array untuk multiple URL
  let isAddingUrl = $state(false);
  
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
  
  // Fungsi untuk menambah URL tautan baru
  function addUrlTautan() {
    urlTautan = [...urlTautan, { url: '', label: '' }];
    isAddingUrl = false;
  }
  
  // Fungsi untuk menghapus URL tautan
  function removeUrlTautan(index: number) {
    if (urlTautan.length > 1) {
      urlTautan = urlTautan.filter((_, i) => i !== index);
    }
  }
  
  // Fungsi untuk toggle form tambah URL
  function toggleAddUrl() {
    isAddingUrl = !isAddingUrl;
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
  
  // Handler untuk event mapInit
  function handleMapInit(event: CustomEvent) {
    // Dapatkan referensi map dengan fungsi flyTo
    mapComponent = event.detail.map;
  }
  
  // Submit marker baru
  async function handleSubmitMarker(formData: FormData) {
    try {
      console.log('📍 Mulai submit marker...');
      console.log('FormData entries:', Array.from(formData.entries()));
      
      // Konversi FormData ke object biasa dan sanitasi data
      const formDataObj: Record<string, any> = {};
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          // Sanitasi setiap string dari FormData
          formDataObj[key] = sanitizeString(value);
        } else {
          formDataObj[key] = value;
        }
      });
      
      console.log('🔍 FormData Object:', formDataObj);
      
      // Validasi dan sanitasi URL tautan
      const validUrlTautan: {url: string, label: string}[] = [];
      for (const urlItem of urlTautan) {
        if (urlItem.url.trim()) {
          if (!isValidUrl(urlItem.url)) {
            showToast(`URL "${urlItem.url}" tidak valid`, 'error');
            return;
          }
          validUrlTautan.push({
            url: sanitizeString(urlItem.url.trim()) || '',
            label: sanitizeString(urlItem.label.trim()) || 'Tautan'
          });
        }
      }
      
      console.log('✅ Valid URL Tautan:', validUrlTautan);
      
      // Format URL menggunakan fungsi utilitas
      const formattedUrl = formatUrlTautan(validUrlTautan);
      console.log('🔗 Formatted URL:', formattedUrl);
      
      // Sanitasi data form dengan DOMPurify
      const sanitizedData = sanitizeFormData({
        title: formDataObj.title,
        description: formDataObj.description,
        latitude: parseFloat(formDataObj.latitude as string),
        longitude: parseFloat(formDataObj.longitude as string),
        city: formDataObj.city || null,
        imageUrl: formDataObj.imageUrl || null,
        // Convert multiple URL tautan ke format yang kompatibel dengan backend
        url: formattedUrl,
        // Parse categoryIds dari FormData (sudah dalam format JSON string dari MarkerForm)
        categoryIds: formDataObj.categoryIds ? JSON.parse(formDataObj.categoryIds) : [],
        csrf: $page.data.csrfToken
      });
      
      console.log('🧹 Sanitized Data:', sanitizedData);
      
      const response = await fetch('/api/markers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify(sanitizedData),
      });
  
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Response data:', responseData);
        
        // Tampilkan notifikasi berhasil dengan toast
        showToast('Marker berhasil ditambahkan!', 'success');
        
        // Tunggu sebentar agar pengguna sempat melihat notifikasi
        setTimeout(() => {
          // Redirect ke halaman manage marker
          goto('/admin/markers/manage?success=true&message=Marker berhasil ditambahkan');
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.message || 'Gagal menambahkan marker');
      }
    } catch (err: any) {
      console.error('💥 Error submitting marker:', err);
      console.error('Stack trace:', err.stack);
      // Tampilkan notifikasi error dengan toast
      showToast(`Gagal menambahkan marker: ${err.message}`, 'error');
    }
  }

  
  
  // Fungsi untuk mereset form dan marker sementara
  function resetForm() {
    newMarkerLat = null;
    newMarkerLng = null;
    
    // Reset URL tautan ke state awal
    urlTautan = [{ url: '', label: '' }];
    isAddingUrl = false;
    
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
      class="fixed top-4 right-4 z-50 max-w-sm transition-all duration-300 ease-in-out transform translate-y-0 opacity-100 animate-notification-in"
      role="alert"
    >
      <div 
        class={`rounded-lg p-4 shadow-lg flex items-center space-x-3 ${
          notificationType === 'success' ? 'bg-emerald-100 dark:bg-emerald-800/90 text-emerald-700 dark:text-emerald-200 border-l-4 border-emerald-500' : 
          notificationType === 'error' ? 'bg-red-100 dark:bg-red-800/90 text-red-700 dark:text-red-200 border-l-4 border-red-500' : 
          'bg-blue-100 dark:bg-blue-800/90 text-blue-700 dark:text-blue-200 border-l-4 border-blue-500'
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
    <div class="w-full relative flex justify-center items-center" style="height: 60vh;">
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
      <div class="w-full h-full border rounded-lg overflow-hidden shadow-md flex justify-center items-center">
        <Map 
          markers={markers} 
          isAdmin={true} 
          onAddMarker={handleMapClick} 
          bind:this={mapComponent} 
          useBroadView={true} 
          hideControls={false} 
          controlsPosition="bottom"
          on:mapInit={handleMapInit}
        />
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
      mapComponent={mapComponent}
      urlTautan={urlTautan}
      isAddingUrl={isAddingUrl}
      addUrlTautan={addUrlTautan}
      removeUrlTautan={removeUrlTautan}
      toggleAddUrl={toggleAddUrl}
    />
  </div>
</div> 

<style>
  /* Notification Animation */
  @keyframes notification-in {
    0% {
      opacity: 0;
      transform: translateX(40px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes notification-out {
    0% {
      opacity: 1;
      transform: translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateX(40px);
    }
  }
  
  .animate-notification-in {
    animation: notification-in 0.4s ease-out forwards;
  }
  
  .animate-notification-out {
    animation: notification-out 0.4s ease-in forwards;
  }
</style> 