<script lang="ts">
  let { data } = $props<{ data: { isAdmin: boolean; user: any; totalMarkers: number; activities: any[] } }>();
</script>

<div class="p-6">
  <!-- Header dengan greeting dan tanggal -->
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
    <div>
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Selamat Datang, {data.user?.username || 'Admin'}</h2>
      <p class="text-gray-600 dark:text-gray-400">Ikhtisar dan aktivitas dashboard Anda</p>
    </div>
    <div class="flex gap-3 mt-2 md:mt-0">
      <div class="bg-white dark:bg-gray-800 px-3 py-1 rounded-md shadow-sm text-gray-600 dark:text-gray-300 text-sm">
        {new Date().toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
      </div>
      <a href="/admin/markers/add" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow-sm text-sm font-medium flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Marker
      </a>
    </div>
  </div>
  
  <!-- Statistik Card -->
  <div class="mb-8">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Marker</p>
          <p class="text-2xl font-bold text-gray-800 dark:text-white">{data.totalMarkers}</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Baris Konten -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Informasi Profil -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Informasi Profil
      </h3>
      
      <div class="space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
          <span class="text-gray-600 dark:text-gray-400">Username</span>
          <span class="font-medium text-gray-800 dark:text-white">{data.user?.username || 'admin'}</span>
        </div>
        
        <div class="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
          <span class="text-gray-600 dark:text-gray-400">Role</span>
          <span class="font-medium text-blue-600 dark:text-blue-400">{data.user?.role || 'ADMIN'}</span>
        </div>
        
        <div class="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
          <span class="text-gray-600 dark:text-gray-400">Login Terakhir</span>
          <span class="font-medium text-gray-800 dark:text-white">{new Date().toLocaleString('id-ID')}</span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-gray-600 dark:text-gray-400">Status</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Aktif
          </span>
        </div>
      </div>
    </div>
    
    <!-- Aktivitas Terbaru -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:col-span-2">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Aktivitas Terbaru
      </h3>
      
      {#if data.activities && data.activities.length > 0}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900/30">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktivitas</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pengguna</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lokasi</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Waktu</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {#each data.activities as activity}
                <tr>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-300">{activity.user}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-700 dark:text-gray-300">{activity.location}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="text-center py-4 text-gray-500 dark:text-gray-400 italic">
          Belum ada aktivitas tercatat.
        </div>
      {/if}
    </div>
  </div>
</div> 