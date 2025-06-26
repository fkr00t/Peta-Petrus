<script lang="ts">
    import Map from '$lib/components/Map.svelte';
    import MarkerForm from '$lib/components/MarkerForm.svelte';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
  
    interface Category {
      id: string;
      name: string;
    }

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
      category?: Category | null;
      categoryId?: string | null;
      city?: string | null;
      imageUrl?: string | null;
      url?: string | null;
      createdBy?: CreatedBy;
    }
  
    // Definisi state untuk user dan admin
    let user: any = null;
    let isAdmin: boolean = false;
    
    // Gunakan variabel reaktif
    let markers: MarkerWithUser[] = $state([]);
    let filteredMarkers: MarkerWithUser[] = $state([]);
    let availableCategories: Category[] = $state([]);
    let selectedCategoryId: string | null = $state(null);
    let isLoading: boolean = $state(true);
    let error: string = $state('');
    let showMarkerForm: boolean = $state(false);
    let newMarkerLat: number = $state(0);
    let newMarkerLng: number = $state(0);
    
    // Toast state
    let showToast: boolean = $state(false);
    let toastMessage: string = $state('');
    let toastType: 'success' | 'error' | 'info' = $state('info');
    let toastTimeout: number | null = $state(null);
    
    // Banner state
    let showInfoBanner: boolean = $state(true);

    // Fungsi untuk menampilkan toast
    function showToastMessage(message: string, type: 'success' | 'error' | 'info' = 'info') {
      // Hapus timeout yang ada jika ada
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      
      // Set pesan dan tipe
      toastMessage = message;
      toastType = type;
      showToast = true;
      
      // Atur timeout untuk menutup toast setelah 3 detik
      toastTimeout = setTimeout(() => {
        showToast = false;
      }, 3000) as unknown as number;
    }
  
    // Fungsi untuk menutup banner informasi
    function closeInfoBanner() {
      showInfoBanner = false;
    }
  
    // Fetch markers on mount
    onMount(() => {
      // Fetch markers
      fetchMarkers();
      
      // Bersihkan timeout saat komponen dihapus
      return () => {
        if (toastTimeout) {
          clearTimeout(toastTimeout);
        }
      };
    });
  
    function fetchMarkers() {
      isLoading = true;
      error = '';
  
      fetch('/api/markers')
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            return response.json().then(errorData => {
              throw new Error(errorData.message || 'Terjadi kesalahan saat mengambil data marker');
            });
          }
        })
        .then(data => {
          markers = data;
          filteredMarkers = [...markers];
          extractCategories();
        })
        .catch(err => {
          console.error('Error fetching markers:', err);
          error = err.message || 'Terjadi kesalahan saat mengambil data marker';
          
          // Tampilkan toast error
          showToastMessage(error, 'error');
        })
        .finally(() => {
          isLoading = false;
        });
    }

    // Ekstrak kategori dari marker
    function extractCategories() {
      // Gunakan object biasa sebagai pengganti Map untuk menghindari masalah typing
      const categoryObject: Record<string, Category> = {};
      
      markers.forEach(marker => {
        if (marker.category && marker.category.id) {
          categoryObject[marker.category.id] = marker.category;
        }
      });
      
      // Konversi object ke array
      availableCategories = Object.values(categoryObject).sort((a, b) => 
        a.name.localeCompare(b.name, 'id')
      );
    }

    // Filter marker berdasarkan kategori
    function filterMarkersByCategory(categoryId: string | null) {
      selectedCategoryId = categoryId;
      
      if (!categoryId) {
        // Jika tidak ada kategori yang dipilih (semua), tampilkan semua marker
        filteredMarkers = [...markers];
      } else {
        // Filter marker berdasarkan kategori
        filteredMarkers = markers.filter(marker => 
          marker.category && marker.category.id === categoryId
        );
      }
    }
  
    // Menangani klik pada peta - tidak ada aksi di halaman publik
    function handleMapClick(lat: number, lng: number) {
      // Tidak melakukan apa-apa saat klik di peta pada halaman utama/publik
      // Aksi tambah marker hanya tersedia di halaman admin
      return;
    }
  
    // Submit marker baru
    async function handleSubmitMarker(formData: FormData) {
      try {
        const markerData = {
          title: formData.get('title'),
          description: formData.get('description'),
          latitude: parseFloat(formData.get('latitude') as string),
          longitude: parseFloat(formData.get('longitude') as string),
        };
  
        const response = await fetch('/api/markers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': $page.data.csrfToken || ''
          },
          body: JSON.stringify({
            ...markerData,
            csrf: $page.data.csrfToken
          }),
        });
  
        if (response.ok) {
          // Refresh markers
          await fetchMarkers();
  
          // Tutup form
          showMarkerForm = false;
          
          // Tampilkan toast sukses
          showToastMessage('Marker berhasil ditambahkan', 'success');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal menambahkan marker');
        }
      } catch (err: any) {
        console.error('Error submitting marker:', err);
        
        // Tampilkan toast error
        showToastMessage(err.message || 'Gagal menambahkan marker', 'error');
        
        throw err;
      }
    }
  
    // Membatalkan penambahan marker
    function cancelAddMarker() {
      showMarkerForm = false;
    }
