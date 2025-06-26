<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Map from '$lib/components/Map.svelte';
  import { formatDate, sanitizeFormData, sanitizeString, isValidUrl, parseUrlTautan, formatUrlTautan } from '$lib/utils';
  
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
    categories?: {
      category: {
        id: string;
        name: string;
      };
    }[];
    allCategories?: {
      id: string;
      name: string;
    }[];
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
  let urlTautan = $state([{ url: '', label: '' }]); // Array untuk multiple URL
  let isAddingUrl = $state(false); // State untuk toggle form tambah URL
  let selectedCategoryIds = $state<string[]>([]); // Array untuk multiple categories
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
  let mapComponent = $state<any>(null); // Referensi ke komponen peta
  
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
      
      // Handle URL tautan - convert dari format lama ke format baru
      urlTautan = parseUrlTautan(markerData.url);
      
      // Jika tidak ada URL tautan sama sekali, buat entry kosong untuk form
      if (urlTautan.length === 0) {
        urlTautan = [{ url: '', label: '' }];
      }
      
      // Handle categories - support both new format (allCategories) and old format (categoryId)
      if (markerData.allCategories && markerData.allCategories.length > 0) {
        selectedCategoryIds = markerData.allCategories.map(cat => cat.id);
      } else if (markerData.categories && markerData.categories.length > 0) {
        selectedCategoryIds = markerData.categories.map(cat => cat.category.id);
      } else if (markerData.categoryId) {
        selectedCategoryIds = [markerData.categoryId];
      } else {
        selectedCategoryIds = [];
      }
      
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
        
        // Otomatis pilih kategori yang baru dibuat
        selectedCategoryIds = [...selectedCategoryIds, createdCategory.id];
        
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
    
    if (selectedCategoryIds.length === 0) {
      error = 'Kategori harus dipilih';
      return;
    }
    
    // Validasi URL tautan
    const validUrlTautan = [];
    for (let i = 0; i < urlTautan.length; i++) {
      const urlItem = urlTautan[i];
      if (urlItem.url.trim()) {
        if (!isValidUrl(urlItem.url)) {
          error = `URL tautan ${i + 1} tidak valid: ${urlItem.url}`;
          return;
        }
        validUrlTautan.push({
          url: urlItem.url.trim(),
          label: urlItem.label.trim() || `Tautan ${i + 1}`
        });
      }
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
      
      // Kirim data update ke server
      const updateData = {
        title: sanitizeString(title) || '',
        description: sanitizeString(description) || '',
        latitude,
        longitude,
        city: city || null,
        categoryIds: selectedCategoryIds, // Kirim array category IDs
        imageUrl: uploadedImageUrl || null,
        // Convert multiple URL tautan ke format yang kompatibel dengan backend
        url: formatUrlTautan(validUrlTautan),
        csrf: $page.data.csrfToken
      };
      
      const response = await fetch(`/api/markers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify(updateData)
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
</script>

<svelte:head>
  <title>Peta Petrus - Edit Marker</title>
</svelte:head>

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
        <a href="/admin/markers/manage" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Kelola Marker</a>
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
        </svg>
        <span class="text-gray-900 dark:text-white font-medium">Edit Marker</span>
      </nav>

      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Marker</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">Perbarui informasi marker pada peta</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-3 mt-4 lg:mt-0">
          <button
            type="button"
            onclick={handleCancel}
            disabled={isRedirecting}
            class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2 shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Kembali</span>
          </button>
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

    <!-- Alert Messages -->
    {#if error}
      <div class="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm" role="alert">
        <div class="flex items-start">
          <div class="p-1 bg-red-500 rounded-full mr-3 mt-0.5">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Terjadi Kesalahan</h3>
            <p class="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    {/if}
    
    {#if success}
      <div class="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 shadow-sm" role="alert">
        <div class="flex items-start">
          <div class="p-1 bg-emerald-500 rounded-full mr-3 mt-0.5">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-emerald-800 dark:text-emerald-200">Berhasil</h3>
            <p class="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{success}</p>
          </div>
          {#if isRedirecting}
            <div class="ml-2">
              <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Main Grid Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <!-- Map Section (2/3 width on xl screens) -->
      <div class="xl:col-span-2">
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/10 dark:to-teal-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Lokasi Marker</h2>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Klik pada peta untuk mengubah posisi</p>
                </div>
              </div>
              
              <!-- Search Location Feature -->
              <div class="hidden lg:flex items-center space-x-2">
                <div class="relative">
                  <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Cari lokasi..."
                    class="w-64 pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300/50 dark:border-gray-600/50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    onkeydown={(e) => e.key === 'Enter' && searchLocation()}
                  />
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onclick={searchLocation}
                  disabled={isSearching}
                  class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {#if isSearching}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {:else}
                    Cari
                  {/if}
                </button>
              </div>
            </div>
            
            <!-- Mobile Search -->
            <div class="lg:hidden mt-4 flex items-center space-x-2">
              <div class="relative flex-1">
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder="Cari lokasi..."
                  class="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300/50 dark:border-gray-600/50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  onkeydown={(e) => e.key === 'Enter' && searchLocation()}
                />
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="button"
                onclick={searchLocation}
                disabled={isSearching}
                class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm flex-shrink-0"
              >
                {#if isSearching}
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {:else}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                {/if}
              </button>
            </div>
            
            {#if searchError}
              <div class="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {searchError}
              </div>
            {/if}
          </div>

          <!-- Map Container -->
          <div class="relative" style="height: 60vh;">
            {#if isLoading}
              <div class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10">
                <div class="text-center">
                  <div class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent mb-4"></div>
                  <p class="text-emerald-700 dark:text-emerald-300 font-medium">Memuat data marker...</p>
                </div>
              </div>
            {/if}
          
            {#if error && !currentMarker}
              <div class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10">
                <div class="text-center p-6">
                  <div class="p-3 bg-red-100 dark:bg-red-900/50 rounded-full inline-block mb-4">
                    <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                  <button 
                    type="button" 
                    onclick={() => goto('/admin/markers/manage')} 
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    Kembali ke Daftar Marker
                  </button>
                </div>
              </div>
            {/if}
          
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

          <!-- Coordinate Display -->
          {#if latitude && longitude}
            <div class="p-14 bg-emerald-50/50 dark:bg-emerald-900/20 border-t border-emerald-200/50 dark:border-emerald-600/50">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="p-1.5 bg-emerald-500 rounded-full">
                    <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Koordinat: <span class="font-mono">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                    </p>
                    <p class="text-xs text-emerald-600 dark:text-emerald-400">Klik peta untuk mengubah posisi marker</p>
                  </div>
                </div>
                <div class="px-3 py-1 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-800 dark:text-emerald-200 text-xs font-medium rounded-full">
                  Aktif
                </div>
              </div>
            </div>
          {:else}
            <div class="p-4 bg-amber-50/50 dark:bg-amber-900/20 border-t border-amber-200/50 dark:border-amber-800/50">
              <div class="flex items-center space-x-3">
                <div class="p-1.5 bg-amber-500 rounded-full">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-amber-800 dark:text-amber-200">Belum ada koordinat yang dipilih</p>
                  <p class="text-xs text-amber-600 dark:text-amber-400">Klik pada peta untuk memilih lokasi marker</p>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Form Section (1/3 width on xl screens) -->
      <div class="xl:col-span-1">
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Edit Informasi</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400">Perbarui detail marker</p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <form onsubmit={handleSubmit} class="space-y-6">
              <!-- Basic Information Section -->
              <div class="space-y-4 form-section">
                <div class="flex items-center space-x-2 mb-4">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Informasi Dasar</h3>
                </div>

                <div class="space-y-4">
                  <div>
                    <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Judul Marker <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <input
                        type="text"
                        id="title"
                        bind:value={title}
                        class="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all input-focus"
                        placeholder="Masukkan judul marker"
                        required
                      />
                      <svg class="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Deskripsi <span class="text-gray-500 font-normal">(opsional)</span>
                    </label>
                    <div class="relative">
                      <textarea
                        id="description"
                        bind:value={description}
                        rows="4"
                        class="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none input-focus"
                        placeholder="Jelaskan tentang marker ini..."
                      ></textarea>
                      <svg class="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <div class="text-right text-xs mt-2 {description && description.length > 65000 ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}">
                      {description ? description.length : 0}/65000 karakter
                    </div>
                  </div>

                  <div>
                    <label for="city" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kota/Kabupaten <span class="text-gray-500 font-normal">(opsional)</span>
                    </label>
                    <div class="relative">
                      <input
                        type="text"
                        id="city"
                        bind:value={city}
                        class="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all input-focus"
                        placeholder="Contoh: Jakarta Selatan"
                      />
                      <svg class="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Categories Section -->
              <div class="space-y-4 form-section">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Kategori</h3>
                  </div>
                  <button 
                    type="button" 
                    class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors hover-lift" 
                    onclick={toggleCategoryForm}
                  >
                    {#if isCreatingCategory}
                      <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Batal
                    {:else}
                      <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Buat Baru
                    {/if}
                  </button>
                </div>
                
                {#if isCreatingCategory}
                  <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div class="space-y-3">
                      <label for="newCategory" class="block text-sm font-medium text-blue-700 dark:text-blue-300">Nama Kategori Baru</label>
                      <input
                        type="text"
                        id="newCategory"
                        bind:value={newCategory}
                        placeholder="Masukkan nama kategori"
                        class="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        disabled={isSavingCategory}
                        onclick={createCategory}
                        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
                      >
                        {#if isSavingCategory}
                          <span class="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {/if}
                        Simpan Kategori
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="space-y-2 max-h-48 overflow-y-auto">
                    {#each categories as category}
                      <label 
                        class={`flex items-center justify-between p-3 rounded-xl border w-full cursor-pointer transition-all duration-200 ${ 
                          selectedCategoryIds.includes(category.id) 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 shadow-sm' 
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div class="flex items-center">
                          <input
                            type="checkbox"
                            bind:group={selectedCategoryIds}
                            value={category.id}
                            class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span class="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </span>
                        </div>
                        <span class="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-full">
                          {category.markerCount || 0}
                        </span>
                      </label>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- Media Section -->
              <div class="space-y-4 form-section">
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Media</h3>
                </div>

                <div>
                  <label for="imageUpload" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Gambar <span class="text-gray-500 font-normal">(opsional)</span>
                  </label>
                  
                  {#if imagePreview}
                    <div class="relative rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm hover-lift">
                      <img src={imagePreview} alt="Preview" class="w-full h-32 object-cover" />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <button 
                        type="button" 
                        onclick={clearImageSelection}
                        class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors hover-lift"
                        title="Hapus gambar"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  {:else}
                    <label 
                      for="imageUpload" 
                      class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:hover:bg-gray-700/50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 transition-colors hover-lift"
                      ondragover={handleDragOver}
                      ondragenter={handleDragEnter}
                      ondragleave={handleDragLeave}
                      ondrop={handleDrop}
                    >
                      <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg class="w-8 h-8 mb-3 text-gray-400" fill="none" viewBox="0 0 20 16" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p class="mb-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                          <span class="font-semibold">Klik atau drag</span> file ke sini
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
                  {/if}
                  
                  {#if imageUploadError}
                    <div class="text-sm text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      {imageUploadError}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- URLs Section -->
              <div class="space-y-4 form-section">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">URL Tautan</h3>
                  </div>
                  <button 
                    type="button" 
                    class="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors hover-lift" 
                    onclick={toggleAddUrl}
                  >
                    {#if isAddingUrl}
                      <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Batal
                    {:else}
                      <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Tambah URL
                    {/if}
                  </button>
                </div>
                
                <!-- Existing URLs -->
                <div class="space-y-3">
                  {#each urlTautan as urlItem, index}
                    <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div class="space-y-3">
                        <div>
                          <label for="urlTautan[{index}].label" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Label Tautan {index + 1}
                          </label>
                          <input
                            type="text"
                            id="urlTautan[{index}].label"
                            bind:value={urlItem.label}
                            placeholder="Contoh: Artikel Terkait"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                          />
                        </div>
                        <div class="flex gap-2">
                          <div class="relative flex-1">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                            <input
                              type="url"
                              id="urlTautan[{index}].url"
                              bind:value={urlItem.url}
                              placeholder="https://example.com"
                              class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                            />
                          </div>
                          {#if urlTautan.length > 1}
                            <button
                              type="button"
                              onclick={() => removeUrlTautan(index)}
                              class="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700 transition-colors duration-200 flex items-center"
                              title="Hapus URL ini"
                            >
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
                
                <!-- Add URL Form -->
                {#if isAddingUrl}
                  <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700">
                    <div class="text-center">
                      <h4 class="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">Tambah URL Tautan Baru</h4>
                      <p class="text-xs text-indigo-600 dark:text-indigo-400 mb-3">Klik tombol dibawah untuk menambah slot URL baru</p>
                      <button
                        type="button"
                        onclick={addUrlTautan}
                        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center w-full"
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Tambah URL Tautan
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-col space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={isUpdating || isUploadingImage || isRedirecting}
                  class="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg disabled:opacity-70 transition-all duration-200 flex items-center justify-center button-primary"
                >
                  {#if isUpdating || isUploadingImage}
                    <span class="inline-block w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isUploadingImage ? 'Mengupload gambar...' : 'Menyimpan...'}
                  {:else if isRedirecting}
                    <span class="inline-block w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Mengalihkan...
                  {:else}
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Perubahan
                  {/if}
                </button>
                
                <button
                  type="button"
                  onclick={handleCancel}
                  disabled={isRedirecting}
                  class="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center hover-lift"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Drag & drop styling */
  .drag-over {
    background-color: rgba(16, 185, 129, 0.1) !important;
    border-color: #10b981 !important;
    transform: scale(1.02);
  }
  
  /* Enhanced animations */
  @keyframes spin {
    to { transform: rotate(360deg); }
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

  /* Component animations */
  .form-section {
    animation: fadeInUp 0.6s ease-out;
  }

  .form-section:nth-child(2) {
    animation-delay: 0.1s;
  }

  .form-section:nth-child(3) {
    animation-delay: 0.2s;
  }

  .form-section:nth-child(4) {
    animation-delay: 0.3s;
  }

  /* Notification animations */
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

  @keyframes notification-out {
    0% {
      opacity: 1;
      transform: translateY(0) translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-20px) translateX(100px);
    }
  }

  .animate-notification-in {
    animation: notification-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .animate-notification-out {
    animation: notification-out 0.3s ease-in forwards;
  }

  /* Hover effects */
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Input focus animations */
  .input-focus {
    transition: all 0.2s ease;
  }

  .input-focus:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  }

  /* Loading state */
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

  /* Button animations */
  .button-primary {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .button-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .button-primary:hover::before {
    left: 100%;
  }

  /* Glassmorphism effect for cards */
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

  /* Responsive improvements */
  @media (max-width: 1024px) {
    .form-section {
      animation-delay: 0s !important;
    }
  }

  /* Smooth transitions for theme changes */
  * {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
</style>