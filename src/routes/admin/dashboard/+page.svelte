<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';

  let { data } = $props<{ data: { isAdmin: boolean; user: any; totalMarkers: number; activities: any[] } }>();
  
  // State untuk statistik tambahan
  let totalUsers = $state(0);
  let totalCategories = $state(0);
  let isLoadingStats = $state(true);
  
  // State untuk chart dan analitik
  let weeklyStats = $state<any[]>([]);
  let popularCategories = $state<any[]>([]);
  let isLoadingCharts = $state(true);
  
  let linePoints = '';
  let pointCoords: {x:number, y:number}[] = [];
  let areaPoints = '';
  
  let chartCanvas: HTMLCanvasElement | null = null;
  let chartInstance: any = null;
  
  async function getChart() {
    if (!browser) return null;
    const mod = await import('chart.js/auto');
    return mod.default;
  }
  
  async function buildChart() {
    if (!chartCanvas) return;
    // destroy existing
    if (chartInstance) {
      chartInstance.destroy();
    }
    const Chart = await getChart();
    if (!Chart) return;
    const labels = weeklyStats.map(s=>s.day);
    const dataVals = weeklyStats.map(s=>s.markers);
    chartInstance = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets:[{
          label:'Marker',
          data: dataVals,
          fill:true,
          backgroundColor:'rgba(59,130,246,0.15)',
          borderColor:'#3b82f6',
          tension:0.4,
          pointRadius:3,
          pointBackgroundColor:'#fff',
          pointBorderColor:'#3b82f6',
          pointBorderWidth:1
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        scales:{
          y:{
            beginAtZero:true,
            ticks:{color:'#64748b'},
            grid:{color:'rgba(100,116,139,0.15)'}
          },
          x:{
            ticks:{color:'#64748b'},
            grid:{display:false}
          }
        },
        plugins:{
          legend:{display:false},
          tooltip:{backgroundColor:'#1e293b'}
        }
      }
    });
  }
  
  function updateChartData() {
    const maxMarkers = weeklyStats.length > 0 ? Math.max(...weeklyStats.map(s => s.markers)) || 1 : 1;
    linePoints = weeklyStats.map((s, i) => {
      const x = i * (100 / (weeklyStats.length - 1));
      const y = 100 - (s.markers / maxMarkers) * 80 - 10; // padding
      return `${x},${y}`;
    }).join(' ');
    pointCoords = weeklyStats.map((s, i) => {
      const x = i * (100 / (weeklyStats.length - 1));
      const y = 100 - (s.markers / maxMarkers) * 80 - 10;
      return { x, y };
    });
    buildChart();
  }
  
  onMount(async () => {
    await fetchAdditionalStats();
  });
  
  async function fetchAdditionalStats() {
    try {
      // Fetch total users
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        totalUsers = users.length || 0;
      }
      
      // Fetch total categories
      const categoriesResponse = await fetch('/api/categories');
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        totalCategories = categories.length || 0;
      }
      
      // Fetch real weekly stats dari markers
      await fetchWeeklyStats();
      
      // Fetch real popular categories
      await fetchPopularCategories();
      
    } catch (error) {
      console.error('Error fetching additional stats:', error);
    } finally {
      isLoadingStats = false;
      isLoadingCharts = false;
      await tick();
      buildChart();
    }
  }
  
  async function fetchWeeklyStats() {
    try {
      const response = await fetch('/api/markers');
      if (response.ok) {
        const markers = await response.json();
        
        // Buat data aktivitas mingguan berdasarkan data real
        const now = new Date();
        const weeklyData: any[] = [];
        
        // Untuk 7 hari terakhir
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          
          const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          // Hitung marker yang dibuat pada hari tersebut
          const markersCount = markers.filter((marker: any) => {
            const markerDate = new Date(marker.createdAt);
            return markerDate >= dayStart && markerDate <= dayEnd;
          }).length;
          
          weeklyData.push({
            day: dayName,
            markers: markersCount
          });
        }
        
        weeklyStats = weeklyData;
        updateChartData();
      }
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      // Fallback ke data dummy jika API gagal
      weeklyStats = [
        { day: 'Sen', markers: 0 },
        { day: 'Sel', markers: 0 },
        { day: 'Rab', markers: 0 },
        { day: 'Kam', markers: 0 },
        { day: 'Jum', markers: 0 },
        { day: 'Sab', markers: 0 },
        { day: 'Min', markers: 0 }
      ];
      updateChartData();
    }
  }
  
  async function fetchPopularCategories() {
    try {
      const [markersResponse, categoriesResponse] = await Promise.all([
        fetch('/api/markers'),
        fetch('/api/categories')
      ]);
      
      if (markersResponse.ok && categoriesResponse.ok) {
        const markers = await markersResponse.json();
        const categories = await categoriesResponse.json();
        
        // Hitung popularitas kategori berdasarkan data real
        const categoryStats = categories.map((category: any) => {
          const count = markers.filter((marker: any) => {
            return marker.allCategories?.some((cat: any) => cat.id === category.id);
          }).length;
          
          return {
            name: category.name,
            count: count,
            color: getCategoryColor(category.name)
          };
        });
        
        // Urutkan berdasarkan popularitas dan ambil top 4
        popularCategories = categoryStats
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 4);
      }
    } catch (error) {
      console.error('Error fetching popular categories:', error);
      // Fallback ke data dummy jika API gagal
      popularCategories = [
        { name: 'Belum ada data', count: 0, color: 'bg-gray-500' }
      ];
    }
  }
  
  function getCategoryColor(categoryName: string): string {
    // Mapping warna berdasarkan nama kategori
    const colorMap: Record<string, string> = {
      'Wisata': 'bg-blue-500',
      'Kuliner': 'bg-green-500',
      'Pendidikan': 'bg-purple-500',
      'Kesehatan': 'bg-red-500',
      'Olahraga': 'bg-orange-500',
      'Belanja': 'bg-pink-500',
      'Transportasi': 'bg-yellow-500',
      'Hiburan': 'bg-indigo-500'
    };
    
    return colorMap[categoryName] || `bg-${['blue', 'green', 'purple', 'red', 'orange', 'pink', 'yellow', 'indigo'][Math.floor(Math.random() * 8)]}-500`;
  }
  
  function formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }
  
  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    if (hour < 20) return 'Selamat Sore';
    return 'Selamat Malam';
  }
