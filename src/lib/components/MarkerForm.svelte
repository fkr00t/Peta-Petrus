<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { sanitizeString, isValidUrl, formatUrlTautan } from '$lib/utils';

  export let latitude: number | null = null;
  export let longitude: number | null = null;
  export let onSubmit: (formData: FormData) => Promise<void>;
  export let onCancel: () => void;
  export let mapComponent: any = null; // Untuk referensi komponen peta
  
  // Props untuk multiple URL tautan dari parent component
  export let urlTautan: { url: string; label: string }[] = [{ url: '', label: '' }];
  export let isAddingUrl: boolean = false;
  export let addUrlTautan: (() => void) | null = null;
  export let removeUrlTautan: ((index: number) => void) | null = null;
  export let toggleAddUrl: (() => void) | null = null;

  const hasCoordinates = () => latitude !== null && longitude !== null;

  type Category = {
    id: string;
    name: string;
    markerCount?: number;
  }

  let title = '';
  let description = '';
  let city = '';
  let imageFile: File | null = null;
  let imagePreview = ''; // Preview URL untuk gambar yang diupload
  let isUploadingImage = false; // Status upload gambar
  let imageUploadError = ''; // Error saat upload gambar
  let selectedCategoryId = '';
  let selectedCategoryIds: string[] = []; // Array untuk multiple categories
  let newCategory = '';
  let categories: Category[] = [];
  let isCreatingCategory = false;
  let submitting = false;
  let loading = true;
  let error = '';
  let success = '';
  let showConfirmDialog = false;
  let categoryToDelete: Category | null = null;

  onMount(async () => {
    try {
      const response = await fetch('/api/categories?includeCount=true');
      if (response.ok) {
        categories = await response.json();
      } else {
        console.error('Gagal mengambil data kategori');
      }
    } catch (err: unknown) {
      console.error('Error fetching categories:', err);
    } finally {
      loading = false;
    }
  });

  const createCategory = async () => {
    if (!newCategory.trim()) {
      error = 'Nama kategori tidak boleh kosong';
      return;
    }

    submitting = true;
    error = '';

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({ 
          name: newCategory.trim(),
          csrf: $page.data.csrfToken
        }),
      });

      if (response.ok) {
        const createdCategory = await response.json();
        categories = [...categories, createdCategory];
        
        // Otomatis pilih kategori yang baru dibuat
        selectedCategoryIds = [...selectedCategoryIds, createdCategory.id];
        
        newCategory = '';
        isCreatingCategory = false;
        success = 'Kategori berhasil dibuat dan dipilih';
        
        setTimeout(() => {
          success = '';
        }, 3000);
      } else {
        const data = await response.json();
        error = data.message || 'Gagal membuat kategori';
      }
    } catch (err: unknown) {
      error = 'Terjadi kesalahan saat membuat kategori';
      console.error('Error creating category:', err);
    } finally {
      submitting = false;
    }
  };

  async function clearForm() {
    title = '';
    description = '';
    city = '';
    imageFile = null;
    imagePreview = '';
    selectedCategoryIds = []; // Reset multiple categories
    newCategory = '';
    isCreatingCategory = false;
    error = '';
    success = '';
    
    // Bersihkan marker sementara dari peta
    if (mapComponent && mapComponent.clearTempMarker) {
      mapComponent.clearTempMarker();
    }
  }

  const confirmDeleteCategory = (category: Category) => {
    categoryToDelete = category;
    showConfirmDialog = true;
  };

  const closeConfirmDialog = () => {
    showConfirmDialog = false;
    categoryToDelete = null;
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    
    const categoryId = categoryToDelete.id;
    closeConfirmDialog();

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': $page.data.csrfToken || ''
        }
      });

      if (response.ok) {
        categories = categories.filter(category => category.id !== categoryId);
        if (selectedCategoryId === categoryId) {
          selectedCategoryId = '';
        }
        success = 'Kategori berhasil dihapus';
        setTimeout(() => success = '', 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus kategori');
      }
    } catch (err: unknown) {
      console.error('Error deleting category:', err);
      error = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus kategori';
    }
  };

  // Handler untuk pemilihan file gambar
  const handleImageChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
      imageFile = null;
      imagePreview = '';
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
    
    // Jika gambar berasal dari server (URL dimulai dengan /uploads/), hapus file fisik
    if (currentImageUrl && currentImageUrl.startsWith('/uploads/')) {
      try {
        const response = await fetch('/api/upload/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': $page.data.csrfToken || ''
          },
          body: JSON.stringify({
            imageUrl: currentImageUrl,
            csrf: $page.data.csrfToken
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gagal menghapus file:', errorData.message);
          // Tidak perlu menampilkan error ke pengguna karena gambar sudah dihapus dari UI
        }
      } catch (err) {
        console.error('Error saat menghapus file:', err);
      }
    }
  };

  const handleSubmit = async (event: Event) => {
    console.log('📋 MarkerForm handleSubmit called');
    
    if (!title) {
      error = 'Judul marker tidak boleh kosong';
      return;
    }

    if (!hasCoordinates()) {
      error = 'Koordinat tidak boleh kosong. Silakan klik pada peta untuk memilih lokasi.';
      return;
    }
    
    if (selectedCategoryIds.length === 0) {
      error = 'Minimal satu kategori harus dipilih';
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
    
    console.log('🔍 MarkerForm validUrlTautan:', validUrlTautan);

    error = '';
    submitting = true;

    try {
      const formData = new FormData();
      
      // Upload gambar jika ada
      let uploadedImageUrl = null;
      
      // Upload gambar jika ada file
      if (imageFile) {
        console.log('📸 Uploading image...');
        const uploadResult = await uploadImage();
        if (uploadResult) {
          uploadedImageUrl = uploadResult;
          console.log('✅ Image uploaded:', uploadedImageUrl);
        } else if (imageUploadError) {
          error = imageUploadError;
          submitting = false;
          return;
        }
      }
      
      // Pastikan nilai latitude dan longitude adalah number yang valid
      if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
        error = 'Koordinat tidak valid';
        submitting = false;
        return;
      }
      
      // Pastikan categoryId tidak kosong
      if (selectedCategoryIds.length === 0) {
        error = 'Minimal satu kategori harus dipilih';
        submitting = false;
        return;
      }
      
      // Sanitasi semua input form sebelum mengirim ke server
      formData.append('title', sanitizeString(title) || '');
      formData.append('description', sanitizeString(description) || '');
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      if (city && city.trim()) formData.append('city', sanitizeString(city) || '');
      if (uploadedImageUrl) formData.append('imageUrl', sanitizeString(uploadedImageUrl) || '');
      
      // Convert multiple URL tautan ke format yang kompatibel dengan backend
      const formattedUrl = formatUrlTautan(validUrlTautan);
      if (formattedUrl) formData.append('url', formattedUrl);
      
      // Kirim array kategori
      formData.append('categoryIds', JSON.stringify(selectedCategoryIds));
      
      console.log('📤 MarkerForm submitting with FormData:', Array.from(formData.entries()));

      await onSubmit(formData);
      await clearForm();
    } catch (err: unknown) {
      console.error('💥 MarkerForm submit error:', err);
      error = 'Terjadi kesalahan saat menyimpan marker';
    } finally {
      submitting = false;
    }
  };

  const toggleCategoryForm = () => {
    isCreatingCategory = !isCreatingCategory;
    if (!isCreatingCategory) {
      newCategory = '';
    }
  };
