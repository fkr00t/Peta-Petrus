<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Map from '$lib/components/Map.svelte';
  
  interface Marker {
    id: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    createdAt: string;
    updatedAt: string;
    userId: string;
    createdBy?: {
      id: string;
      username: string;
    };
  }
  
  // State untuk marker
  let currentMarker: Marker | null = $state(null);
  
  // Form state - akan diisi setelah data didapatkan
  let title = $state('');
  let description = $state('');
  let latitude = $state(0);
  let longitude = $state(0);
  let markerId = $state('');
  let createdAt = $state('');
  let updatedAt = $state('');
  let createdBy = $state('');
  
  // Update state
  let isUpdating = $state(false);
  let isLoading = $state(true);
  let error = $state('');
  let success = $state('');
  let locationUpdated = $state(false);
  
  // Urutan marker untuk peta
  let markers = $derived(currentMarker ? [{
    id: currentMarker.id,
    title: title,
    description: description,
    latitude: latitude,
    longitude: longitude,
    createdAt: currentMarker.createdAt,
    updatedAt: currentMarker.updatedAt,
    userId: currentMarker.userId,
    createdBy: currentMarker.createdBy
  }] : [] as Marker[]);
  
  // Ambil parameter ID dari URL
  let id = '';
  
  onMount(() => {
    // Dapatkan ID dari URL
    const url = new URL(window.location.href);
    const pathSegments = url.pathname.split('/');
    id = pathSegments[pathSegments.length - 1];
    
    // Fetch data marker berdasarkan ID
    fetchMarkerById(id);
  });
  
  // Fungsi untuk mengambil data marker dari server
  async function fetchMarkerById(markerId: string) {
    isLoading = true;
    error = '';
    
    try {
      const response = await fetch(`/api/markers/${markerId}`);
      
      if (response.ok) {
        const marker = await response.json();
        currentMarker = marker;
        
        // Set form values
        title = marker.title;
        description = marker.description || '';
        latitude = marker.latitude;
        longitude = marker.longitude;
        markerId = marker.id;
        createdAt = marker.createdAt;
        updatedAt = marker.updatedAt;
        createdBy = marker.createdBy?.username || 'Tidak diketahui';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memuat data marker');
      }
    } catch (err: any) {
      console.error('Error fetching marker:', err);
      error = err.message || 'Terjadi kesalahan saat memuat data marker';
    } finally {
      isLoading = false;
    }
  }
  
  // Menangani klik pada peta - update koordinat
  function handleMapClick(lat: number, lng: number) {
    latitude = lat;
    longitude = lng;
    locationUpdated = true;
    
    // Reset setelah 2 detik
    setTimeout(() => {
      locationUpdated = false;
    }, 2000);
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
  
  // Submit update marker
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    // Reset error & success message
    error = '';
    success = '';
    isUpdating = true;
    
    try {
      // Validate
      if (!title.trim()) {
        throw new Error('Judul marker tidak boleh kosong');
      }
      
      if (!markerId) {
        throw new Error('ID marker tidak ditemukan');
      }
      
      const updateData = {
        title,
        description: description || null,
        latitude,
        longitude,
      };
      
      const response = await fetch(`/api/markers/${markerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        success = 'Marker berhasil diperbarui';
        // Tunggu 1 detik sebelum redirect
        setTimeout(() => {
          goto('/admin/markers/manage');
        }, 1000);
      } else {
        let errorMessage = 'Gagal memperbarui marker';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Jika tidak bisa parse JSON, gunakan pesan default
        }
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Error updating marker:', err);
      error = err.message || 'Terjadi kesalahan saat memperbarui marker';
    } finally {
      isUpdating = false;
    }
  }
  
  // Kembali ke halaman kelola marker
  function handleCancel() {
    goto('/admin/markers/manage');
  }
</script>

<svelte:head>
  <title>Peta Petrus - Edit Marker</title>
</svelte:head>

<div class="container">
  <!-- Header -->
  <header class="header">
    <div class="title-container">
      <h1 class="title">Edit Marker</h1>
      <div class="breadcrumb">
        <a href="/admin/dashboard" class="breadcrumb-link">Dashboard</a>
        <span class="breadcrumb-separator">/</span>
        <a href="/admin/markers/manage" class="breadcrumb-link">Kelola Marker</a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">Edit</span>
      </div>
    </div>
    <div class="actions">
      <button
        type="button"
        onclick={handleCancel}
        class="btn btn-outline"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Kembali
      </button>
    </div>
  </header>

  <!-- Alerts -->
  {#if error}
    <div class="alert alert-error" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{error}</span>
    </div>
  {/if}
  
  {#if success}
    <div class="alert alert-success" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>{success}</span>
    </div>
  {/if}

  {#if locationUpdated}
    <div class="alert alert-info location-updated" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span>Lokasi diperbarui: Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}</span>
    </div>
  {/if}

  <!-- Instruksi Panel -->
  <!-- <div class="info-panel">
    <div class="info-panel-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </div>
    <div class="info-panel-content">
      <h2 class="info-panel-title">Cara Menggunakan</h2>
      <ol class="instruction-list">
        <li>Klik pada peta untuk mengubah lokasi marker</li>
        <li>Isi form dengan informasi yang diinginkan</li>
        <li>Klik tombol "Simpan Perubahan" untuk menyimpan</li>
      </ol>
    </div>
  </div> -->

  <!-- Map Container -->
  <div class="map-container">
    {#if isLoading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Memuat data marker...</p>
      </div>
    {:else if error}
      <div class="error-container">
        <p>{error}</p>
        <button type="button" onclick={() => goto('/admin/markers/manage')} class="btn btn-sm">
          Kembali ke Daftar Marker
        </button>
      </div>
    {:else}
      <Map markers={markers} isAdmin={true} onAddMarker={handleMapClick} />
    {/if}
  </div>

  <!-- Content Grid -->
  <div class="content-grid">
    <!-- Form Edit Marker -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          <svg xmlns="http://www.w3.org/2000/svg" class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Informasi Marker
        </h2>
      </div>
      <div class="card-body">
        <form onsubmit={handleSubmit} class="form">
          <div class="form-group">
            <label for="title" class="form-label">Judul Marker</label>
            <input
              type="text"
              id="title"
              bind:value={title}
              class="form-input"
              placeholder="Masukkan judul marker"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="description" class="form-label">Deskripsi <span class="text-muted">(opsional)</span></label>
            <textarea
              id="description"
              bind:value={description}
              rows="3"
              class="form-input"
              placeholder="Masukkan deskripsi marker"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="latitude" class="form-label">Latitude</label>
              <input
                type="number"
                id="latitude"
                bind:value={latitude}
                step="any"
                class="form-input"
                required
                readonly
              />
            </div>
            <div class="form-group">
              <label for="longitude" class="form-label">Longitude</label>
              <input
                type="number"
                id="longitude"
                bind:value={longitude}
                step="any"
                class="form-input"
                required
                readonly
              />
            </div>
          </div>
          
          <div class="form-actions">
            <button
              type="submit"
              disabled={isUpdating}
              class="btn btn-primary"
            >
              {#if isUpdating}
                <span class="spinner"></span>
              {/if}
              Simpan Perubahan
            </button>
            <button
              type="button"
              onclick={handleCancel}
              class="btn btn-secondary"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Detail Marker -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          <svg xmlns="http://www.w3.org/2000/svg" class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Detail Marker
        </h2>
      </div>
      <div class="card-body">
        <div class="detail-grid">
          <div class="detail-label">ID</div>
          <div class="detail-value">{currentMarker?.id}</div>
          
          <div class="detail-label">Dibuat oleh</div>
          <div class="detail-value">{createdBy}</div>
          
          <div class="detail-label">Tanggal dibuat</div>
          <div class="detail-value">{formatDate(createdAt)}</div>
          
          <div class="detail-label">Terakhir diperbarui</div>
          <div class="detail-value">{formatDate(updatedAt)}</div>
        </div>

        <div class="divider"></div>
        
        <div class="coord-comparison">
          <div class="coord-card">
            <div class="coord-title">Koordinat Awal</div>
            <div class="coord-value">Lat: {currentMarker?.latitude.toFixed(6)}</div>
            <div class="coord-value">Lng: {currentMarker?.longitude.toFixed(6)}</div>
          </div>
          
          <div class="coord-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
          
          <div class="coord-card coord-card-current">
            <div class="coord-title">Koordinat Saat Ini</div>
            <div class="coord-value">Lat: {latitude.toFixed(6)}</div>
            <div class="coord-value">Lng: {longitude.toFixed(6)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* CSS Reset & Base */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  /* Container */
  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .title-container {
    display: flex;
    flex-direction: column;
  }
  
  .title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #064e3b;
    margin-bottom: 0.25rem;
  }
  
  .breadcrumb {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
  }
  
  .breadcrumb-link {
    color: #059669;
    text-decoration: none;
  }
  
  .breadcrumb-link:hover {
    text-decoration: underline;
  }
  
  .breadcrumb-separator {
    margin: 0 0.5rem;
    color: #9ca3af;
  }
  
  .breadcrumb-current {
    color: #4b5563;
    font-weight: 500;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Alerts */
  .alert {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    animation: fadeIn 0.3s ease-in-out;
  }
  
  .alert-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.75rem;
  }
  
  .alert-error {
    background-color: #fee2e2;
    color: #b91c1c;
    border-left: 4px solid #ef4444;
  }
  
  .alert-success {
    background-color: #dcfce7;
    color: #15803d;
    border-left: 4px solid #22c55e;
  }
  
  .alert-info {
    background-color: #e0f2fe;
    color: #0369a1;
    border-left: 4px solid #0ea5e9;
  }
  
  .location-updated {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  /* Map Container */
  .map-container {
    height: 60vh;
    min-height: 400px;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin-bottom: 1.5rem;
    border: 1px solid #e5e7eb;
  }
  
  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  @media (min-width: 768px) {
    .content-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  /* Card */
  .card {
    background-color: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
  }
  
  .card-header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }
  
  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    display: flex;
    align-items: center;
  }
  
  .card-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.5rem;
    color: #059669;
  }
  
  .card-body {
    padding: 1.25rem;
    flex: 1;
  }
  
  /* Form */
  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
  
  .text-muted {
    color: #6b7280;
    font-weight: normal;
  }
  
  .form-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    width: 100%;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  
  .form-input:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  }
  
  .form-input[readonly] {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
  
  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  /* Detail Styles */
  .detail-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem 1.5rem;
  }
  
  .detail-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }
  
  .detail-value {
    font-size: 0.875rem;
    color: #1f2937;
  }
  
  .divider {
    height: 1px;
    background-color: #e5e7eb;
    margin: 1.25rem 0;
  }
  
  .coord-comparison {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .coord-card {
    flex: 1;
    padding: 0.875rem;
    background-color: #f9fafb;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
  
  .coord-card-current {
    background-color: #f0fdfa;
    border-color: #99f6e4;
  }
  
  .coord-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  
  .coord-value {
    font-size: 0.75rem;
    color: #4b5563;
    font-family: monospace;
  }
  
  .coord-arrow {
    padding: 0 0.75rem;
    color: #9ca3af;
  }
  
  .coord-arrow svg {
    width: 1.5rem;
    height: 1.5rem;
  }
  
  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.375rem;
    transition: all 0.15s ease-in-out;
    cursor: pointer;
    white-space: nowrap;
  }
  
  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .btn .icon {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }
  
  .btn-primary {
    background-color: #059669;
    color: white;
    border: 1px solid transparent;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #047857;
  }
  
  .btn-secondary {
    background-color: #f3f4f6;
    color: #4b5563;
    border: 1px solid #d1d5db;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #e5e7eb;
  }
  
  .btn-outline {
    background-color: transparent;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  
  .btn-outline:hover {
    background-color: #f3f4f6;
  }
  
  /* Spinner */
  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    margin-right: 0.5rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
  }
  
  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>