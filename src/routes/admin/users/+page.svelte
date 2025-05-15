<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { fetchWithAuth } from '$lib/client/auth';
  import { sanitizeString } from '$lib/utils';
  
  // Definisi tipe data untuk User
  interface User {
    id: string;
    username: string;
    role: string;
    createdAt: string;
    twoFactorEnabled: boolean;
  }
  
  // State
  let loading = true;
  let error = '';
  let users: User[] = [];
  let currentUserRole = $page.data.user?.role || '';
  
  // Filter dan pagination
  let searchQuery = '';
  let roleFilter = 'ALL';
  let currentPage = 1;
  let totalPages = 1;
  let itemsPerPage = 10;
  
  // User yang sedang diedit
  let editingUser: User | null = null;
  let newRole = '';
  let showEditModal = false;
  let showDeleteModal = false;
  let userToDelete: User | null = null;
  
  // Tambah user
  let showAddUserModal = false;
  let newUsername = '';
  let newPassword = '';
  let newConfirmPassword = '';
  let showNewPassword = false;
  let showNewConfirmPassword = false;
  let addUserError = '';
  
  // Toggle password visibility
  function togglePasswordVisibility(field: 'new' | 'confirm') {
    if (field === 'new') showNewPassword = !showNewPassword;
    if (field === 'confirm') showNewConfirmPassword = !showNewConfirmPassword;
  }
  
  // Ambil data pengguna
  async function fetchUsers() {
    try {
      loading = true;
      error = '';
      
      const response = await fetchWithAuth('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        users = data;
      } else {
        const data = await response.json();
        error = data.message || 'Gagal mengambil data pengguna';
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      error = 'Terjadi kesalahan saat mengambil data pengguna';
    } finally {
      loading = false;
    }
  }
  
  // Filter pengguna
  function filteredUsers(): User[] {
    let filtered = [...users];
    
    // Filter berdasarkan pencarian
    if (searchQuery) {
      const query = sanitizeString(searchQuery)?.toLowerCase() || '';
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    }
    
    // Filter berdasarkan role
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    // Urutkan pengguna - ADMIN selalu di atas
    filtered.sort((a, b) => {
      // Jika salah satu adalah ADMIN, prioritaskan
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
      
      // Jika keduanya memiliki role yang sama, urutkan berdasarkan tanggal pembuatan (terbaru dulu)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Hitung total halaman
    totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return filtered.slice(startIndex, endIndex);
  }
  
  // Buka modal edit
  function openEditModal(user: User) {
    editingUser = { ...user };
    newRole = user.role;
    showEditModal = true;
  }
  
  // Buka modal hapus
  function openDeleteModal(user: User) {
    userToDelete = { ...user };
    showDeleteModal = true;
  }
  
  // Ubah role pengguna
  async function updateUserRole() {
    if (!editingUser || newRole === editingUser.role) {
      showEditModal = false;
      return;
    }
    
    try {
      loading = true;
      error = '';
      
      const response = await fetchWithAuth(`/api/users/${editingUser.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          role: newRole,
          csrf: $page.data.csrfToken
        })
      });
      
      if (response.ok) {
        // Update pengguna di state jika berhasil
        users = users.map(user => 
          user.id === editingUser?.id 
            ? { ...user, role: newRole } 
            : user
        );
        showEditModal = false;
      } else {
        const data = await response.json();
        error = data.message || 'Gagal mengubah role pengguna';
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      error = 'Terjadi kesalahan saat mengubah role pengguna';
    } finally {
      loading = false;
    }
  }
  
  // Hapus pengguna
  async function deleteUser() {
    if (!userToDelete) {
      showDeleteModal = false;
      return;
    }
    
    try {
      loading = true;
      error = '';
      
      const response = await fetchWithAuth(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          csrf: $page.data.csrfToken
        })
      });
      
      if (response.ok) {
        // Hapus pengguna dari state jika berhasil
        users = users.filter(user => user.id !== userToDelete?.id);
        showDeleteModal = false;
      } else {
        const data = await response.json();
        error = data.message || 'Gagal menghapus pengguna';
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      error = 'Terjadi kesalahan saat menghapus pengguna';
    } finally {
      loading = false;
    }
  }
  
  // Pagination
  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
    }
  }
  
  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }
  
  function goToPage(page: number) {
    currentPage = page;
  }
  
  // Buka modal tambah user
  function openAddUserModal() {
    newUsername = '';
    newPassword = '';
    newConfirmPassword = '';
    addUserError = '';
    showAddUserModal = true;
  }

  // Tambah pengguna baru
  async function addNewUser() {
    // Reset error
    addUserError = '';
    
    // Validasi input
    if (!newUsername || !newPassword || !newConfirmPassword) {
      addUserError = 'Semua field harus diisi';
      return;
    }
    
    if (newPassword !== newConfirmPassword) {
      addUserError = 'Password dan konfirmasi password tidak cocok';
      return;
    }
    
    try {
      loading = true;
      
      // Sanitasi input
      const sanitizedUsername = sanitizeString(newUsername);
      
      const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': $page.data.csrfToken || ''
        },
        body: JSON.stringify({
          username: sanitizedUsername,
          password: newPassword,
          role: 'USER', // Default role
          csrf: $page.data.csrfToken
        })
      });
      
      if (response.ok) {
        // Refresh data pengguna
        await fetchUsers();
        
        // Tutup modal
        showAddUserModal = false;
      } else {
        const data = await response.json();
        addUserError = data.message || 'Gagal menambahkan pengguna baru';
      }
    } catch (err) {
      console.error('Error adding new user:', err);
      addUserError = 'Terjadi kesalahan saat menambahkan pengguna baru';
    } finally {
      loading = false;
    }
  }
  
  // Lifecycle
  onMount(() => {
    fetchUsers();
  });
</script>

<svelte:head>
  <title>Manajemen Pengguna - Peta Petrus Admin</title>
</svelte:head>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Pengguna</h1>
    <p class="mt-1 text-gray-600 dark:text-gray-400">
      Kelola pengguna aplikasi Peta Petrus
    </p>
  </div>
  
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
      <p>{error}</p>
    </div>
  {/if}
  
  <!-- Filter dan Pencarian -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
    <div class="flex-1 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
      <!-- Search -->
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          bind:value={searchQuery}
          type="text" 
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Cari username atau ID..."
        />
      </div>
      
      <!-- Role Filter -->
      <div class="sm:w-40">
        <select 
          bind:value={roleFilter}
          class="block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ALL">Semua Role</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
      </div>
    </div>
    
    <!-- Actions - Misalnya tombol tambah pengguna -->
    <div class="flex items-center space-x-3">
      <button 
        onclick={() => openAddUserModal()}
        class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Tambah Pengguna
      </button>
      
      <button 
        onclick={() => fetchUsers()}
        class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        <svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  </div>
  
  <!-- Tabel Pengguna -->
  <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ID
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Username
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status 2FA
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Dibuat Pada
            </th>
            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {#if loading && users.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-12">
                <div class="flex justify-center">
                  <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </td>
            </tr>
          {:else if users.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                <p class="text-lg">Tidak ada data pengguna</p>
                <p class="text-sm mt-1">Coba refresh halaman atau periksa filter</p>
              </td>
            </tr>
          {:else}
            {#each filteredUsers() as user}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                  {user.id}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {user.username}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {user.role}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${user.twoFactorEnabled ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                    {user.twoFactorEnabled ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <!-- Hanya tampilkan menu edit role jika user saat ini adalah ADMIN -->
                  {#if currentUserRole === 'ADMIN' && user.id !== $page.data.user?.id}
                    <div class="flex justify-end space-x-2">
                      <button 
                        onclick={() => openEditModal(user)}
                        class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit Role
                      </button>
                      <button 
                        onclick={() => openDeleteModal(user)}
                        class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Hapus
                      </button>
                    </div>
                  {:else if user.id === $page.data.user?.id}
                    <span class="text-gray-500 dark:text-gray-400">Pengguna Saat Ini</span>
                  {:else}
                    <span class="text-gray-500 dark:text-gray-400">Tidak ada akses</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    
    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-400">
              Menampilkan <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> s/d 
              <span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredUsers().length)}</span> dari 
              <span class="font-medium">{filteredUsers().length}</span> data
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button 
                onclick={prevPage}
                class={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                disabled={currentPage === 1}
              >
                <span class="sr-only">Sebelumnya</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
              
              <!-- Page buttons -->
              {#each Array(totalPages) as _, i}
                <button 
                  onclick={() => goToPage(i + 1)}
                  class={`relative inline-flex items-center px-4 py-2 border ${currentPage === i + 1 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  {i + 1}
                </button>
              {/each}
              
              <button 
                onclick={nextPage}
                class={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                disabled={currentPage === totalPages}
              >
                <span class="sr-only">Selanjutnya</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Edit User Role Modal -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
      </div>
      
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Edit Role Pengguna
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Ubah role untuk pengguna <span class="font-medium text-gray-900 dark:text-white">{editingUser?.username}</span>
                </p>
                
                <div class="mt-4">
                  <label for="role" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select 
                    id="role"
                    bind:value={newRole}
                    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:text-white"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            type="button" 
            onclick={updateUserRole}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Simpan Perubahan
          </button>
          <button 
            type="button" 
            onclick={() => { showEditModal = false; }}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-700 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete User Modal -->
{#if showDeleteModal}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
      </div>
      
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
              <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Hapus Pengguna
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Apakah Anda yakin ingin menghapus pengguna <span class="font-medium text-gray-900 dark:text-white">{userToDelete?.username}</span>? 
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            type="button" 
            onclick={deleteUser}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Hapus
          </button>
          <button 
            type="button" 
            onclick={() => { showDeleteModal = false; }}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-700 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Add User Modal -->
{#if showAddUserModal}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Backdrop with animation -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75 backdrop-blur-sm"></div>
      </div>
      
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <!-- Modal with improved styling and animations -->
      <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border dark:border-gray-700 animate-fade-in-up">
        <!-- Header with gradient -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0 bg-white bg-opacity-20 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white">
              Tambah Pengguna Baru
            </h3>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 px-6 py-6">
          <!-- Error message with improved styling -->
          {#if addUserError}
            <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md flex items-start space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 0v6m0-6h.01M12 19c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" />
              </svg>
              <p>{addUserError}</p>
            </div>
          {/if}
          
          <!-- Form fields with improved styling -->
          <div class="space-y-5">
            <div class="group">
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Username
              </label>
              <div class="relative rounded-md">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  bind:value={newUsername}
                  class="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-white transition-all duration-200"
                  placeholder="Masukkan username"
                />
              </div>
            </div>
            
            <div class="group">
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div class="relative rounded-md">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showNewPassword ? "text" : "password"}
                  bind:value={newPassword}
                  class="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-white transition-all duration-200"
                  placeholder="Masukkan password"
                />
                <button 
                  type="button"
                  class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none"
                  onclick={() => togglePasswordVisibility('new')}
                >
                  {#if showNewPassword}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  {/if}
                </button>
              </div>
            </div>
            
            <div class="group">
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Konfirmasi Password
              </label>
              <div class="relative rounded-md">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  id="confirm-password"
                  type={showNewConfirmPassword ? "text" : "password"}
                  bind:value={newConfirmPassword}
                  class="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-white transition-all duration-200"
                  placeholder="Konfirmasi password"
                />
                <button 
                  type="button"
                  class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none"
                  onclick={() => togglePasswordVisibility('confirm')}
                >
                  {#if showNewConfirmPassword}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  {/if}
                </button>
              </div>
              <p class="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Password akan secara otomatis dienkripsi
              </p>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex sm:flex-row-reverse space-x-reverse space-x-3">
          <button 
            type="button" 
            onclick={addNewUser}
            class="flex-1 sm:flex-none justify-center inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Tambah Pengguna
          </button>
          <button 
            type="button" 
            onclick={() => { showAddUserModal = false; }}
            class="flex-1 sm:flex-none justify-center inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 