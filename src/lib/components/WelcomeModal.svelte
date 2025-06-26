<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  
  // State untuk menampilkan/menyembunyikan modal
  let showModal = true;
  
  // Dispatcher untuk event
  const dispatch = createEventDispatcher();
  
  // Function untuk menutup modal
  function closeModal() {
    showModal = false;
    dispatch('close');
  }
</script>

{#if showModal}
  <div class="modal-overlay" transition:fade={{ duration: 200 }}>
    <div class="modal-container" transition:scale={{ duration: 300, start: 0.95 }}>
      <div class="modal-header">
        <h2>Informasi</h2>
      </div>
      
      <div class="modal-content">
        <p class="quote">
          "Dengan pikiran yang jernih dan hati yang tulus, saya sebagai Kepala Negara Republik Indonesia mengakui bahwa pelanggaran hak asasi manusia yang berat memang terjadi di berbagai peristiwa. Dan, saya sangat menyesalkan terjadinya peristiwa pelanggaran hak asasi manusia yang berat pada:<br>
          [...]<br>
          Peristiwa Penembakan Misterius 1982-1985;<br>
          [...]<br>
          -Pidato Joko Widodo 11 Januari 2023"
        </p>
        
        <p class="context">
          Semangat tersebut dilanjutkan oleh pemerintahan Prabowo Subianto dimana dalam angka 1 Asta Cita menyatakan "Memperkokoh ideologi Pancasila, demokrasi, dan hak asasi manusia (HAM)".
        </p>
        
        <p class="purpose">
          Projek ini disusun untuk kepentingan pemajuan HAM dan bersifat non-komersil. Seluruh penyusunan dilakukan secara swadaya dan kolektif.
        </p>
      </div>
      
      <div class="modal-footer">
        <button class="continue-btn" onclick={closeModal}>Lanjutkan</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(3px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    padding: 20px;
  }
  
  .modal-container {
    background-color: white;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    background: linear-gradient(to right, #d00000, #9d0208);
    padding: 20px;
    color: white;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .modal-content {
    padding: 10px;
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .quote {
    font-size: 1.1rem;
    line-height: 1.6;
    background-color: #f8f9fa;
    padding: 20px;
    border-left: 4px solid #d00000;
    margin-bottom: 20px;
    font-style: italic;
  }
  
  .context, .purpose {
    line-height: 1.6;
    margin-bottom: 16px;
    color: #333;
  }
  
  .purpose {
    font-weight: 500;
  }
  
  .modal-footer {
    padding: 16px 24px;
    display: flex;
    justify-content: center;
    border-top: 1px solid #e5e7eb;
    background-color: #f8f9fa;
  }
  
  .continue-btn {
    background-color: #d00000;
    color: white;
    border: none;
    padding: 12px 28px;
    font-size: 1rem;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .continue-btn:hover {
    background-color: #9d0208;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .modal-container {
      background-color: #1f2937;
      color: #e5e7eb;
    }
    
    .modal-header {
      background: linear-gradient(to right, #9d0208, #6a040f);
    }
    
    .quote {
      background-color: #111827;
      color: #e5e7eb;
      border-left-color: #9d0208;
    }
    
    .context, .purpose {
      color: #d1d5db;
    }
    
    .modal-footer {
      background-color: #111827;
      border-top-color: #374151;
    }
    
    .continue-btn:hover {
      background-color: #6a040f;
    }
  }
  
  /* Responsive adjustments */
  @media (max-width: 600px) {
    .modal-container {
      max-width: 100%;
      height: auto;
      max-height: 90vh;
    }
    
    .modal-header h2 {
      font-size: 1.25rem;
    }
    
    .quote {
      font-size: 1rem;
      padding: 15px;
    }
  }
</style>