<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	
	interface LayoutData {
		user: { id: string; username: string; role: string } | null;
		isAdmin: boolean;
	}

	let { children, data } = $props<{ children: any; data: LayoutData }>();
	
	// Footer links
	const footerLinks = [
		{ title: 'Syarat dan Ketentuan', path: '/terms' },
		{ title: 'Kebijakan Privasi', path: '/privacy' },
		{ title: 'Cara Berkontribusi', path: '/contribute' }
	];
	
	const year = new Date().getFullYear();
</script>

<div class="flex flex-col min-h-screen bg-white dark:bg-gray-900">
	<header class="sticky top-0 z-30">
		<Navbar user={data.user} />
	</header>
	
	<main class="flex-grow relative">
		{@render children()}
	</main>
	
	<footer class="bg-gray-900 text-white py-10 border-t border-gray-800">
		<div class="container mx-auto px-4">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
				<!-- Tentang Peta Petrus -->
				<div class="col-span-1 md:col-span-2">
					<h3 class="text-xl font-semibold mb-4">Tentang Peta Petrus</h3>
					<p class="text-gray-400 mb-4 text-sm leading-relaxed">
						Projek dokumentasi interaktif peristiwa Penembakan Misterius (Petrus) 
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
				</div>
			</div>

			<div class="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
				<p class="text-gray-500 text-sm">
					&copy; {year} Peta Petrus. Hak Cipta Dilindungi.
				</p>
				<p class="text-gray-500 text-sm mt-2 md:mt-0">
					Dibuat dengan komitmen untuk kemanusiaan dan keadilan.
				</p>
			</div>
		</div>
	</footer>
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
