<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  // Redirect otomatis ke dashboard
  onMount(() => {
    goto('/admin/dashboard');
  });
</script>

<div class="flex items-center justify-center p-8">
  <div class="text-center">
    <div
      class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"
    ></div>
    <p class="mt-2 text-emerald-700">Mengarahkan ke dashboard admin...</p>
  </div>
</div> 