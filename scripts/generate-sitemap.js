const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Konfigurasi 
const SITE_URL = 'https://petapetrus.com';
const ROUTE_DIR = path.join(__dirname, '../src/routes');
const OUTPUT_FILE = path.join(__dirname, '../static/sitemap.xml');
const DEFAULT_CHANGE_FREQ = 'weekly';
const DEFAULT_PRIORITY = '0.7';
const TODAY = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

// Exclude paths (admin, api, etc.)
const EXCLUDED_PATHS = [
  'admin', 
  'api', 
  'auth',
  'dashboard'
];

// Fungsi untuk get semua route
function getRoutes() {
  // Cari semua folder route (svelte atau server.ts)
  const routeFiles = glob.sync('**/*.(svelte|ts)', { cwd: ROUTE_DIR });
  
  // Set untuk menyimpan unique routes
  const routes = new Set();
  
  // Process each route file
  routeFiles.forEach(file => {
    // Convert file path to URL path
    let routePath = file
      .replace(/\+page\.svelte$|\+page\.server\.ts$|\+server\.ts$/g, '')
      .replace(/\[([^\]]+)\]/g, ':$1')
      .replace(/\/\+layout\..+$/, '/');
    
    // Remove index routes
    if (routePath === '') {
      routes.add('/');
      return;
    }
    
    // Check if this route should be excluded
    if (EXCLUDED_PATHS.some(excluded => routePath.startsWith(excluded))) {
      return;
    }
    
    // Add route to our set
    routes.add('/' + routePath);
  });
  
  return Array.from(routes);
}

// Buat XML untuk sitemap
function generateSitemap(routes) {
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;
  
  // Tambahkan each route
  routes.forEach(route => {
    // Set priority berdasarkan depth
    const depth = (route.match(/\//g) || []).length;
    const priority = depth === 1 ? '1.0' : depth === 2 ? '0.8' : DEFAULT_PRIORITY;
    
    // Add entry for this route
    sitemap += `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${DEFAULT_CHANGE_FREQ}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
  });
  
  // Close sitemap tag
  sitemap += '</urlset>';
  return sitemap;
}

// Main function
function main() {
  try {
    const routes = getRoutes();
    console.log(`Found ${routes.length} routes to include in sitemap`);
    
    const sitemap = generateSitemap(routes);
    fs.writeFileSync(OUTPUT_FILE, sitemap);
    
    console.log(`Sitemap generated at: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
main(); 