// Deklarasi tambahan untuk sintaks Svelte modern
declare global {
    // For Svelte's typescript
    namespace svelte.JSX {
        interface HTMLAttributes<T> {
            onclick?: (event: Event) => void;
            onkeydown?: (event: KeyboardEvent) => void;
            onsubmit?: (event: SubmitEvent) => void;
        }
    }
    
    // Props data dalam $props
    interface $$ComponentProps {
        children?: any;
        data?: {
            user?: { id: string; username: string; role: string } | null;
            isAdmin?: boolean;
            marker?: any;
        };
    }
    
    // $props, $state, dan $derived
    function $props<T = any>(): T;
    function $state<T>(initialValue: T): T;
    function $derived<T>(expression: T): T;
    
    // Definisi tipe Turnstile untuk CloudFlare Turnstile
    interface TurnstileInstance {
        render: (container: HTMLElement | string, options: any) => string;
        reset: (widgetId: string) => void;
        remove: (widgetId: string) => void;
        getResponse: (widgetId: string) => string;
    }
    
    // Memperluas interface Window dengan Turnstile
    interface Window {
        turnstile?: TurnstileInstance;
    }
}

// Deklarasi modul SvelteKit
declare module '$app/navigation' {
    export function goto(url: string, options?: any): Promise<void>;
}

declare module '$app/stores' {
    import { Readable } from 'svelte/store';
    
    export const page: Readable<{
        url: URL;
        params: Record<string, string>;
        status: number;
        error: Error | null;
        data: any;
    }>;
}

// Type-check untuk svelte
declare module 'svelte' {
    export function onMount(callback: () => void | (() => void)): void;
}

// Declarasi untuk file.svelte
declare module '*.svelte' {
    import { SvelteComponent } from 'svelte';
    export default SvelteComponent;
}

export {}; 