</script>

<svelte:head>
  <title>Peta Ingatan "Petrus" - Dokumentasi Interaktif Pelanggaran HAM</title>
  <meta name="description" content="Peta interaktif dokumentasi peristiwa Penembakan Misterius (Petrus) yang diakui sebagai pelanggaran HAM berat masa lalu oleh Presiden Joko Widodo." />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://petapetrus.com" />
  
  <!-- Open Graph / Social Media Meta Tags -->
  <meta property="og:title" content="Peta Ingatan 'Petrus' - Dokumentasi Interaktif Pelanggaran HAM" />
  <meta property="og:description" content="Peta interaktif dokumentasi peristiwa Penembakan Misterius (Petrus) yang diakui sebagai pelanggaran HAM berat masa lalu oleh Presiden Joko Widodo." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://petapetrus.com" />
  <meta property="og:image" content="https://petapetrus.com/images/og-image.jpg" />
  
  <!-- Structured Data Schema.org -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Peta Ingatan Petrus",
    "url": "https://petapetrus.com",
    "description": "Peta interaktif dokumentasi peristiwa Penembakan Misterius (Petrus) yang diakui sebagai pelanggaran HAM berat masa lalu oleh Presiden Joko Widodo.",
    "potentialAction": {
      "@type": "ViewAction",
      "target": "https://petapetrus.com"
    }
  }
  </script>
  
  <!-- Structured Data untuk MapLocation -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Lokasi Kasus Petrus",
    "description": "Kumpulan data lokasi-lokasi terkait kasus Penembakan Misterius (Petrus) di Indonesia yang merupakan pelanggaran HAM berat masa lalu.",
    "keywords": ["Petrus", "Penembakan Misterius", "Pelanggaran HAM", "Sejarah Indonesia", "Hak Asasi Manusia"],
    "creator": {
      "@type": "Organization",
      "name": "Tim Peta Petrus"
    },
    "temporalCoverage": "1982-1985",
    "spatialCoverage": {
      "@type": "Place",
      "name": "Indonesia"
    }
  }
  </script>
</svelte:head>

