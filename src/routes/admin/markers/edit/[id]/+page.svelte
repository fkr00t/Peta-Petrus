<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Map from '$lib/components/Map.svelte';
  import { formatDate, sanitizeFormData, sanitizeString, isValidUrl } from '$lib/utils';
  
  interface Marker {
    id: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    city: string | null;
    categoryId: string | null;
    imageUrl: string | null;
    url: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string;
    createdBy?: {
      id: string;
      username: string;
    };
  }
  
  interface Category {
    id: string;
    name: string;
    markerCount?: number;
  }

  interface SearchResult {
    lat: string;
    lon: string;
    display_name: string;
    boundingbox: string[];
  }
  
  // State untuk marker
  let currentMarker: Marker | null = $state(null);
  
  // Form state - akan diisi setelah data didapatkan
  let title = $state('');
  let description = $state('');
  let latitude = $state(0);
  let longitude = $state(0);
  let city = $state('');
  let imageFile: File | null = $state(null);
  let imagePreview = $state(''); // Preview URL untuk gambar yang diupload
  let isUploadingImage = $state(false); // Status upload gambar
  let imageUploadError = $state(''); // Error saat upload gambar
  let url = $state('');
  let categoryId = $state('');
  let categories: Category[] = $state([]);
  let markerId = $state('');
  let createdAt = $state('');
  let updatedAt = $state('');
  let createdBy = $state('');
  
  // State untuk redirect
  let isRedirecting = $state(false);
  
  // State untuk form tambah kategori
  let isCreatingCategory = $state(false);
  let newCategory = $state('');
  let isSavingCategory = $state(false);
  
  // Update state
  let isUpdating = $state(false);
  let isLoading = $state(true);
  let error = $state('');
  let success = $state('');
  
  // Marker untuk peta
  let markers = $state<any[]>([]);

  // State untuk pencarian lokasi
  let searchQuery = $state('');
  let isSearching = $state(false);
  let searchError = $state('');
  let mapComponent: any; // Referensi ke komponen peta
  
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
  
  onMount(() => {
    const markerId = $page.params.id;
    fetchMarkerData(markerId);
    fetchCategories();
    
    // Cleanup
    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  });
  
  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories?includeCount=true');
      if (response.ok) {
        categories = await response.json();
      } else {
        console.error('Gagal mengambil data kategori');
      }
    } catch (err: unknown) {
      console.error('Error fetching categories:', err);
    }
  }
  
  // Fungsi untuk mengambil data marker dari server
  async function fetchMarkerData(id: string) {
    isLoading = true;
    
    try {
      const response = await fetch(`/api/markers/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengambil data marker');
      }
      
      const markerData: Marker = await response.json();
      currentMarker = markerData;
      
      // Set state values from marker data
      title = markerData.title;
      description = markerData.description || '';
      latitude = markerData.latitude;
      longitude = markerData.longitude;
      city = markerData.city || '';
      url = markerData.url || '';
      categoryId = markerData.categoryId || '';
      
      // Set preview jika ada URL gambar
      if (markerData.imageUrl) {
        imagePreview = markerData.imageUrl;
      }
      
      // Set reference data
      createdBy = markerData.createdBy?.username || 'Unknown';
      createdAt = markerData.createdAt;
      updatedAt = markerData.updatedAt;
      
      // Prepare map markers
      markers = [
        {
          id: markerData.id,
          title: markerData.title,
          latitude: markerData.latitude,
          longitude: markerData.longitude,
          description: markerData.description
        }
      ];
    } catch (err: any) {
      console.error('Error fetching marker data:', err);
      error = err.message || 'Terjadi kesalahan saat mengambil data marker';
    } finally {
      isLoading = false;
    }
  }
  
  // Fungsi untuk membuat kategori baru
  async function createCategory() {
    if (!newCategory.trim()) {
      error = 'Nama kategori tidak boleh kosong';
      return;
    }

    isSavingCategory = true;
    
    try {
      const sanitizedCategory = sanitizeString(newCategory.trim());
      
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({ 
          name: sanitizedCategory,
          csrf: $page.data.csrfToken 
        }),
      });

      if (response.ok) {
        const createdCategory = await response.json();
        createdCategory.markerCount = 0;
        categories = [...categories, createdCategory];
        categoryId = createdCategory.id;
        newCategory = '';
        isCreatingCategory = false;
        error = '';
        success = 'Kategori berhasil dibuat';
        setTimeout(() => success = '', 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal membuat kategori');
      }
    } catch (err: unknown) {
      console.error('Error creating category:', err);
      error = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat kategori';
    } finally {
      isSavingCategory = false;
    }
  }
  
  // Toggle form tambah kategori
  function toggleCategoryForm() {
    isCreatingCategory = !isCreatingCategory;
    if (!isCreatingCategory) {
      newCategory = '';
    }
  }
  
  // Menangani klik pada peta - update koordinat
  function handleMapClick(lat: number, lng: number) {
    latitude = lat;
    longitude = lng;
  }
  
  // Handler untuk pemilihan file gambar
  const handleImageChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
      return;
    }
    
    // Reset error upload
    imageUploadError = '';
    
    // Dapatkan file yang dipilih
    const file = target.files[0];
    
    processSelectedFile(file, target);
  };

  // Fungsi untuk memproses file yang dipilih atau di-drop
  const processSelectedFile = (file: File, fileInput: HTMLInputElement | null = null) => {
    // Cek tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      imageUploadError = 'Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan';
      if (fileInput) fileInput.value = '';
      return false;
    }
    
    // Cek ukuran file (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      imageUploadError = 'Ukuran file terlalu besar (maksimum 2MB)';
      if (fileInput) fileInput.value = '';
      return false;
    }
    
    // Set file untuk upload nanti
    imageFile = file;
    
    // Buat preview URL
    imagePreview = URL.createObjectURL(file);
    
    return true;
  };

  // Handler untuk drag events
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.add('drag-over');
    }
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.add('drag-over');
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.remove('drag-over');
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.remove('drag-over');
    }
    
    // Reset error upload
    imageUploadError = '';
    
    if (!event.dataTransfer) return;
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      
      // Reset file input value agar onChange tetap bisa dipicu jika perlu
      const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Proses file yang di-drop
      processSelectedFile(droppedFile);
    }
  };

  // Upload gambar ke server
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    
    isUploadingImage = true;
    imageUploadError = '';
    
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengupload gambar');
      }
      
      const result = await response.json();
      return result.fileUrl; // URL gambar yang disimpan di server
    } catch (err: unknown) {
      console.error('Error uploading image:', err);
      imageUploadError = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupload gambar';
      return null;
    } finally {
      isUploadingImage = false;
    }
  };
  
  // Clear image preview dan reset file input
  const clearImageSelection = async () => {
    // Simpan URL gambar saat ini untuk dihapus dari server jika ada
    const currentImageUrl = imagePreview;
    
    // Reset state lokal terlebih dahulu
    imageFile = null;
    imagePreview = '';
    imageUploadError = '';
    
    // Reset file input
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    // Tidak perlu menghapus file fisik di server, file akan dihapus saat pengguna mengklik "Simpan Perubahan"
    // Jika pengguna membatalkan edit, file lama masih tetap ada
  };
  
  // Submit update marker
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!title) {
      error = 'Judul marker tidak boleh kosong';
      return;
    }
    
    if (!categoryId) {
      error = 'Kategori harus dipilih';
      return;
    }
    
    // Validasi URL tautan
    if (url && !isValidUrl(url)) {
      error = 'Format URL tautan tidak valid';
      return;
    }
    
    // Validasi panjang deskripsi
    if (description && description.length > 65000) {
      error = 'Deskripsi terlalu panjang, maksimal 65000 karakter';
      return;
    }
    
    isUpdating = true;
    error = '';
    success = '';
    
    try {
      const id = $page.params.id;
      
      // Upload gambar jika ada
      let uploadedImageUrl = null;
      let oldImageUrl = null;
      
      // Simpan URL gambar lama jika berbeda dari gambar baru
      if (currentMarker?.imageUrl && currentMarker.imageUrl !== imagePreview) {
        oldImageUrl = currentMarker.imageUrl;
      }
      
      // Upload file gambar jika ada
      if (imageFile) {
        const uploadResult = await uploadImage();
        if (uploadResult) {
          uploadedImageUrl = uploadResult;
        } else if (imageUploadError) {
          error = imageUploadError;
          isUpdating = false;
          return;
        }
      } else if (imagePreview && imagePreview.startsWith('/uploads/')) {
        // Gunakan gambar yang sudah ada di server jika masih ada preview
        uploadedImageUrl = imagePreview;
      }
      
      // Sanitasi input menggunakan fungsi utilitas
      const markerData = sanitizeFormData({
        title,
        description: description || null,
        latitude,
        longitude,
        city: city || null,
        categoryId, // Tidak perlu sanitasi khusus, karena ID dari database
        imageUrl: uploadedImageUrl || null,
        url: url || null,
        csrf: $page.data.csrfToken
      });
      
      const response = await fetch(`/api/markers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify(markerData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memperbarui marker');
      }
      
      // Update current marker data with response
      const updatedMarker = await response.json();
      currentMarker = updatedMarker;
      updatedAt = updatedMarker.updatedAt;
      
      // Reset image file setelah berhasil update
      imageFile = null;
      
      // Hapus file gambar lama jika ada perubahan gambar
      if (oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
        try {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': $page.data.csrfToken || ''
            },
            body: JSON.stringify({
              imageUrl: oldImageUrl,
              csrf: $page.data.csrfToken
            })
          });
        } catch (err) {
          console.error('Error saat menghapus file lama:', err);
          // Tidak menampilkan error ke pengguna karena proses utama sudah berhasil
        }
      }
      
      // Tampilkan notifikasi sukses dengan toast dan set juga success state untuk UI
      showToast(`Marker "${title}" berhasil diperbarui!`, 'success');
      success = 'Marker berhasil diperbarui. Anda akan dialihkan ke halaman daftar marker...';
      isRedirecting = true;
      
      // Redirect ke halaman daftar marker setelah berhasil update dengan parameter notifikasi
      setTimeout(() => {
        goto(`/admin/markers/manage?success=true&message=Marker "${title}" berhasil diperbarui`);
      }, 1500); // Tunggu 1,5 detik agar pesan sukses terlihat sebentar
    } catch (err: any) {
      console.error('Error updating marker:', err);
      error = err.message || 'Terjadi kesalahan saat memperbarui marker';
      // Tampilkan notifikasi error dengan toast
      showToast(`Gagal memperbarui marker: ${err.message}`, 'error');
    } finally {
      isUpdating = false;
    }
  }
  
  // Kembali ke halaman kelola marker
  function handleCancel() {
    goto('/admin/markers/manage');
  }

  // Fungsi untuk mencari lokasi berdasarkan query
  async function searchLocation() {
    if (!searchQuery.trim()) {
      searchError = 'Masukkan nama lokasi untuk mencari';
      return;
    }

    searchError = '';
    isSearching = true;

    try {
      // Menggunakan Nominatim OpenStreetMap API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Gagal mencari lokasi');
      }

      const data: SearchResult[] = await response.json();

      if (data && data.length > 0) {
        const location = data[0];
        
        // Update latitude dan longitude dari hasil pencarian
        latitude = parseFloat(location.lat);
        longitude = parseFloat(location.lon);
        
        // Update array markers untuk tampilan peta
        markers = [
          {
            id: currentMarker?.id || 'temp',
            title: title || 'Lokasi Baru',
            latitude,
            longitude,
            description: description || ''
          }
        ];
        
        // Jika kota kosong, update dengan nama lokasi yang ditemukan
        if (!city) {
          // Ekstrak kota/kabupaten dari hasil pencarian
          const locationParts = location.display_name.split(',');
          // Biasanya bagian kedua atau ketiga adalah kota/kabupaten
          if (locationParts.length > 2) {
            city = locationParts[1].trim();
          }
        }
        
        // Jika peta telah dimuat, lakukan zoom ke lokasi
        if (mapComponent && mapComponent.flyTo) {
          mapComponent.flyTo(latitude, longitude, 13);
          success = `Berhasil menemukan lokasi: ${location.display_name}`;
          setTimeout(() => success = '', 5000);
        }
      } else {
        searchError = 'Lokasi tidak ditemukan';
      }
    } catch (err: any) {
      console.error('Error searching location:', err);
      searchError = err.message || 'Terjadi kesalahan saat mencari lokasi';
    } finally {
      isSearching = false;
    }
  }

  // Fungsi untuk mendapatkan referensi ke komponen peta
  function handleMapInit(e: CustomEvent) {
    mapComponent = e.detail.map;
  }
