<script lang="ts">
    // Halaman statis untuk mode maintenance
</script>

<svelte:head>
    <title>Situs Sedang Pemeliharaan - Peta Ingatan "Petrus"</title>
    <meta name="description" content="Situs sedang dalam proses pemeliharaan. Silakan kembali beberapa saat lagi." />
</svelte:head>

<div class="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="max-w-lg w-full text-center space-y-8">
        <!-- Logo -->
        <!-- (icon dihapus) -->

        <!-- Main Content Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <!-- Title -->
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Situs Sedang Pemeliharaan
            </h1>
            
            <!-- Divider -->
            <div class="w-16 h-1 bg-blue-500 dark:bg-blue-400 mx-auto rounded-full mb-6"></div>
            
            <!-- Description -->
            <p class="text-gray-600 dark:text-gray-300 text-lg mb-6 leading-relaxed">
                Kami sedang melakukan pemeliharaan rutin untuk meningkatkan layanan. Silakan kembali beberapa saat lagi.
            </p>
            
            <!-- Status -->
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 border border-blue-100 dark:border-blue-800">
                <div class="flex items-center justify-center space-x-2 mb-2">
                    <div class="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                    <span class="text-blue-700 dark:text-blue-300 font-medium">Sedang Berlangsung</span>
                </div>
                <p class="text-blue-600 dark:text-blue-400 text-sm">
                    Estimasi selesai: 2-3 jam lagi
                </p>
            </div>
            
            <!-- Contact Info -->
            <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
                <p class="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    Butuh bantuan?
                </p>
                <a href="mailto:support@petapetrus.com" 
                   class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                    support@petapetrus.com
                </a>
            </div>
        </div>
        
        <!-- Footer -->
        <p class="text-gray-500 dark:text-gray-400 text-sm italic">
            Terima kasih atas kesabaran Anda
        </p>
    </div>
</div>