</script>

<div class="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 my-4">
  <div class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-t-xl">
    <h2 class="text-xl font-bold">Tambah Marker Baru</h2>
    <p class="text-emerald-100 text-sm mt-1">Lengkapi form berikut untuk menambahkan titik baru pada peta</p>
  </div>

  {#if error}
    <div class="mx-6 mt-4 bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-md flex items-start" role="alert">
      <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>{error}</span>
    </div>
  {/if}

  {#if success}
    <div class="mx-6 mt-4 bg-emerald-100 dark:bg-emerald-900/40 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-300 p-4 rounded-r-md flex items-start" role="alert">
      <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>{success}</span>
    </div>
  {/if}

  <form onsubmit={(e) => {
    e.preventDefault();
    handleSubmit(e);
  }} class="p-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="space-y-4">
        <div class="form-group">
          <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Judul <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <input
              type="text"
              id="title"
              bind:value={title}
              placeholder="Judul lokasi"
              class="w-full pl-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deskripsi
          </label>
          <div class="relative">
            <div class="absolute top-3 left-3 text-gray-400">
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <textarea
              id="description"
              bind:value={description}
              placeholder="Deskripsi tentang lokasi ini"
              class="w-full pl-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="form-group">
          <label for="city" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kota/Kabupaten
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <input
              type="text"
              id="city"
              bind:value={city}
              placeholder="Nama kota atau kabupaten"
              class="w-full pl-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="coordinates" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Koordinat Lokasi
          </label>
          
          <div id="coordinates">
            {#if hasCoordinates()}
              <div class="grid grid-cols-2 gap-4">
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="latitude"
                    value={latitude!.toFixed(6)}
                    class="w-full pl-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 shadow-sm"
                    readonly
                  />
                  <label for="latitude" class="absolute -bottom-5 left-0 text-xs text-gray-500 dark:text-gray-400">Latitude</label>
                </div>
                
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="longitude"
                    value={longitude!.toFixed(6)}
                    class="w-full pl-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 shadow-sm"
                    readonly
                  />
                  <label for="longitude" class="absolute -bottom-5 left-0 text-xs text-gray-500 dark:text-gray-400">Longitude</label>
                </div>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-7 italic">Koordinat diambil secara otomatis dari posisi marker yang dipilih pada peta</p>
            {:else}
              <div class="p-4 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <svg class="h-8 w-8 mx-auto text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p class="text-sm text-gray-600 dark:text-gray-400">Belum ada koordinat yang dipilih</p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">Klik pada peta untuk menentukan lokasi marker</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="form-group">
          <div class="flex justify-between items-center mb-2">
            <label for="urlTautan" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              URL Tautan <span class="text-gray-500 dark:text-gray-400 font-normal">(opsional)</span>
            </label>
            <button 
              type="button" 
              class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center" 
              onclick={() => toggleAddUrl && toggleAddUrl()}
            >
              {#if isAddingUrl}
                <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali
              {:else}
                <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah URL Lain
              {/if}
            </button>
          </div>
          
          <!-- Daftar URL Tautan yang sudah ada -->
          <div class="space-y-3">
            {#each urlTautan as urlItem, index}
              <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                <div class="grid grid-cols-1 gap-3">
                  <div>
                    <label for="urlTautan[{index}].label" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Label Tautan {index + 1}
                    </label>
                    <input
                      type="text"
                      id="urlTautan[{index}].label"
                      bind:value={urlItem.label}
                      placeholder="Contoh: Artikel Terkait, Sumber Info, dll"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                  <div class="flex gap-2">
                    <div class="relative flex-1">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        type="url"
                        id="urlTautan[{index}].url"
                        bind:value={urlItem.url}
                        placeholder="https://example.com/info"
                        class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    {#if urlTautan.length > 1}
                      <button
                        type="button"
                        onclick={() => removeUrlTautan && removeUrlTautan(index)}
                        class="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-700 transition-colors duration-200 flex items-center"
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
          
          <!-- Form tambah URL baru -->
          {#if isAddingUrl}
            <div class="mt-3 p-3 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <div class="mb-3">
                <label class="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">Tambah URL Tautan Baru</label>
                <p class="text-xs text-emerald-600 dark:text-emerald-400 mb-2">Anda dapat menambahkan beberapa URL tautan untuk setiap marker</p>
              </div>
              <button
                type="button"
                onclick={() => addUrlTautan && addUrlTautan()}
                class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-sm transition-colors duration-200"
              >
                <span class="flex items-center justify-center">
                  <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Tambah URL Tautan
                </span>
              </button>
            </div>
          {/if}
          
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Tambahkan URL website terkait dengan marker ini. Setiap URL dapat memiliki label deskriptif.
          </p>
        </div>

        <div class="form-group">
          <label for="imageUpload" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gambar
          </label>
          
          <div class="mt-2 space-y-3">
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

        <div class="form-group">
          <div class="flex justify-between items-center mb-1">
            <label for="categories-group" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kategori <span class="text-red-500">*</span>
            </label>
            <button 
              type="button" 
              class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center transition-colors duration-200" 
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
            <div id="categories-group" class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-inner">
              <div class="mb-3">
                <label for="newCategory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kategori Baru</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="newCategory"
                    bind:value={newCategory}
                    placeholder="Nama kategori baru"
                    class="w-full pl-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onclick={createCategory}
                class="w-full flex justify-center items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
              >
                {#if submitting}
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                {:else}
                  <svg class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Kategori
                {/if}
              </button>
            </div>
          {:else}
            {#if categories.length > 0}
              <div id="categories-group" class="mt-2 space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                {#each categories as category}
                  <label 
                    class={`flex items-center justify-between p-2 rounded-md border w-full cursor-pointer ${
                      selectedCategoryIds.includes(category.id) 
                        ? 'bg-emerald-100 dark:bg-emerald-800/50 border-emerald-300 dark:border-emerald-700' 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    } group hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors`}
                  >
                    <div class="flex items-center w-full">
                      <input 
                        type="checkbox" 
                        name="categories" 
                        value={category.id} 
                        bind:group={selectedCategoryIds} 
                        class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-3" 
                      />
                      <svg class="h-4 w-4 text-emerald-500 dark:text-emerald-400 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">{category.name}</span>
                      {#if selectedCategoryIds.includes(category.id)}
                        <svg class="h-4 w-4 text-emerald-500 dark:text-emerald-400 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      {/if}
                    </div>
                    
                    {#if !category.markerCount || category.markerCount === 0}
                      <button 
                        type="button"
                        title="Hapus kategori"
                        aria-label="Hapus kategori {category.name}"
                        class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none ml-2 flex-shrink-0"
                        onclick={(e) => {
                          e.stopPropagation();
                          confirmDeleteCategory(category);
                        }}
                      >
                        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    {/if}
                  </label>
                {/each}
              </div>
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500 dark:text-gray-400">Pilih satu atau lebih kategori (minimal 1)</p>
                {#if selectedCategoryIds.length > 0}
                  <p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{selectedCategoryIds.length} kategori dipilih</p>
                {/if}
              </div>
            {:else}
              <div class="p-3 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
                Belum ada kategori. Buat kategori baru untuk mengklasifikasikan marker Anda.
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
    
    <div class="flex justify-end items-center space-x-3 pt-5 mt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onclick={clearForm}
        class="px-5 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
        title="Bersihkan form dan hapus marker sementara"
      >
        <span class="flex items-center">
          <svg class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </span>
      </button>

      <button
        type="submit"
        disabled={submitting || isUploadingImage}
        aria-label="Simpan Marker"
        class="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
      >
        <span class="flex items-center">
          {#if submitting || isUploadingImage}
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isUploadingImage ? 'Mengupload gambar...' : 'Menyimpan...'}
          {:else}
            <svg class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Simpan Marker
          {/if}
        </span>
      </button>
    </div>
  </form>
</div>

{#if showConfirmDialog && categoryToDelete}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden transform transition-all">
      <div class="bg-red-500 text-white px-6 py-4">
        <h3 class="text-lg font-medium">Konfirmasi Hapus</h3>
      </div>
      <div class="p-6">
        <div class="flex items-start">
          <div class="flex-shrink-0 bg-red-100 dark:bg-red-900/30 rounded-full p-2">
            <svg class="h-6 w-6 text-red-600 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus kategori <span class="font-bold">{categoryToDelete.name}</span>?
            </p>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-3">
          <button 
            type="button" 
            class="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onclick={closeConfirmDialog}
          >
            Batal
          </button>
          <button 
            type="button" 
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onclick={deleteCategory}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  input:focus, textarea:focus {
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.2);
  }
  
  .form-group {
    transition: all 0.3s ease;
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Style untuk efek drag & drop */
  .drag-over {
    background-color: rgba(16, 185, 129, 0.1) !important;
    border-color: #10b981 !important;
  }
</style>