<script lang="ts">
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';

	$: ({ status, message } = $page.status === 404 
		? { status: 404, message: 'Page Not Found' }
		: { status: $page.status || 500, message: $page.error?.message || 'Something Went Wrong' });

	$: description = status === 404 
		? "The page you're looking for doesn't exist or has been moved."
		: "We're experiencing technical difficulties. Please try again later.";

	function goBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>Error {status} | Peta Petrus</title>
	<meta name="description" content="Error {status} - {message}" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
	<div 
		in:fade={{ duration: 300 }}
		class="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform transition-all hover:shadow-xl dark:shadow-gray-700/50"
	>
		<!-- Header with dynamic gradient based on error type -->
		<div class={`relative p-8 ${status === 404 ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-rose-600 to-pink-700'}`}>
			<div class="absolute inset-0 opacity-10 pattern-dots pattern-blue-500 pattern-size-4 pattern-opacity-20 dark:pattern-opacity-10"></div>
			<div class="relative z-10 flex flex-col items-center text-center space-y-4">
				<div class="flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full">
					{#if status === 404}
						<svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					{:else}
						<svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
						</svg>
					{/if}
				</div>
				<h1 class="text-5xl font-bold text-white tracking-tight">{status}</h1>
				<p class="text-xl font-medium text-white/90">{message}</p>
			</div>
		</div>

		<!-- Content -->
		<div class="p-8 space-y-6">
			<div class="text-center">
				<p class="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
				{#if status === 500}
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Our team has been notified and we're working on a fix.</p>
				{/if}
			</div>

			<!-- Action cards -->
			<div class="grid gap-4 sm:grid-cols-2">
				<a 
					href="/" 
					class="group relative p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all hover:shadow-md overflow-hidden"
				>
					<div class="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<div class="relative z-10 flex items-start">
						<div class="flex-shrink-0 mt-1 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-4">
							<svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7m-7-7v14" />
							</svg>
						</div>
						<div>
							<h3 class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Go to Homepage</h3>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Start fresh from our homepage</p>
						</div>
					</div>
				</a>

				<button 
					onclick={goBack} 
					class="group relative p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all hover:shadow-md overflow-hidden"
				>
					<div class="absolute inset-0 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<div class="relative z-10 flex items-start">
						<div class="flex-shrink-0 mt-1 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center mr-4">
							<svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
						</div>
						<div>
							<h3 class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300">Go Back</h3>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Return to previous page</p>
						</div>
					</div>
				</button>
			</div>

			<!-- Additional help for 404 -->
			{#if status === 404}
				<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">Looking for something?</h3>
							<div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
								<p>Try searching our site or check the URL for typos.</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.pattern-dots {
		background-image: radial-gradient(currentColor 1px, transparent 1px);
		background-size: 16px 16px;
	}
</style>