</script>

<svelte:head>
  <title>Peta Petrus - Dashboard Admin</title>
</svelte:head>

<!-- Main Layout dengan Background Gradient -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
  
  <!-- Header Section -->
  <div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
    <div class="container mx-auto px-4 py-4">
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div class="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
          </svg>
        </div>
        <span class="text-gray-900 dark:text-white font-medium">Dashboard Admin</span>
      </nav>

      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {data.user?.username || 'Admin'}!
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              {new Date().toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-3 mt-4 lg:mt-0">
          <a 
            href="/admin/markers/add" 
            class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg transition-all duration-200 flex items-center space-x-2 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span class="font-medium">Tambah Marker</span>
          </a>
          
          <a 
            href="/admin/markers/manage" 
            class="px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 flex items-center space-x-2 shadow-sm"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            <span class="font-medium">Kelola</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container mx-auto px-4 py-8">
    
    <!-- Stats Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <!-- Total Markers Card -->
      <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Marker</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(data.totalMarkers)}</p>
            <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              Aktif
            </p>
          </div>
          <div class="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Total Users Card -->
      <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Pengguna</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoadingStats ? '...' : formatNumber(totalUsers)}
            </p>
            <p class="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              Terdaftar
            </p>
          </div>
          <div class="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Total Categories Card -->
      <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Kategori</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoadingStats ? '...' : formatNumber(totalCategories)}
            </p>
            <p class="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Tersedia
            </p>
          </div>
          <div class="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- System Status Card -->
      <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 hover:shadow-xl transition-all duration-300 group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Status Sistem</p>
            <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400">Online</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Semua layanan berjalan</p>
          </div>
          <div class="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      <!-- Left Column - Charts and Analytics -->
      <div class="xl:col-span-2 space-y-8">
        
        <!-- Weekly Activity Chart -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Aktivitas Mingguan</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Marker yang ditambahkan 7 hari terakhir</p>
                </div>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">7 hari</div>
            </div>
          </div>
          
          <div class="p-6">
            {#if isLoadingCharts}
              <div class="flex items-center justify-center h-32">
                <div class="flex flex-col items-center">
                  <div class="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                  <span class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</span>
                </div>
              </div>
            {:else}
              <!-- Line Chart -->
              <div class="w-full h-40">
                <canvas bind:this={chartCanvas}></canvas>
              </div>
            {/if}
          </div>
        </div>

        <!-- Popular Categories -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-400/10 dark:to-emerald-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Kategori Populer</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Kategori dengan marker terbanyak</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            {#if isLoadingCharts}
              <div class="flex items-center justify-center py-12">
                <div class="flex flex-col items-center">
                  <div class="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mb-2"></div>
                  <span class="text-sm text-gray-500 dark:text-gray-400">Memuat kategori...</span>
                </div>
              </div>
            {:else}
              <div class="space-y-4">
                {#each popularCategories as category, index}
                  <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div class="flex items-center space-x-3">
                      <div class="w-3 h-3 {category.color} rounded-full"></div>
                      <span class="font-medium text-gray-900 dark:text-white">{category.name}</span>
                    </div>
                    <div class="flex items-center space-x-3">
                      <span class="text-sm text-gray-600 dark:text-gray-400">{category.count} marker</span>
                      <div class="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          class="{category.color} h-2 rounded-full transition-all duration-700"
                          style="width: {popularCategories.length > 0 ? (category.count / Math.max(...popularCategories.map((c: any) => c.count))) * 100 : 0}%"
                        ></div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Right Column - Profile and Activities -->
      <div class="xl:col-span-1 space-y-8">
        
        <!-- Admin Profile Card -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-400/10 dark:to-pink-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Profil Admin</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Informasi akun Anda</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <!-- Avatar -->
            <div class="text-center mb-6">
              <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span class="text-2xl font-bold text-white">
                  {data.user?.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">{data.user?.username || 'Admin'}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Administrator</p>
            </div>
            
            <!-- Profile Details -->
            <div class="space-y-4">
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <span class="text-sm text-gray-600 dark:text-gray-400">Role</span>
                <span class="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {data.user?.role || 'ADMIN'}
                </span>
              </div>
              
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <span class="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>
                  Online
                </span>
              </div>
              
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <span class="text-sm text-gray-600 dark:text-gray-400">Login Terakhir</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activities -->
        <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div class="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-400/10 dark:to-red-400/10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <svg class="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Aktivitas Terbaru</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Aktivitas sistem terkini</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            {#if data.activities && data.activities.length > 0}
              <div class="space-y-4">
                {#each data.activities as activity}
                  <div class="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
                    <div class="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0 mt-0.5">
                      <svg class="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                      <p class="text-xs text-gray-600 dark:text-gray-400 truncate">{activity.location}</p>
                      <div class="flex items-center space-x-2 mt-1">
                        <span class="text-xs text-gray-500 dark:text-gray-500">oleh {activity.user}</span>
                        <span class="text-xs text-gray-400 dark:text-gray-600">•</span>
                        <span class="text-xs text-gray-500 dark:text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8">
                <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-full inline-block mb-4">
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Belum ada aktivitas tercatat</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div> 