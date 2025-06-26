<script>
  import { page } from '$app/stores';
</script>

{#if $page.data.csrfToken}
  <input type="hidden" name="csrf" value={$page.data.csrfToken} />
{/if} 