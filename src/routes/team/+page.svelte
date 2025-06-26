<script lang="ts">
  import { onMount } from 'svelte';
  
  // Data anggota tim
  const teamMembers = [
    {
      name: 'Tim',
      role: 'Rian AdhiVira Prabowo',
      bio: '',
      image: '/static/team/4.jpg'
    },
    {
      name: 'Tim',
      role: 'Paduka Kanjeng Ratu Syahrin Syahfa Akhsania',
      bio: '',
      image: '/static/team/1.jpg'
    },
    {
      name: 'Tim',
      role: 'Dimas Nugroho',
      bio: '',
      image: '/static/team/2.jpg'
    },
    {
      name: 'Tim',
      role: 'Bima Arya Putranto',
      bio: '',
      image: '/static/team/6.jpg'
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


<div class="bg-white dark:bg-gray-900 py-12">
  <div class="container mx-auto px-4 max-w-4xl">
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div class="bg-gradient-to-r from-blue-900 to-indigo-800 px-6 py-8">
        <h1 class="text-3xl font-bold text-white">Tim Kami</h1>
        <p class="text-blue-100 mt-2">Projek Peta Petrus</p>
      </div>
      <div class="p-6 sm:p-8 text-gray-700 dark:text-gray-300 space-y-8">
        <div class="space-y-4">
          <p class="leading-relaxed text-base text-gray-700 dark:text-gray-300">
            Proyek dokumentasi Peta Petrus dikerjakan oleh tim yang berkomitmen untuk mengungkap kebenaran 
            dan menyediakan informasi yang akurat tentang peristiwa Penembakan Misterius (Petrus).
          </p>
        </div>
        <div>
          <div class="flex flex-wrap justify-center gap-8 mx-auto">
            {#each teamMembers as member}
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 w-full max-w-sm">
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
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6 flex items-center">
          <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 italic">
            Terakhir diperbarui:Juni 2025
          </p>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div class="flex flex-col sm:flex-row sm:justify-between items-center">
            <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium transition duration-300 mb-4 sm:mb-0">
              Kembali ke Beranda
            </a>
            <div class="flex gap-4">
              <a href="/privacy" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                Kebijakan Privasi
              </a>
              <a href="/contribute" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                Cara Berkontribusi
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Tambahan styling khusus jika diperlukan */
  .container {
    max-width: 1200px;
  }
</style>
