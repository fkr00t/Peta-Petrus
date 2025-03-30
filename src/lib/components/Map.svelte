<!-- Map.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  interface MarkerData {
    id: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    [key: string]: any;
  }
  
  let { markers = [], isAdmin = false, onAddMarker = (lat: number, lng: number) => {} } = $props<{
    markers?: MarkerData[];
    isAdmin?: boolean;
    onAddMarker?: (lat: number, lng: number) => void;
  }>();
  
  let mapElement: HTMLElement;
  let map: any;
  let mapMarkers: any[] = [];
  let tempMarker: any = null; // Marker sementara untuk lokasi yang baru dipilih
  let mapInitialized = false;
  
  // State untuk pesan zoom
  let showZoomMessage: boolean = $state(false);
  let zoomMessageTimeout: any = null;
  let isMobile: boolean = $state(false);
  
  // Ekspos method untuk membersihkan marker sementara
  export function clearTempMarker() {
    if (tempMarker) {
      tempMarker.remove();
      tempMarker = null;
    }
  }
  
  // Inisialisasi peta saat komponen dipasang
  onMount(async () => {
    if (browser) {
      // Cek apakah device mobile
      isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      try {
        console.log("Mounting map component...");
        
        // Dynamically import Leaflet only in browser
        const L = await import('leaflet');
        console.log("Leaflet imported successfully");
        
        // Load Leaflet fullscreen CSS
        const fullscreenCSS = document.createElement('link');
        fullscreenCSS.rel = 'stylesheet';
        fullscreenCSS.href = 'https://unpkg.com/leaflet-fullscreen@1.0.2/dist/leaflet.fullscreen.css';
        document.head.appendChild(fullscreenCSS);
        
        // Load Leaflet fullscreen plugin
        const fullscreenScript = document.createElement('script');
        fullscreenScript.src = 'https://unpkg.com/leaflet-fullscreen@1.0.2/dist/Leaflet.fullscreen.min.js';
        
        // Tunggu plugin fullscreen selesai dimuat baru inisialisasi peta
        fullscreenScript.onload = () => {
          // Tunggu beberapa saat untuk memastikan DOM dan plugin sudah dirender
          setTimeout(() => {
            initializeMap(L);
          }, 100);
        };
        
        document.head.appendChild(fullscreenScript);
        
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }
  });
  
  // Function to initialize the map
  function initializeMap(L: any) {
    if (!mapElement) {
      console.error("Map element not found");
      return;
    }
    
    console.log("Initializing map...");
    
    // Define the bounds of Java Island
    const southWest = L.latLng(-8.9, 105.0); // South-west corner of Java Island
    const northEast = L.latLng(-5.6, 116.0); // North-east corner of Java Island
    const javaBounds = L.latLngBounds(southWest, northEast);
    
    // Initialize the map centered on Java Island
    map = L.map(mapElement, {
      center: [-7.5, 110.5], // Center of Java Island
      zoom: 8,               // Zoom level to show Java Island
      minZoom: 8,            // Restrict zoom out to keep focus on Java
      maxBounds: javaBounds, // Restrict panning to Java Island
      maxBoundsViscosity: 1.0, // Make the bounds "sticky"
      zoomControl: false,    // We'll add zoom control manually to position it
      fullscreenControl: false, // Kita akan menambahkan fullscreen control secara manual
      scrollWheelZoom: false // Nonaktifkan zoom dengan scroll wheel
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
      // Nonaktifkan dragging default saat inisialisasi
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
          
          // Pastikan dragging dinonaktifkan
          map.dragging.disable();
          
          // Reset timer jika sudah ada
          if (zoomMessageTimeout) {
            clearTimeout(zoomMessageTimeout);
          }
          
          // Atur waktu pesan hilang
          zoomMessageTimeout = setTimeout(() => {
            showZoomMessage = false;
          }, 1000);
        }
      });
      
      // Tambahkan event listener untuk touchend
      mapElement.addEventListener('touchend', (e) => {
        // Jika pengguna tidak mencoba navigasi (hanya klik), jangan tampilkan pesan
        if (!isNavigating) {
          showZoomMessage = false;
        }
        
        // Jika tidak ada jari yang tersisa atau hanya satu jari, nonaktifkan dragging
        if (e.touches.length < 2) {
          map.dragging.disable();
        }
      });
    }
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add zoom control to bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);
    
    // Tambahkan kontrol fullscreen secara manual
    try {
      // Periksa apakah plugin fullscreen sudah dimuat
      if (L.control.fullscreen) {
        L.control.fullscreen({
          position: 'topright',
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
    
    // Custom red marker icon untuk penanda lokasi yang dipilih
    const redMarkerIcon = L.divIcon({
      html: `<div class="custom-marker-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="none">
            <!-- Bentuk pin merah -->
            <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 12 24 12 24s12-17.373 12-24C24 5.373 18.627 0 12 0z" fill="#FF0000"/>
            <!-- Lingkaran putih di tengah -->
            <circle cx="12" cy="12" r="6" fill="#FFFFFF"/>
          </svg>
        </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    // Add markers to the map
    addMarkersToMap(L);
    
    // Add click event if admin
    if (isAdmin) {
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Remove previous temporary marker if it exists
        if (tempMarker) {
          tempMarker.remove();
        }
        
        // Add a temporary marker at the clicked location with red marker
        tempMarker = L.marker([lat, lng], { icon: redMarkerIcon })
          .addTo(map)
          .bindPopup('Lokasi yang dipilih')
          .openPopup();
        
        // Call the callback function to notify parent component
        onAddMarker(lat, lng);
      });
    }
    
    mapInitialized = true;
    
    // Invalidate map size after render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }
  
  // Watch markers prop for changes
  $effect(() => {
    if (map && markers && mapInitialized) {
      console.log("Updating markers on map");
      // Remove existing markers first
      mapMarkers.forEach(marker => marker.remove());
      mapMarkers = [];
      
      // Add new markers
      if (browser) {
        import('leaflet').then(L => {
          addMarkersToMap(L);
        });
      }
    }
  });
  
  // Function to add markers to the map
  function addMarkersToMap(L: any) {
    markers.forEach(marker => {
      const mapMarker = L.marker([marker.latitude, marker.longitude])
        .addTo(map)
        .bindPopup(`
          <h3>${marker.title}</h3>
          <p>${marker.description || ''}</p>
        `);
      
      mapMarkers.push(mapMarker);
    });
  }
</script>

<svelte:head>
  {#if browser}
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <!-- CSS dan JS untuk fullscreen control akan dimuat secara dinamis dalam onMount -->
  {/if}
</svelte:head>

<div class="map-container w-full h-full relative" bind:this={mapElement}>
  <!-- Pesan panduan zoom -->
  {#if showZoomMessage}
    <div class="zoom-message-overlay">
      <div class="zoom-message">
        {#if isMobile}
          <p>Gunakan dua jari untuk geser dan zoom peta</p>
        {:else}
          <p>Gunakan ctrl + scroll untuk zoom peta</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .map-container {
    height: 100%;
    width: 100%;
    min-height: 500px;
    z-index: 1;
  }
  
  :global(.leaflet-container) {
    height: 100%;
    width: 100%;
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
    width: 40px;
    height: 40px;
  }
  
  :global(.custom-marker-icon svg) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style> 