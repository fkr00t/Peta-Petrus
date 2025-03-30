# Peta Petrus

Peta Petrus adalah aplikasi web pemetaan interaktif yang memungkinkan pengguna untuk menjelajahi dan mengelola titik-titik lokasi pada peta.

## Fitur

- Peta interaktif berbasis Leaflet
- Pengelolaan marker dengan informasi detail
- Panel admin untuk menambah, mengedit, dan menghapus marker
- Responsive design untuk berbagai ukuran layar
- Pencarian dan penyaringan marker
- Mode gelap/terang

## Teknologi

- SvelteKit
- Prisma ORM
- Leaflet Maps
- TailwindCSS
- TypeScript

## Instalasi

### Prasyarat

- Node.js (versi 16.x atau lebih baru)
- npm atau pnpm
- Database (PostgreSQL/MySQL/SQLite)

### Langkah-langkah

1. Clone repository:
   ```bash
   git clone https://github.com/username/peta-petrus.git
   cd peta-petrus
   ```

2. Install dependensi:
   ```bash
   npm install
   # atau
   pnpm install
   ```

3. Salin file konfigurasi:
   ```bash
   cp .env.example .env
   ```

4. Edit file `.env` dengan kredensial database Anda.

5. Jalankan migrasi Prisma:
   ```bash
   npx prisma migrate dev
   ```

6. Jalankan aplikasi dalam mode pengembangan:
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```

## Penggunaan

### Pengguna

- Akses aplikasi via browser di `http://localhost:5173`
- Lihat dan telusuri marker pada peta
- Klik marker untuk melihat detail informasi

### Admin

- Login sebagai admin di `/login`
- Akses panel admin di `/admin/dashboard`
- Kelola marker di `/admin/markers/manage`
- Tambah marker baru di `/admin/markers/add`
- Edit marker yang ada di `/admin/markers/edit/{id}`

## Struktur Proyek

```
peta-petrus/
├── prisma/               # Konfigurasi dan skema database
├── src/
│   ├── lib/              # Komponen dan utilitas yang dapat digunakan kembali
│   ├── routes/           # Rute dan halaman aplikasi
│   ├── app.html          # Template aplikasi
│   └── app.postcss       # Konfigurasi global CSS
├── static/               # Asset statis (gambar, favicon, dll)
├── .env.example          # Contoh konfigurasi environment
└── package.json          # Dependensi dan skrip
```

## Lisensi

[MIT License](LICENSE)

## Kontributor

- Nama Anda - Pengembang Utama
