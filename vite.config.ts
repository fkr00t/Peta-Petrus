import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: [],  // Tambahkan library yang bermasalah di sini
		include: ['clsx']  // Tambahkan dependencies yang perlu dioptimasi secara eksplisit
	},
	build: {
		sourcemap: true
	},
	server: {
		fs: {
			strict: false
		}
	}
});