</script>

<svelte:head>
  <title>Peta Petrus - Edit Marker</title>
</svelte:head>

<div class="container mx-auto px-4 py-4">
  <div class="mb-4">
    <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Edit Marker</h1>
    <p class="text-gray-600 dark:text-gray-400">Ubah informasi marker pada peta</p>
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
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else if notificationType === 'error'}
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else}
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/if}
        
        <div class="flex-1">
          <p class="font-medium">{notificationMessage}</p>
        </div>
        
        <button
          type="button"
          class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-current p-1.5 inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          onclick={() => showNotification = false}
          aria-label="Close"
        >
          <span class="sr-only">Tutup</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Alerts -->
  {#if error}
    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-r" role="alert">
      <div class="flex">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{error}</span>
      </div>
    </div>
  {/if}
  
  {#if success}
    <div class="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-4 rounded-r" role="alert">
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>{success}</span>
        {#if isRedirecting}
          <div class="ml-2 inline-block">
            <div class="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        {/if}
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
            <p class="mt-2 text-emerald-700">Memuat data marker...</p>
          </div>
        </div>
      {/if}
    
      {#if error && !currentMarker}
        <div
          class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
        >
          <p>{error}</p>
          <button type="button" onclick={() => goto('/admin/markers/manage')} class="mt-2 text-red-700 font-medium hover:underline">
            Kembali ke Daftar Marker
          </button>
        </div>
      {/if}
    
      <!-- Peta dengan border dan shadow -->
      <div class="w-full h-full border rounded-lg overflow-hidden shadow-md flex justify-center items-center">
        <Map 
          markers={markers} 
          isAdmin={true} 
          onAddMarker={handleMapClick} 
          on:mapInit={handleMapInit}
          useBroadView={true} 
          hideControls={false} 
          hideFilterButton={true}
          controlsPosition="bottom"
        />
      </div>
    </div>

    <!-- Informasi koordinat yang dipilih -->
    {#if latitude && longitude}
      <div class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-emerald-800 dark:text-emerald-300 font-medium">Koordinat marker: <span class="font-bold">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span></span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">Klik pada peta untuk mengubah koordinat marker. Perubahan akan disimpan saat menekan tombol Simpan Perubahan.</p>
      </div>
    {:else}
      <div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg shadow-sm">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-amber-800 dark:text-amber-300 font-medium">Belum ada koordinat yang dipilih</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">Klik pada peta untuk memilih lokasi marker</p>
      </div>
    {/if}

    <!-- Form Edit Marker -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Informasi Marker
        </h2>
      </div>
      <div class="p-5">
        <form onsubmit={handleSubmit} class="space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Marker</label>
            <input
              type="text"
              id="title"
              bind:value={title}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Masukkan judul marker"
              required
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi <span class="text-gray-500 dark:text-gray-400 font-normal">(opsional)</span></label>
            <textarea
              id="description"
              bind:value={description}
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Masukkan deskripsi marker"
            ></textarea>
            <div class="text-right text-xs text-gray-500 dark:text-gray-400 mt-1 {description && description.length > 65000 ? 'text-red-500 dark:text-red-400 font-medium' : ''}">
              {description ? description.length : 0}/65000 karakter
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="latitude" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
              <input
                type="number"
                id="latitude"
                bind:value={latitude}
                step="any"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 cursor-not-allowed"
                required
                readonly
                disabled
              />
            </div>
            <div>
              <label for="longitude" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
              <input
                type="number"
                id="longitude"
                bind:value={longitude}
                step="any"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 cursor-not-allowed"
                required
                readonly
                disabled
              />
            </div>
          </div>
          
          <div>
            <label for="city" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kota/Kabupaten <span class="text-gray-500 dark:text-gray-400 font-normal">(opsional)</span></label>
            <input
              type="text"
              id="city"
              bind:value={city}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Masukkan nama kota/kabupaten"
            />
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="categoryId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Kategori <span class="text-red-500">*</span></label>
              <button 
                type="button" 
                class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center" 
                onclick={toggleCategoryForm}
              >
                {#if isCreatingCategory}
                  <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Kembali
                {:else}
                  <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Tambah Kategori Baru
                {/if}
              </button>
            </div>
            
            {#if isCreatingCategory}
              <div class="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 mb-3">
                <div class="mb-3">
                  <label for="newCategory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kategori Baru</label>
                  <input
                    type="text"
                    id="newCategory"
                    bind:value={newCategory}
                    placeholder="Masukkan nama kategori"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSavingCategory}
                  onclick={createCategory}
                  class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-sm"
                >
                  {#if isSavingCategory}
                    <span class="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {/if}
                  Simpan Kategori
                </button>
              </div>
            {:else}
              <select
                id="categoryId"
                bind:value={categoryId}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">-- Pilih Kategori --</option>
                {#each categories as category}
                  <option value={category.id}>{category.name}</option>
                {/each}
              </select>
            {/if}
          </div>
          
          <div>
            <label for="imageUpload" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gambar <span class="text-gray-500 dark:text-gray-400 font-normal">(opsional)</span></label>
            
            <div class="space-y-3">
              {#if imagePreview}
                <div class="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  <img src={imagePreview} alt="Preview" class="w-full h-40 object-cover" />
                  <button 
                    type="button" 
                    onclick={clearImageSelection}
                    class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Hapus gambar"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              {:else}
                <div class="flex items-center justify-center w-full">
                  <label 
                    for="imageUpload" 
                    class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                    ondragover={handleDragOver}
                    ondragenter={handleDragEnter}
                    ondragleave={handleDragLeave}
                    ondrop={handleDrop}
                  >
                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg class="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 20 16" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p class="mb-1 text-sm text-gray-500 dark:text-gray-400">
                        <span class="font-semibold">Klik untuk upload</span> atau drag & drop
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WebP (Maks. 2MB)</p>
                    </div>
                    <input 
                      id="imageUpload" 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp" 
                      class="hidden" 
                      onchange={handleImageChange}
                    />
                  </label>
                </div>
              {/if}
              
              {#if imageUploadError}
                <div class="text-sm text-red-600 dark:text-red-400 mt-1">
                  {imageUploadError}
                </div>
              {/if}
            </div>
          </div>
          
          <div>
            <label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Tautan <span class="text-gray-500 dark:text-gray-400 font-normal">(opsional)</span></label>
            <input
              type="url"
              id="url"
              bind:value={url}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://example.com/info"
            />
          </div>
          
          <div class="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onclick={handleCancel}
              disabled={isRedirecting}
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md shadow-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUpdating || isUploadingImage || isRedirecting}
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-sm disabled:opacity-70"
            >
              {#if isUpdating || isUploadingImage}
                <span class="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {isUploadingImage ? 'Mengupload gambar...' : 'Menyimpan...'}
              {:else if isRedirecting}
                <span class="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Mengalihkan...
              {:else}
                Simpan Perubahan
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<style>
  /* Drag & drop styling */
  .drag-over {
    background-color: rgba(16, 185, 129, 0.1) !important;
    border-color: #10b981 !important;
  }
  
  /* Animations */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Notification animations */
  @keyframes notification-in {
    0% {
      opacity: 0;
      transform: translateY(-20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes notification-out {
    0% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-20px);
    }
  }

  .animate-notification-in {
    animation: notification-in 0.3s ease-out forwards;
  }

  .animate-notification-out {
    animation: notification-out 0.3s ease-in forwards;
  }
</style>