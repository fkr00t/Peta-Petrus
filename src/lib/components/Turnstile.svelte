<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  
  export let onVerify: (token: string) => void;
  export let onError: () => void = () => {};
  export let onExpire: () => void = () => {};
  export let size: 'normal' | 'compact' = 'normal';
  export let theme: 'light' | 'dark' | 'auto' = 'auto';
  export let id: string = 'cf-turnstile';
  
  let widget: HTMLDivElement;
  let widgetId: string | null = null;
  
  const resetCaptcha = () => {
    if (browser && widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  };
  
  onMount(() => {
    if (browser) {
      // Menambahkan script Turnstile jika belum ada
      if (!window.turnstile) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        
        script.onload = renderCaptcha;
      } else {
        renderCaptcha();
      }
      
      return () => {
        // Cleanup widget saat komponen di-unmount
        if (widgetId && window.turnstile) {
          window.turnstile.remove(widgetId);
        }
      };
    }
  });
  
  function renderCaptcha() {
    if (!widget || !window.turnstile) return;
    
    widgetId = window.turnstile.render(widget, {
      sitekey: PUBLIC_TURNSTILE_SITE_KEY,
      callback: function(token: string) {
        onVerify(token);
      },
      'expired-callback': function() {
        onExpire();
      },
      'error-callback': function() {
        onError();
      },
      size,
      theme
    });
  }
</script>

<div bind:this={widget} {id} class="w-full flex justify-center"></div>

<svelte:head>
  <!-- Tidak ada script di sini -->
</svelte:head> 