<script lang="ts">
  import { onMount } from 'svelte';
  
  // Data anggota tim
  const teamMembers = [
    {
      name: 'Koordinator Proyek',
      role: 'Koordinator',
      bio: 'Bertanggung jawab atas koordinasi keseluruhan proyek dan memastikan tujuan dokumentasi tercapai.',
      image: '/images/team/coordinator.jpg'
    },
    {
      name: 'Tim Riset',
      role: 'Peneliti',
      bio: 'Melakukan penelitian mendalam tentang peristiwa Petrus, mengumpulkan data historis, dan memverifikasi informasi.',
      image: ''
    },
    {
      name: 'Tim Pengembang',
      role: 'Developer',
      bio: 'Membangun dan memelihara platform digital untuk dokumentasi dan visualisasi data peristiwa Petrus.',
      image: '/static/team/developer.jpg'
    }
  ];
  
  // Placeholder image jika gambar tidak tersedia
  function handleImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '/images/placeholder-profile.jpg';
  }
  
  let showContactInfo = false;
  
  function toggleContactInfo() {
    showContactInfo = !showContactInfo;
  }
</script>

<svelte:head>
  <title>Tim Kami | Peta Petrus</title>
  <meta name="description" content="Kenali tim di balik proyek dokumentasi Peristiwa Penembakan Misterius (Petrus)" />
</svelte:head>

<br>
<br>
<div class="bg-white dark:bg-gray-900 py-12">
  <div class="container mx-auto px-4">
    <div class="text-center mb-16">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Tim Kami</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
        Proyek dokumentasi Peta Petrus dikerjakan oleh tim yang berkomitmen untuk mengungkap kebenaran 
        dan menyediakan informasi yang akurat tentang peristiwa Penembakan Misterius (Petrus).
      </p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each teamMembers as member}
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300">
          <div class="h-48 overflow-hidden">
            <img 
              src={member.image} 
              alt={member.name} 
              class="w-full h-full object-cover"
              on:error={handleImageError}
            />
          </div>
          <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">{member.name}</h3>
            <p class="text-sm text-blue-600 dark:text-blue-400 mb-4">{member.role}</p>
            <p class="text-gray-600 dark:text-gray-300 mb-4">{member.bio}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Tambahan styling khusus jika diperlukan */
  .container {
    max-width: 1200px;
  }
</style>
