<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import WelcomeModal from '$lib/components/WelcomeModal.svelte';
	
	interface LayoutData {
		user: { id: string; username: string; role: string } | null;
		isAdmin: boolean;
	}

	let { children, data } = $props<{ children: any; data: LayoutData }>();
	
	// Footer links
	const footerLinks = [
		{ title: 'Pengantar Peristiwa Petrus', path: '/terms' },
		{ title: 'Kebijakan Privasi', path: '/privacy' },
		{ title: 'Cara Berkontribusi', path: '/contribute' },
		{ title: 'Tim Kami', path: '/team' },
		// { title: 'Hubungi Kami', path: '/contact' }
	];
	
	const year = new Date().getFullYear();
	
	// Cek apakah halaman saat ini adalah halaman admin
	import { page } from '$app/stores';
	$effect(() => {
		// Jika URL mengandung /admin/, maka ini adalah halaman admin
		const isAdminPage = $page.url.pathname.includes('/admin/');
	});
	
	// Derived value untuk menentukan apakah menampilkan footer atau tidak
	let isAdminPage = $derived($page.url.pathname.includes('/admin/'));
	
	// Derived value untuk menentukan apakah sedang di halaman utama
	let isHomePage = $derived($page.url.pathname === '/');
</script>

<div class="flex flex-col min-h-screen bg-white dark:bg-gray-900">
	{#if isHomePage}
		<WelcomeModal />
	{/if}
	
	<header class="z-20">
		<Navbar user={data.user} />
	</header>
	
	<main class="flex-grow relative">
		{@render children()}
	</main>
	
	{#if !isAdminPage}
	<footer class="bg-gray-900 text-white py-10 border-t border-gray-800">
		<div class="container mx-auto px-4">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
				<!-- Tentang Peta Petrus -->
				<div class="col-span-1 md:col-span-2">
					<h3 class="text-xl font-semibold mb-4">Tentang Peta Ingatan "Petrus"</h3>
					<p class="text-gray-400 mb-4 text-sm leading-relaxed">
						Projek dokumentasi peristiwa Penembakan Misterius (Petrus) 
						yang telah diakui sebagai pelanggaran HAM berat masa lalu dalam Pidato Presiden Joko Widodo 
						pada 11 Januari 2023.
					</p>
					<p class="text-gray-400 text-sm leading-relaxed">
						Dikerjakan secara kolektif dan swadaya, semata-mata untuk kepentingan 
						kemanusiaan dan pendidikan.
					</p>
				</div>

				<!-- Tautan Footer -->
				<div class="col-span-1">
					<h3 class="text-xl font-semibold mb-4">Informasi Legal</h3>
					<ul class="space-y-2">
						{#each footerLinks as link}
							<li>
								<a href={link.path} class="text-gray-400 hover:text-white transition duration-300 text-sm">
									{link.title}
								</a>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Kontak -->
				<div class="col-span-1">
					<h3 class="text-xl font-semibold mb-4">Dukungan</h3>
					<p class="text-gray-400 mb-4 text-sm">
						Untuk dukungan, kontribusi, atau pertanyaan, silakan kunjungi halaman Cara Berkontribusi.
					</p>
					<a href="/contact" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-300">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						Hubungi Kami
					</a>
				</div>
			</div>

			<div class="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
				<p class="text-gray-500 text-sm">
					&copy; {year} Peta Ingatan "Petrus". Hak Cipta Dilindungi.
				</p>
				<p class="text-gray-500 text-sm mt-2 md:mt-0">
					Dibuat dengan komitmen untuk kemanusiaan dan keadilan.
				</p>
			</div>
		</div>
	</footer>
	{/if}
</div>

<style>
	:global(body, html) {
		height: 100%;
		margin: 0;
		padding: 0;
	}
	
	main {
		display: flex;
		flex-direction: column;
		min-height: 500px;
	}
</style>
