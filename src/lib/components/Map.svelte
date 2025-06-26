<!-- Map.svelte -->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import { parseUrlTautan } from '$lib/utils';
  
  interface MarkerData {
    id: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    city?: string | null;
    imageUrl?: string | null;
    url?: string | null;
    categoryId?: string | null;
    category?: {
      id: string;
      name: string;
    } | null;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: {
      id: string;
      username: string;
    } | null;
    allCategories?: {
      id: string;
      name: string;
    }[];
    [key: string]: any;
  }
  
  interface SearchResult {
    lat: string;
    lon: string;
    display_name: string;
    boundingbox: string[];
  }
  
  let { markers = [], isAdmin = false, onAddMarker = (lat: number, lng: number) => {}, useBroadView = false, hideControls = false, hideFilterButton = false, controlsPosition = 'bottom' } = $props<{
    markers?: MarkerData[];
    isAdmin?: boolean;
    onAddMarker?: (lat: number, lng: number) => void;
    useBroadView?: boolean;
    hideControls?: boolean;
    hideFilterButton?: boolean;
    controlsPosition?: 'bottom' | 'middle';
  }>();
  
  let mapElement: HTMLElement;
  let map: any;
  let mapMarkers: any[] = [];
  let tempMarker: any = null; // Marker sementara untuk lokasi yang baru dipilih
  let mapInitialized = false;
  let leafletStylesLoaded = false;
  
  // State untuk filter kategori
  let availableCategories: {id: string, name: string}[] = $state([]);
  let selectedCategoryId: string | null = $state(null);
  let showFilterPanel: boolean = $state(false);
  let filteredMarkers: MarkerData[] = $state([]);
  
  // State untuk pesan zoom
  let showZoomMessage: boolean = $state(false);
  let zoomMessageTimeout: any = null;
  let isMobile: boolean = $state(false);
  
  // State untuk pencarian lokasi
  let searchQuery = $state('');
  let isSearching = $state(false);
  let searchError = $state('');
  let searchSuccess = $state('');
  let showSearchPanel = $state(false);
  
  let resetZoom;
  
  const dispatch = createEventDispatcher();
  
  // Ekspos method untuk membersihkan marker sementara
  export function clearTempMarker() {
    if (tempMarker) {
      tempMarker.remove();
      tempMarker = null;
    }
  }
  
  // Ekstrak kategori yang tersedia dari marker untuk filter
  function extractCategories() {
    const categoryMap = new Map();
    
    markers.forEach(marker => {
      // Ambil dari allCategories (multiple categories system)
      if (marker.allCategories && marker.allCategories.length > 0) {
        marker.allCategories.forEach(category => {
          categoryMap.set(category.id, category);
        });
      }
      // Fallback untuk backward compatibility dengan single category
      else if (marker.category) {
        categoryMap.set(marker.category.id, marker.category);
      }
    });
    
    // Konversi Map ke array dan sortir berdasarkan nama
    availableCategories = Array.from(categoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name, 'id')
    );
    
    // Set filtered markers ke semua marker saat pertama kali
    filteredMarkers = [...markers];
  }
  
  // Filter marker berdasarkan kategori yang dipilih
  function filterMarkersByCategory(categoryId: string | null) {
    selectedCategoryId = categoryId;
    
    if (!categoryId) {
      // Jika tidak ada kategori yang dipilih (reset), tampilkan semua marker
      filteredMarkers = [...markers];
    } else {
      // Filter marker berdasarkan kategori - support multiple categories
      filteredMarkers = markers.filter(marker => {
        // Cek di allCategories (multiple categories system)
        if (marker.allCategories && marker.allCategories.length > 0) {
          return marker.allCategories.some(category => category.id === categoryId);
        }
        // Fallback untuk single category system
        else if (marker.category) {
          return marker.category.id === categoryId;
        }
        return false;
      });
    }
    
    // Update markers pada peta
    refreshMapMarkers();
  }
  
  // Reset filter
  function resetFilter() {
    selectedCategoryId = null;
    filteredMarkers = [...markers];
    refreshMapMarkers();
  }
  
  // Refresh markers pada peta
  function refreshMapMarkers() {
    if (!map || !mapInitialized) return;
    
    // Hapus semua marker dari peta
    mapMarkers.forEach(marker => {
      if (marker) marker.remove();
    });
    mapMarkers = [];
    
    // Tambahkan marker yang telah difilter
    if (browser) {
      import('leaflet').then(L => {
        // Create custom marker icon for refreshing markers
        const customMarkerIcon = L.divIcon({
          html: `<div class="custom-marker-icon">
            <img src="/icons/location-pin.svg" width="24" height="36" alt="Marker">
          </div>`,
          className: '',
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36]
        });
        
        // Custom marker icon untuk marker sementara (biru)
        const blueMarkerIcon = L.divIcon({
          html: `<div class="custom-marker-icon">
            <img src="/icons/blue-pin.svg" width="24" height="36" alt="Marker">
          </div>`,
          className: '',
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36]
        });
        
        addMarkersToMap(L, customMarkerIcon);
      });
    }
  }
  
  // Function untuk menutup semua panel
  function closeAllPanels() {
    showFilterPanel = false;
    showSearchPanel = false;
  }
  
  // Toggle panel filter
  function toggleFilterPanel() {
    showFilterPanel = !showFilterPanel;
    
    // Tutup panel search jika panel filter dibuka
    if (showFilterPanel && showSearchPanel) {
      showSearchPanel = false;
    }
  }
  
  // Toggle panel search
  function toggleSearchPanel() {
    showSearchPanel = !showSearchPanel;
    
    // Tutup panel filter jika panel search dibuka
    if (showSearchPanel && showFilterPanel) {
      showFilterPanel = false;
    }
  }
  
  // Fungsi untuk mencari lokasi berdasarkan query
  async function searchLocation() {
    if (!searchQuery.trim()) {
      searchError = 'Masukkan nama lokasi untuk mencari';
      searchSuccess = '';
      return;
    }

    searchError = '';
    searchSuccess = '';
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
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        // Jika peta telah dimuat, lakukan zoom ke lokasi
        if (map && mapInitialized) {
          map.flyTo([lat, lng], 13);
          searchSuccess = `Lokasi ditemukan: ${location.display_name}`;
          
          // Reset status sukses setelah 5 detik
          setTimeout(() => {
            searchSuccess = '';
          }, 5000);
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
  
  // Inisialisasi peta saat komponen dipasang
  onMount(() => {
    // Ekstrak kategori yang tersedia dari marker
    extractCategories();
    
    if (browser) {
      // Cek apakah device mobile
      isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Lepaskan fungsi async ke dalam fungsi terpisah
      initMap().catch(error => {
        console.error("Error initializing map:", error);
      });
      
      // Tambahkan event listener untuk resize window
      const handleResize = () => {
        if (map && mapInitialized) {
          // Invalidate size ketika ukuran window berubah
          map.invalidateSize();
          
          // Sesuaikan zoom level berdasarkan ukuran layar
          const isMobileSize = window.innerWidth < 640;
          const isTabletSize = window.innerWidth >= 640 && window.innerWidth < 1024;
          
          // Sesuaikan zoom berdasarkan ukuran viewport
          if (isMobileSize && map.getZoom() > 7) {
            map.setZoom(7);
          } else if (isTabletSize && map.getZoom() > 7.5 && map.getZoom() < 8) {
            map.setZoom(7.5);
          }
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Cleanup event listener saat komponen dihapus
      return () => {
        window.removeEventListener('resize', handleResize);
        if (map) {
          map.off('click');
        }
      };
    }
  });
  
  // Tambahkan event listener untuk orientasi layar berubah (mobile)
  $effect(() => {
    if (browser && typeof window.orientation !== 'undefined') {
      const handleOrientationChange = () => {
        if (map && mapInitialized) {
          // Tunggu sedikit untuk memastikan dimensi layar sudah diupdate
          setTimeout(() => {
            map.invalidateSize();
          }, 300);
        }
      };
      
      window.addEventListener('orientationchange', handleOrientationChange);
      
      // Cleanup saat komponen di-unmount
      return () => {
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    }
  });
  
  // Cleanup saat komponen dihapus dari DOM
  onDestroy(() => {
    if (map) {
      // Hapus semua marker dari peta
      mapMarkers.forEach(marker => {
        if (marker) marker.remove();
      });
      
      // Hapus marker sementara jika ada
      if (tempMarker) {
        tempMarker.remove();
        tempMarker = null;
      }
      
      // Hapus instance peta
      map.remove();
      map = null;
      mapInitialized = false;
    }
  });
  
  // Reset peta saat URL halaman berubah
  $effect(() => {
    if ($page && map && mapInitialized) {
      console.log("Page route changed, invalidating map size...");
      setTimeout(() => {
        // Penting: invalidate ukuran peta saat navigasi halaman
        map.invalidateSize();
        
        // Jika menggunakan markers, refresh juga marker
        if (markers && markers.length > 0) {
          import('leaflet').then(L => {
            // Hapus marker lama
            mapMarkers.forEach(marker => marker.remove());
            mapMarkers = [];
            
            // Tambahkan marker baru
            // Create custom marker icon
            const customMarkerIcon = L.divIcon({
              html: `<div class="custom-marker-icon">
                <img src="/icons/location-pin.svg" width="24" height="36" alt="Marker">
              </div>`,
              className: '',
              iconSize: [24, 36],
              iconAnchor: [12, 36],
              popupAnchor: [0, -36]
            });
            
            addMarkersToMap(L, customMarkerIcon);
          });
        }
      }, 200);
    }
  });
  
  // Fungsi async terpisah untuk inisialisasi peta
  async function initMap() {
    try {
      console.log("Mounting map component...");
      
      // Dynamically import Leaflet only in browser
      const L = await import('leaflet');
      console.log("Leaflet imported successfully");
      
      // Load Leaflet CSS dinamis - pastikan stylesheet ada dan unik
      if (!leafletStylesLoaded) {
        // Load Leaflet CSS
        const leafletStylesheet = document.createElement('link');
        leafletStylesheet.rel = 'stylesheet';
        leafletStylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        leafletStylesheet.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        leafletStylesheet.crossOrigin = '';
        document.head.appendChild(leafletStylesheet);
        
        // Load custom marker style
        const markerStylesheet = document.createElement('link');
        markerStylesheet.rel = 'stylesheet';
        markerStylesheet.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
        document.head.appendChild(markerStylesheet);
        
        // Load custom marker default style
        const markerDefaultStylesheet = document.createElement('link');
        markerDefaultStylesheet.rel = 'stylesheet';
        markerDefaultStylesheet.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
        document.head.appendChild(markerDefaultStylesheet);
        
        // Load fullscreen CSS
        const fullscreenStylesheet = document.createElement('link');
        fullscreenStylesheet.rel = 'stylesheet';
        fullscreenStylesheet.href = 'https://unpkg.com/leaflet-fullscreen@1.0.2/dist/leaflet.fullscreen.css';
        document.head.appendChild(fullscreenStylesheet);
        
        leafletStylesLoaded = true;
      }
      
      // Load Leaflet fullscreen plugin
      const fullscreenScript = document.createElement('script');
      fullscreenScript.src = 'https://unpkg.com/leaflet-fullscreen@1.0.2/dist/Leaflet.fullscreen.min.js';
      fullscreenScript.id = 'leaflet-fullscreen-script';
      
      // Hapus script lama jika ada
      const oldScript = document.getElementById('leaflet-fullscreen-script');
      if (oldScript) {
        oldScript.remove();
      }
      
      // Tunggu plugin fullscreen selesai dimuat baru inisialisasi peta
      fullscreenScript.onload = () => {
        // Tunggu beberapa saat untuk memastikan DOM dan plugin sudah dirender
        setTimeout(() => {
          // Pastikan instance peta lama dibersihkan
          if (map) {
            map.remove();
            map = null;
          }
          
          initializeMap(L);
        }, 100);
      };
      
      document.head.appendChild(fullscreenScript);
      
      // Tambahkan event listener untuk klik pada peta untuk menutup panel
      setTimeout(() => {
        if (map) {
          map.on('click', () => {
            if (!isAdmin) {
              closeAllPanels();
            }
          });
        }
      }, 500);
      
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }
  
  // Function to initialize the map
  function initializeMap(L: any) {
    if (!mapElement) {
      console.error("Map element not found");
      return;
    }
    
    console.log("Initializing map...");
    
    // Batas geografis Indonesia
    const indoSouthWest = L.latLng(-11.2, 94.0);  // Rote – Sabang
    const indoNorthEast = L.latLng(6.2, 141.0);  // Miangas – Merauke

    let southWest, northEast, zoomLevel, minZoomLevel, boundsViscosity;
    
    // Tentukan zoom berdasarkan ukuran layar
    const isMobileSize = window.innerWidth < 640;
    const isTabletSize = window.innerWidth >= 640 && window.innerWidth < 1024;
    
    if (useBroadView) {
      // Mode tambah-marker: area sedikit diperluas agar fleksibel
      southWest        = L.latLng(-11.2, 94.0);
      northEast        = L.latLng(6.2, 141.0);
      zoomLevel        = isMobileSize ? 4 : (isTabletSize ? 4.5 : 5.4);
      minZoomLevel     = zoomLevel;
      boundsViscosity  = 0.6;
    } else {
      // Halaman utama – kunci seluruh Indonesia (lebih zoom-out)
      southWest        = indoSouthWest;
      northEast        = indoNorthEast;
      // Zoom default disesuaikan: Mobile 4 / Tablet 4.5 / Desktop 5 (tidak terlalu luas)
      zoomLevel        = isMobileSize ? 4 : (isTabletSize ? 4.5 : 5.4);
      minZoomLevel     = zoomLevel;
      boundsViscosity  = 0.85;
    }
    
    const javaBounds = L.latLngBounds(southWest, northEast);
    
    // Initialize the map with appropriate configuration
    map = L.map(mapElement, {
      center: [-2.5, 118], // Pusat geografis Indonesia
      zoom: zoomLevel,
      minZoom: minZoomLevel,
      maxBounds: javaBounds,
      maxBoundsViscosity: boundsViscosity,
      zoomControl: false,    // We'll add zoom control manually to position it
      fullscreenControl: false, // Kita akan menambahkan fullscreen control secara manual
      scrollWheelZoom: false, // Nonaktifkan zoom dengan scroll wheel
      attributionControl: false // Nonaktifkan attributionControl
    });
    
    // Batasi area zoom out dengan listener zoom
    map.on('zoomend', function() {
      const currentZoom = map.getZoom();
      const minZ = map.getMinZoom();
      if (currentZoom < minZ) { 
        // Jika zoom kurang dari level minimal yang diinginkan
        map.setZoom(minZ); // Kembalikan ke zoom minimal yang diinginkan
        
        // Tampilkan pesan zoom feedback jika pengguna mencoba zoom out melebihi batas
        showZoomMessage = true;
        if (zoomMessageTimeout) {
          clearTimeout(zoomMessageTimeout);
        }
        
        zoomMessageTimeout = setTimeout(() => {
          showZoomMessage = false;
        }, 1500);
      }
    });
    
    // Event listener untuk scroll di peta
    mapElement.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) {
        // Hapus preventDefault agar browser tetap bisa scroll
        // e.preventDefault();
        showZoomMessage = true;
        
        // Reset timer jika sudah ada
        if (zoomMessageTimeout) {
          clearTimeout(zoomMessageTimeout);
        }
        
        // Atur waktu pesan hilang - dipercepat menjadi 1000ms
        zoomMessageTimeout = setTimeout(() => {
          showZoomMessage = false;
        }, 1000);
      } else {
        // Jika ctrl+scroll, aktifkan zoom dan cegah browser ikut zoom
        e.preventDefault(); // Mencegah browser zoom
        map.scrollWheelZoom.enable();
        setTimeout(() => {
          map.scrollWheelZoom.disable();
        }, 1000);
      }
    }, { passive: false });
    
    // Event listener untuk touchmove pada perangkat mobile
    if (isMobile) {
      // Nonaktifkan dragging secara default di mobile agar satu jari bisa scroll halaman
      map.dragging.disable();
      
      // Variabel untuk melacak apakah pengguna sedang mencoba navigasi
      let isNavigating = false;
      
      // Deteksi touchstart untuk mempersiapkan deteksi geser
      mapElement.addEventListener('touchstart', (e) => {
        // Biarkan touchstart berlalu untuk memungkinkan klik marker
        // Tapi tandai posisi awal untuk mendeteksi gerakan
        if (e.touches.length === 1) {
          isNavigating = false;
        } else if (e.touches.length >= 2) {
          // Dua jari - aktifkan dragging
          showZoomMessage = false;
          map.dragging.enable();
        }
      });
      
      // Gunakan touchmove untuk mendeteksi usaha menggeser peta
      mapElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          // Pengguna mencoba menggeser dengan satu jari
          isNavigating = true;
          showZoomMessage = true;
          
          // Pastikan dragging tetap non-aktif saat satu jari; biarkan laman bisa scroll
          map.dragging.disable();
        }
      });
      
      // Tambahkan event listener untuk touchend
      mapElement.addEventListener('touchend', (e) => {
        // Jika tidak ada jari atau tinggal satu jari, nonaktifkan lagi dragging
        if (e.touches.length < 2) {
          map.dragging.disable();
        }

        // Sembunyikan pesan jika pengguna hanya tap
        if (e.touches.length === 0) {
          showZoomMessage = false;
        }
      });
    }
    
    // Add OpenStreetMap tile layer dengan dukungan retina agar tidak blur
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      detectRetina: false,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add zoom control to bottom left
    L.control.zoom({
      position: 'bottomleft'
    }).addTo(map);
    
    // Tambahkan kontrol fullscreen secara manual
    try {
      // Periksa apakah plugin fullscreen sudah dimuat
      if (L.control.fullscreen) {
        L.control.fullscreen({
          position: 'topleft',
          title: 'Tampilkan layar penuh',
          titleCancel: 'Keluar dari layar penuh',
          forceSeparateButton: true
        }).addTo(map);
        console.log("Fullscreen control added successfully");
      } else {
        console.warn("Fullscreen control not available");
      }
    } catch (e) {
      console.error("Error adding fullscreen control:", e);
    }
    
    // Custom marker icon untuk semua marker dengan pin merah
    const customMarkerIcon = L.divIcon({
      html: `<div class="custom-marker-icon">
        <img src="/icons/location-pin.svg" width="24" height="36" alt="Marker">
      </div>`,
      className: '',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36]
    });
    
    // Custom marker icon untuk marker sementara (biru)
    const blueMarkerIcon = L.divIcon({
      html: `<div class="custom-marker-icon">
        <img src="/icons/blue-pin.svg" width="24" height="36" alt="Marker">
      </div>`,
      className: '',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36]
    });

    // Add markers to the map
    addMarkersToMap(L, customMarkerIcon);
    
    // Add click event if admin
    if (isAdmin) {
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Remove previous temporary marker if it exists
        if (tempMarker) {
          tempMarker.remove();
        }
        
        // Add a temporary marker at the clicked location with blue marker
        tempMarker = L.marker([lat, lng], { icon: blueMarkerIcon })
          .addTo(map)
          .bindPopup('Lokasi yang dipilih')
          .openPopup();
        
        // Call the callback function to notify parent component
        onAddMarker(lat, lng);
      });
    } else {
      // Tambahkan event listener untuk klik pada peta untuk menutup panel
      map.on('click', () => {
        closeAllPanels();
      });
    }
    
    mapInitialized = true;
    
    // Invalidate map size after render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Mengirimkan event dengan referensi peta untuk digunakan di komponen parent
    dispatch('mapInit', { map: {
      flyTo: (lat: number, lng: number, zoom: number) => {
        // Pastikan map sudah terinisialisasi
        if (map) {
          map.flyTo([lat, lng], zoom);
        }
      }
    }});
  }
  
  // Watch markers prop for changes
  $effect(() => {
    if (markers) {
      // Update kategori ketika markers berubah
      extractCategories();
      
      if (map && mapInitialized) {
        console.log("Updating markers on map");
        // Remove existing markers first
        mapMarkers.forEach(marker => marker.remove());
        mapMarkers = [];
        
        // Add new markers
        if (browser) {
          import('leaflet').then(L => {
            // Create custom marker icon for refreshing markers
            const customMarkerIcon = L.divIcon({
              html: `<div class="custom-marker-icon">
                <img src="/icons/location-pin.svg" width="24" height="36" alt="Marker">
              </div>`,
              className: '',
              iconSize: [24, 36],
              iconAnchor: [12, 36],
              popupAnchor: [0, -36]
            });
            
            addMarkersToMap(L, customMarkerIcon);
          });
        }
      }
    }
  });
  
  // Function untuk memotong teks dan menambahkan ellipsis jika melebihi panjang tertentu
  function truncateText(text: string | null, maxLength: number = 100): string {
    if (!text) return '';
    return text.length > maxLength 
      ? text.substring(0, maxLength).trim() + '...' 
      : text;
  }
  
  // Function to add markers to the map
  function addMarkersToMap(L: any, markerIcon: any) {
    // Gunakan filtered markers daripada semua markers
    filteredMarkers.forEach(marker => {
      // Batasi deskripsi yang ditampilkan di popup
      const truncatedDescription = truncateText(marker.description, 60);
      const truncatedTitle = truncateText(marker.title, 30);
      
      const mapMarker = L.marker([marker.latitude, marker.longitude], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div class="marker-popup-content">
            <div class="marker-popup-header">
              <h3>${truncatedTitle}</h3>
              ${marker.city ? `<div class="marker-location">📍 ${marker.city}</div>` : ''}
            </div>
            <div class="marker-popup-body">
              ${truncatedDescription ? `<p>${truncatedDescription}</p>` : ''}
              <button class="view-details-btn" data-marker-id="${marker.id}">Lihat Detail</button>
            </div>
          </div>
        `, { 
          className: 'custom-popup',
          closeButton: false,
          autoClose: true,
          closeOnEscapeKey: true,
          maxWidth: 180,
          minWidth: 180,
        });
      
      // Perbaikan event listener dengan multiple checks
      mapMarker.on('popupopen', () => {
        console.log('🔍 Popup opened for marker:', marker.id);
        
        // Multiple attempts untuk memastikan event listener terpasang
        const attempts = [0, 50, 100, 200]; // Multiple timing attempts
        
        attempts.forEach((delay, index) => {
          setTimeout(() => {
            const detailButton = document.querySelector(`[data-marker-id="${marker.id}"]`);
            if (detailButton && !detailButton.hasAttribute('data-event-attached')) {
              console.log(`✅ Attaching event listener (attempt ${index + 1}) for marker:`, marker.id);
              
              // Mark sebagai sudah di-attach
              detailButton.setAttribute('data-event-attached', 'true');
              
              // Hapus event listener lama jika ada
              const oldHandler = detailButton.cloneNode(true);
              detailButton.parentNode?.replaceChild(oldHandler, detailButton);
              
              // Tambahkan event listener baru
              const newButton = document.querySelector(`[data-marker-id="${marker.id}"]`);
              if (newButton) {
                newButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎯 Detail button clicked for marker:', marker.id);
                  openMarkerDetailPopup(marker);
                }, { once: false }); // Tidak menggunakan once agar bisa diklik berulang
              }
            }
          }, delay);
        });
      });
      
      // Backup event listener menggunakan event delegation 
      mapMarker.on('popupopen', () => {
        setTimeout(() => {
          // Event delegation sebagai backup
          document.addEventListener('click', function handleDetailClick(e) {
            const target = e.target as HTMLElement;
            if (target && target.classList.contains('view-details-btn')) {
              const markerId = target.getAttribute('data-marker-id');
              if (markerId === marker.id) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 Detail button clicked via delegation for marker:', marker.id);
                openMarkerDetailPopup(marker);
                // Remove this specific listener setelah digunakan
                document.removeEventListener('click', handleDetailClick);
              }
            }
          });
        }, 10);
      });
      
      mapMarkers.push(mapMarker);
    });
  }
  
  // Function untuk membuka popup detail marker
  function openMarkerDetailPopup(marker: MarkerData) {
    console.log('🎪 Opening detail popup for marker:', marker.id, marker.title);
    
    // Tentukan lebar dan tinggi popup
    const width = 500;
    const height = 600;
    
    // Hitung posisi tengah
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    // Format tanggal
    const createdDate = marker.createdAt ? new Date(marker.createdAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : 'Tidak diketahui';
    
    // Parse URL tautan untuk mendukung multiple URL
    let urlTautanList: {url: string, label: string}[] = [];
    if (marker.url) {
      urlTautanList = parseUrlTautan(marker.url);
    }
    
    // Deteksi tema dari aplikasi utama
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Buat HTML untuk popup
    const popupContent = `
      <!DOCTYPE html>
      <html class="${isDarkMode ? 'dark' : ''}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${marker.title} - Detail Marker</title>
        <style>
          :root {
            color-scheme: ${isDarkMode ? 'dark' : 'light'};
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: ${isDarkMode ? '#1f2937' : '#f8f9fa'};
            color: ${isDarkMode ? '#e5e7eb' : '#333'};
            transition: background-color 0.3s, color 0.3s;
          }
          
          .popup-container {
            background: ${isDarkMode ? '#111827' : 'white'};
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 100%;
          }
          
          .popup-header {
            border-bottom: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          
          h1 {
            font-size: 24px;
            margin: 0 0 8px 0;
            color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          
          .category {
            display: inline-block;
            background: ${isDarkMode ? '#1f2937' : '#f8fafc'};
            color: ${isDarkMode ? '#9ca3af' : '#374151'};
            font-size: 12px;
            padding: 2px 8px;
            border: 1px solid ${isDarkMode ? '#374151' : '#e2e8f0'};
            border-radius: 3px;
            margin-bottom: 6px;
            margin-right: 4px;
            font-weight: 400;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          
          .categories-container {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
            margin-bottom: 8px;
          }
          
          .location {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            font-size: 14px;
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          
          .description {
            margin-bottom: 20px;
            line-height: 1.6;
            text-align: justify;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          
          .meta-info {
            font-size: 13px;
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
          }
          
          .coordinates {
            font-family: monospace;
            background: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
            padding: 8px;
            border-radius: 4px;
            margin-top: 12px;
          }
          
          .image-container {
            margin: 16px 0;
            text-align: center;
          }
          
          .marker-image {
            max-width: 100%;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          
          .link-btn {
            display: inline-block;
            margin-top: 12px;
            color: ${isDarkMode ? '#60a5fa' : '#2563eb'};
            text-decoration: none;
          }
          
          .link-btn:hover {
            text-decoration: underline;
          }
          
          .link-container {
            margin: 16px 0;
            padding: 12px;
            background: ${isDarkMode ? '#1f2937' : '#f8f9fa'};
            border-radius: 6px;
            border-left: 3px solid ${isDarkMode ? '#60a5fa' : '#2563eb'};
          }
          
          .link-container h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: ${isDarkMode ? '#d1d5db' : '#374151'};
            font-weight: 600;
          }
          
          .link-container ul {
            margin: 0;
            padding: 0;
            list-style: none;
          }
          
          .link-container li {
            margin-bottom: 4px;
          }
          
          .link-container .link-btn {
            display: inline-flex;
            align-items: center;
            margin: 0;
            padding: 6px 12px;
            background: ${isDarkMode ? '#374151' : '#ffffff'};
            border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
            border-radius: 4px;
            font-size: 13px;
            transition: all 0.2s ease;
          }
          
          .link-container .link-btn:hover {
            background: ${isDarkMode ? '#4b5563' : '#f3f4f6'};
            text-decoration: none;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="popup-container">
          <div class="popup-header">
            <h1>${marker.title}</h1>
            ${marker.allCategories && marker.allCategories.length > 0 ? `
              <div class="categories-container">
                ${marker.allCategories.map(cat => `
                  <div class="category">${cat.name}</div>
                `).join('')}
              </div>
            ` : marker.category ? `<div class="category">${marker.category.name}</div>` : ''}
            <div class="location">
              ${marker.city ? `<span>📍 ${marker.city}</span>` : ''}
            </div>
          </div>
          
          <div class="description">
            ${marker.description ? `<p style="text-indent: 2em;">${marker.description}</p>` : 'Tidak ada deskripsi'}
          </div>
          
          ${marker.imageUrl ? `
            <div class="image-container">
              <img src="${marker.imageUrl}" alt="${marker.title}" class="marker-image">
            </div>
          ` : ''}
          
          ${urlTautanList.length > 0 ? `
            <div class="link-container">
              <h4>Tautan Terkait:</h4>
              <ul>
                ${urlTautanList.map(item => `
                  <li><a href="${item.url}" target="_blank" rel="noopener noreferrer" class="link-btn">${item.label}</a></li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="meta-info">
            <div>Dibuat pada: ${createdDate}</div>
            <div>Dibuat oleh: ${marker.createdBy ? marker.createdBy.username : 'Unknown'}</div>
            <div class="coordinates">
              Koordinat: ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    try {
      // Coba buka popup window
      const popup = window.open('', '_blank', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,location=no,menubar=no,toolbar=no`);
      
      if (popup && !popup.closed) {
        console.log('✅ Popup window opened successfully');
        popup.document.write(popupContent);
        popup.document.close();
        
        // Focus pada popup window
        popup.focus();
      } else {
        console.warn('⚠️ Popup window was blocked or failed to open');
        // Fallback: Tampilkan dalam modal di halaman yang sama
        showInPageModal(marker, popupContent);
      }
    } catch (error) {
      console.error('❌ Error opening popup window:', error);
      // Fallback: Tampilkan dalam modal di halaman yang sama  
      showInPageModal(marker, popupContent);
    }
  }
  
  // Fallback function untuk menampilkan detail dalam modal di halaman yang sama
  function showInPageModal(marker: MarkerData, content: string) {
    console.log('📱 Showing in-page modal as fallback');
    
    // Hapus modal yang ada jika ada
    const existingModal = document.getElementById('marker-detail-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Buat modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'marker-detail-modal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    // Buat modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    `;
    
    // Buat close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      z-index: 1;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    `;
    
    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = '#f0f0f0';
    };
    
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = 'transparent';
    };
    
    closeButton.onclick = () => {
      modalOverlay.remove();
    };
    
    // Extract body content dari HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const bodyContent = tempDiv.querySelector('body')?.innerHTML || marker.title;
    
    modalContent.innerHTML = bodyContent;
    modalContent.appendChild(closeButton);
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Close modal saat click di luar content
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.remove();
      }
    });
    
    // Close modal dengan ESC key
    document.addEventListener('keydown', function handleEsc(e) {
      if (e.key === 'Escape') {
        modalOverlay.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    });
  }
  
  // Reset peta ke tampilan default seluruh Indonesia
  function resetMapView() {
    if (map && mapInitialized) {
      // Tutup panel pencarian jika terbuka
      showSearchPanel = false;
      
      // Sesuaikan zoom berdasarkan ukuran layar (default Indonesia)
      if (useBroadView) {
        if (window.innerWidth < 640) {
          resetZoom = 5.4;
        } else if (window.innerWidth >= 640 && window.innerWidth < 1024) {
          resetZoom = 4.5;
        } else {
          resetZoom = 5.4;
        }
      } else {
        if (window.innerWidth < 640) {
          resetZoom = 5.4;
        } else if (window.innerWidth >= 640 && window.innerWidth < 1024) {
          resetZoom = 4.5;
        } else {
          resetZoom = 5.4;
        }
      }
      
      // Kembalikan ke posisi default (Seluruh Indonesia)
      map.flyTo([-2.5, 118], resetZoom, {
        duration: 1.5, // Durasi animasi dalam detik
        easeLinearity: 0.25
      });
      
      // Perbarui juga batasan minZoom setelah reset
      map.setMinZoom(resetZoom);
      
      // Tampilkan pesan sukses selama beberapa detik
      searchSuccess = 'Peta telah direset ke tampilan default';
      setTimeout(() => {
        searchSuccess = '';
      }, 3000);
    }
  }
</script>

<svelte:head>
  <!-- Hapus import CSS statis di sini karena kita menggunakan dynamic loading -->
</svelte:head>

<div class="map-container w-full h-full relative" bind:this={mapElement}>
  <!-- Pesan zoom -->
  {#if showZoomMessage}
    <div class="zoom-message-overlay">
      {#if isMobile}
        <div class="zoom-message">Gunakan dua jari untuk menggeser peta</div>
      {:else}
        <div class="zoom-message">Gunakan Ctrl + Scroll untuk zoom peta</div>
      {/if}
    </div>
  {/if}

  <!-- Map Controls - diubah menjadi vertikal -->
  <div class="map-controls-vertical {controlsPosition === 'middle' ? 'position-middle' : ''}">
    <!-- Filter Button -->
    {#if !hideFilterButton}
      <button 
        class="control-btn filter-toggle-btn" 
        on:click|stopPropagation={toggleFilterPanel} 
        aria-label="Filter lokasi berdasarkan kategori" 
        title="Filter lokasi"
      >
        <span class="control-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </span>
        {#if selectedCategoryId}
          <span class="control-active-badge"></span>
        {/if}
      </button>
    {/if}
    
    <!-- Search Button -->
    {#if !hideControls}
      <button 
        class="control-btn search-toggle-btn" 
        on:click|stopPropagation={toggleSearchPanel} 
        aria-label="Cari lokasi" 
        title="Cari lokasi"
      >
        <span class="control-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
      </button>
      
      <!-- Reset Button -->
      <button     
        class="control-btn reset-map-btn" 
        on:click|stopPropagation={resetMapView} 
        aria-label="Reset tampilan peta" 
        title="Reset peta"
      >
        <span class="control-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2v6h6"></path>
            <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
            <path d="M21 22v-6h-6"></path>
            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
          </svg>
        </span>
      </button>
    {/if}
  </div>
  
  <!-- Filter Panel -->
  {#if showFilterPanel}
    <div class="control-panel filter-panel {controlsPosition === 'middle' ? 'position-middle' : ''}" transition:slide={{ duration: 200 }} on:click|stopPropagation role="dialog" tabindex="0">
      <div class="panel-header">
        <span>Filter Berdasarkan Kategori</span>
        <button class="close-panel-btn" on:click|stopPropagation={toggleFilterPanel}>×</button>
      </div>
      
      <div class="panel-content">
        {#if availableCategories.length > 0}
          <div class="category-list">
            {#each availableCategories as category}
              <button 
                class="category-btn {selectedCategoryId === category.id ? 'active' : ''}"
                on:click|stopPropagation={() => filterMarkersByCategory(category.id)}
                title={category.name}
              >
                {truncateText(category.name, 30)}
              </button>
            {/each}
          </div>
          
          <button class="reset-filter-btn" on:click|stopPropagation={resetFilter}>
            Reset Filter
          </button>
        {:else}
          <div class="no-categories">Tidak ada kategori tersedia</div>
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- Search Panel -->
  {#if showSearchPanel}
    <div class="control-panel search-panel {controlsPosition === 'middle' ? 'position-middle' : ''}" transition:slide={{ duration: 200 }} on:click|stopPropagation role="dialog" tabindex="0">
      <div class="panel-header">
        <span>Cari Berdasarkan Lokasi</span>
        <button class="close-panel-btn" on:click|stopPropagation={toggleSearchPanel}>×</button>
      </div>
      
      <div class="panel-content">
        <div class="search-form">
          <div class="search-input-container">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Masukkan nama kota, kabupaten, atau alamat"
              class="search-input"
              on:click|stopPropagation
            />
          </div>
          
          <button 
            class="search-btn" 
            on:click|stopPropagation={searchLocation}
            disabled={isSearching}
          >
            {#if isSearching}
              <span class="search-spinner"></span>
              <span>Mencari...</span>
            {:else}
              <span>Cari</span>
            {/if}
          </button>
        </div>
        
        {#if searchError}
          <div class="search-message error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{searchError}</span>
          </div>
        {/if}
        
        {#if searchSuccess}
          <div class="search-message success">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{searchSuccess}</span>
          </div>
        {/if}
        
        <div class="search-tips">
          <h4>Tips Pencarian:</h4>
          <ul>
            <li>Masukkan nama kota/kabupaten, misal: "Surabaya" atau "Jakarta Pusat"</li>
            <li>Semakin spesifik pencarian, semakin akurat hasilnya</li>
            <li>Untuk hasil terbaik, tambahkan "Indonesia" setelah nama lokasi</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .map-container {  
    height: 100%;
    width: 100%;
    min-height: 400px; /* Lebih kecil untuk mendukung layar kecil */
    z-index: 1;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto;
    overflow: hidden;
  }
  
  :global(.leaflet-container) {
    height: 100% !important;
    width: 100% !important;
    min-height: inherit;
    margin: 0 auto;
    display: block;
  }

  /* Memastikan responsivitas pada layar berbagai ukuran */
  @media (max-width: 640px) {
    .map-container {
      min-height: 350px;
    }
  }

  @media (min-width: 641px) and (max-width: 1024px) {
    .map-container {
      min-height: 450px;
    }
  }

  @media (min-width: 1025px) {
    .map-container {
      min-height: 500px;
    }
  }

  /* Memastikan kontrol fullscreen di atas kanan */
  :global(.leaflet-control-fullscreen) {
    position: relative;
    z-index: 10;
  }
  
  /* Style untuk overlay dan pesan zoom */
  .zoom-message-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(2px);
    opacity: 1;
    transition: opacity 0.2s ease-in-out;
  }
  
  .zoom-message {
    background-color: white;
    color: #333;
    padding: 10px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    font-weight: 500;
    max-width: 90%;
    text-align: center;
  }
  
  /* Custom marker styling */
  :global(.custom-marker-icon) {
    position: relative;
    width: 24px;
    height: 36px;
  }
  
  :global(.custom-marker-icon svg) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  /* Styling baru untuk popup Leaflet - Konsisten & Rapi */
  :global(.leaflet-popup-content-wrapper) {
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
    background: white;
    width: 180px !important;
  }

  :global(.leaflet-popup-content) {
    margin: 0 !important;
    width: 180px !important;
    padding: 0;
    overflow: hidden;
  }
  
  :global(.leaflet-popup-tip) {
    background: white;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  :global(.leaflet-popup-close-button) {
    display: none !important;
  }
  
  :global(.marker-popup-content) {
    padding: 0;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  :global(.marker-popup-header) {
    background: linear-gradient(to right, #f7fafc, #edf2f7);
    padding: 10px;
    border-bottom: 1px solid #edf2f7;
    position: relative;
    box-sizing: border-box;
    width: 100%;
  }
  
  :global(.marker-popup-body) {
    padding: 10px;
    background: white;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  :global(.view-details-btn) {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 8px 0;
    margin-top: 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  :global(.view-details-btn:hover) {
    background-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  :global(.view-details-btn:active) {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  :global(.leaflet-popup-content h3) {
    margin: 0 0 4px 0;
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    box-sizing: border-box;
    max-height: 16px;
  }
  
  :global(.leaflet-popup-content .marker-category) {
    display: inline-block;
    background: #dbeafe;
    color: #2563eb;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-bottom: 4px;
    margin-right: 4px;
    font-weight: 500;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
    max-height: 16px;
  }
  
  :global(.marker-popup-content .categories-container) {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-bottom: 4px;
    max-height: 32px;
    overflow: hidden;
  }
  
  :global(.leaflet-popup-content p) {
    margin: 0;
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
    padding: 0;
    width: 100%;
    box-sizing: border-box;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 46px;
  }
  
  /* Tambahkan style global untuk popup Leaflet */
  :global(.leaflet-popup) {
    margin-bottom: 0;
    pointer-events: auto;
    width: 180px !important;
  }
  
  /* Memastikan popup memiliki animasi smooth */
  :global(.leaflet-fade-anim .leaflet-popup) {
    transition: opacity 0.25s ease;
  }
  
  /* Style untuk shadow ketika hover pada popup */
  :global(.leaflet-popup:hover .leaflet-popup-content-wrapper) {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  }
  
  /* Map Controls Style - Vertical Layout */
  .map-controls-vertical {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-color: transparent;
    padding: 6px;
  }
  
  /* Posisi alternatif untuk kontrol (di tengah kanan) */
  .map-controls-vertical.position-middle {
    bottom: 70px; /* Sedikit ke atas jika diatur di posisi tengah */
  }
  
  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: none;
    border-radius: 4px;
    padding: 8px;
    width: 36px;
    height: 36px;
    box-shadow: none;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
  }
  
  .control-btn:hover {
    background: #f3f4f6;
    box-shadow: none;
  }
  
  .control-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .control-text {
    display: none;
  }
  
  .control-active-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
  }
  
  /* Control Panel Style - Panel di sebelah kanan tombol kontrol */
  .control-panel {
    position: absolute;
    bottom: 10px;
    right: 60px; /* Posisi di sebelah kanan tombol kontrol */
    background: white;
    border-radius: 8px;
    width: 250px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    z-index: 1000;
    max-height: 50vh;
    display: flex;
    flex-direction: column;
  }
  
  /* Posisi alternatif untuk panel kontrol */
  .control-panel.position-middle {
    bottom: 70px;
  }
  
  @keyframes panelAppear {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  /* Panel untuk filter dan search */
  .filter-panel, .search-panel {
    animation: panelAppear 0.2s ease-out;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-weight: 500;
    font-size: 13px;
    flex-shrink: 0;
  }
  
  .close-panel-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
  }
  
  .panel-content {
    padding: 12px;
    overflow-y: auto;
    flex-grow: 1;
    max-height: calc(50vh - 41px); /* Menyesuaikan dengan perubahan max-height panel */
  }
  
  /* Kategori Styling */
  .category-list {
    display: flex;
    flex-direction: column;
    gap: 6px; /* Jarak antar kategori lebih rapat */
    margin-bottom: 10px;
    width: 100%;
  }
  
  .category-btn {
    text-align: left;
    padding: 6px 10px; /* Padding sedikit lebih kecil */
    background-color: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  
  .category-btn:hover {
    background-color: #e5e7eb;
  }
  
  .category-btn.active {
    background-color: #dbeafe;
    border-color: #93c5fd;
    color: #2563eb;
    font-weight: 500;
  }
  
  .reset-filter-btn {
    width: 100%;
    padding: 8px 10px;
    background-color: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 6px;
  }
  
  .reset-filter-btn:hover {
    background-color: #dc2626;
  }
  
  .no-categories {
    text-align: center;
    color: #6b7280;
    padding: 12px;
    font-size: 13px;
  }
  
  /* Search Panel Styles */
  .search-form {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }
  
  .search-input-container {
    flex: 1;
  }
  
  .search-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }
  
  .search-btn {
    white-space: nowrap;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 60px;
  }
  
  .search-btn:hover {
    background-color: #2563eb;
  }
  
  .search-btn:disabled {
    background-color: #93c5fd;
    cursor: not-allowed;
  }
  
  .search-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: 6px;
  }
  
  .search-message {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 12px;
  }
  
  .search-message.error {
    background-color: #fee2e2;
    color: #b91c1c;
  }
  
  .search-message.success {
    background-color: #dcfce7;
    color: #15803d;
  }
  
  .search-tips {
    background-color: #f8fafc;
    border-radius: 4px;
    padding: 8px;
    font-size: 12px;
    margin-top: 6px;
  }
  
  .search-tips h4 {
    font-size: 12px;
    margin: 0 0 4px 0;
    color: #475569;
  }
  
  .search-tips ul {
    margin: 0;
    padding-left: 16px;
    color: #64748b;
  }
  
  .search-tips li {
    margin-bottom: 3px;
    line-height: 1.3;
  }
  
  /* Existing styles for filter panel are now applied to both panels */
  .filter-control {
    display: none;
  }
  
  .filter-toggle-btn {
    /* Specific styles for filter button can be kept here */
  }
  
  .search-toggle-btn {
    /* Specific styles for search button */
  }
  
  .reset-map-btn {
    /* Specific styles for reset button */
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
  }
  
  .reset-map-btn:hover {
    background-color: #f3f4f6;
  }
  
  .reset-map-btn .control-icon svg {
    color: #4b5563;
  }
  
  :global(.leaflet-popup-content .marker-location) {
    display: inline-block;
    background: #f0f9ff;
    color: #0369a1;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    margin-bottom: 4px;
    font-weight: 500;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
    max-height: 16px;
  }
</style> 