<div class="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900">
  <!-- Navbar padding placeholder - sesuaikan dengan tinggi navbar Anda -->
  <div class="h-[53px] flex-shrink-0"></div>
  
  <!-- Banner informasi di bawah navbar -->
  {#if showInfoBanner}
    <div class="bg-amber-50 dark:bg-gray-800 text-gray-800 dark:text-white border-t border-amber-100 dark:border-gray-700 pr-5">
      <div class="container mx-auto px-10 py-2.5 text-xs flex items-center justify-center">
        <div class="flex items-center gap-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 dark:text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span><span style="font-weight: bold;">Perhatian:</span> Beberapa berita memuat kekerasan vulgar<br> yang mungkin menimbulkan ketidaknyamanan.</span>
          </div>
          
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 dark:text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-1m-4-1v8m0 0l-3-3m3 3l3-3" />
            </svg>
            <span>Marker mungkin tidak akurat & data tidak sepenuhnya <br>mencerminkan jumlah korban sebenarnya.</span>
          </div>
          
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 dark:text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Seluruh pengerjaan dilakukan secara  kolektif <br>dan swadaya tanpa donor/funding.</span>
          </div>
          
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 dark:text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Laman ini untuk kepentingan kemanusiaan <br> dan pendidikan, bukan komersil.</span>
          </div>
        </div>
        
        <!-- Tombol tutup di pojok kanan -->
        <button 
          class="text-blue-600 hover:text-amber-800 dark:text-gray-300 dark:hover:text-white transition-colors flex-shrink-0 ml-10" 
          onclick={closeInfoBanner}
          aria-label="Tutup informasi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Container untuk peta dengan tampilan modern - flex-grow untuk mengisi ruang yang tersisa -->
  <div class="relative flex-grow w-full flex flex-col">
    <!-- Header utama untuk SEO - visually hidden tapi terdeteksi oleh mesin pencari -->
    <header class="sr-only">
      <h1>Peta Ingatan Peristiwa Penembakan Misterius (Petrus) - Dokumentasi Pelanggaran HAM di Indonesia</h1>
    </header>
    
    <!-- Loading state overlay -->
    {#if isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-opacity-75 z-10">
        <div class="text-center">
          <div class="spinner-loading" aria-hidden="true"></div>
          <p class="mt-2 text-primary-700 dark:text-primary-400">Memuat peta...</p>
        </div>
      </div>
    {/if}

    <!-- Toast component -->
    {#if showToast}
      <div class="fixed top-4 right-4 z-50 fade-in">
        <div class="{toastType === 'success' ? 'bg-green-600' : toastType === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <button onclick={() => showToast = false} class="text-white hover:text-gray-200" aria-label="Tutup notifikasi">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <span>{toastMessage}</span>
        </div>
      </div>
    {/if}

    <!-- Peta utama - menggunakan flex-grow untuk mengisi ruang tersisa -->
    <section class="flex-grow w-full flex items-center justify-center" aria-label="Peta lokasi kasus Petrus">
      <h2 class="sr-only">Visualisasi Peta Interaktif Petrus</h2>
      <Map markers={filteredMarkers} isAdmin={false} onAddMarker={handleMapClick} />
    </section>

    <!-- Form marker modal -->
    {#if showMarkerForm}
      <div class="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-lg">
        <MarkerForm
          latitude={newMarkerLat}
          longitude={newMarkerLng}
          onSubmit={handleSubmitMarker}
          onCancel={cancelAddMarker}
        />
      </div>

      <!-- Overlay untuk background saat form terbuka -->
      <div 
        class="overlay" 
        onclick={cancelAddMarker} 
        onkeydown={(e) => e.key === 'Escape' && cancelAddMarker()}
        role="button"
        tabindex="0"
        aria-label="Tutup form marker"
      ></div>
    {/if}
  </div>
</div>

<style>
  /* Overlay untuk form marker */
  .overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10;
    backdrop-filter: blur(2px);
  }
  
  /* Spinner untuk loading */
  .spinner-loading {
    display: inline-block;
    width: 2.5rem;
    height: 2.5rem; 
    border: 4px solid rgba(79, 70, 229, 0.2);
    border-radius: 50%;
    border-top-color: rgb(79, 70, 229);
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Animasi fade-in */
  .fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  /* Pastikan container utama memiliki tinggi penuh */
  :global(html, body, #app, #app > div) {
    height: 100%;
    overflow-x: hidden;
  }
  
  /* Pastikan peta memiliki tinggi penuh */
  :global(.leaflet-container) {
    height: 100% !important;
    width: 100% !important;
    z-index: 1;
  }

  /* Optimasi responsive untuk berbagai ukuran layar */
  @media (max-width: 640px) {
    /* Pengaturan untuk mobile */
    :global(.leaflet-control-zoom) {
      margin-left: 10px !important;
      margin-bottom: 10px !important;
    }
  }

  @media (min-width: 641px) and (max-width: 1024px) {
    /* Pengaturan untuk tablet */
    :global(.leaflet-control-zoom) {
      margin-left: 10px !important;
      margin-bottom: 10px !important;
    }
  }

  /* Hide scrollbar untuk banner info */
  .hide-scrollbar {
    -ms-overflow-style: none;  /* untuk Internet Explorer dan Edge */
    scrollbar-width: none;  /* untuk Firefox */
  }
  
  .hide-scrollbar::-webkit-scrollbar {
    display: none;  /* untuk Chrome, Safari dan Opera */
  }
</style>