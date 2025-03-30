# Peta Petrus

Peta Petrus adalah aplikasi web pemetaan interaktif yang memungkinkan pengguna untuk menjelajahi dan mengelola titik-titik lokasi pada peta. Aplikasi ini menyediakan antarmuka yang intuitif untuk memvisualisasikan data geografis, dengan fokus pada penandaan lokasi beserta informasi detailnya.

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Aplikasi](#struktur-aplikasi)
- [Panduan Instalasi](#panduan-instalasi)
- [Penggunaan Aplikasi](#penggunaan-aplikasi)
- [API Endpoints](#api-endpoints)
- [Model Data](#model-data)
- [Keamanan](#keamanan)
- [Deployment](#deployment)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Fitur Utama

### Tampilan Peta dan Marker
- **Peta Interaktif**: Berbasis Leaflet, mendukung zoom, pan, dan interaksi penuh
- **Marker dengan Kategori**: Penanda lokasi dengan kategori yang dibedakan melalui ikon dan warna
- **Pop-up Informasi**: Klik marker untuk melihat detail informasi lokasi
- **Filter Marker**: Kemampuan memfilter marker berdasarkan kategori atau atribut lainnya

### Manajemen Marker (Admin)
- **Tambah Marker**: Interface untuk menambahkan lokasi baru dengan klik pada peta
- **Edit Marker**: Kemampuan mengubah informasi marker yang sudah ada
- **Hapus Marker**: Menghapus marker dari peta dan database
- **Manajemen Kategori**: Tambah, edit, dan hapus kategori marker

### Antarmuka dan UX
- **Responsive Design**: Tampilan yang optimal di desktop, tablet, dan ponsel
- **Mode Gelap/Terang**: Dukungan tema sesuai preferensi pengguna
- **Pencarian**: Fungsi pencarian marker berdasarkan judul, deskripsi, atau lokasi
- **Animasi dan Transisi**: Efek visual yang meningkatkan pengalaman pengguna

### Keamanan dan Administrasi
- **Sistem Autentikasi**: Login untuk admin dan pengguna terdaftar
- **Kontrol Akses**: Pembatasan fitur berdasarkan peran pengguna (RBAC)
- **Validasi Input**: Validasi data di client dan server untuk keamanan

## Teknologi yang Digunakan

### Frontend
- **SvelteKit**: Framework untuk pengembangan full-stack aplikasi web
- **TypeScript**: Memberikan type safety untuk codebase
- **TailwindCSS**: Utility-first CSS framework untuk styling responsif
- **Leaflet**: Library JavaScript untuk peta interaktif

### Backend
- **SvelteKit API Routes**: Server-side endpoints untuk aplikasi
- **Prisma ORM**: TypeScript ORM untuk akses database yang type-safe
- **JWT**: JSON Web Tokens untuk autentikasi dan otorisasi
- **bcrypt**: Untuk hashing password dan keamanan autentikasi

### Database
- **PostgreSQL/MySQL/SQLite**: Database relasional untuk menyimpan data aplikasi
- **Prisma Migrations**: Manajemen skema database dan migrasi

### Development Tools
- **Vite**: Build tool dan development server
- **ESLint**: Linting kode untuk menjaga kualitas dan konsistensi
- **Prettier**: Formatter kode
- **GitHub Actions**: CI/CD untuk otomatisasi build dan test

## Struktur Aplikasi

```
peta-petrus/
├── prisma/                 # Konfigurasi database
│   ├── schema.prisma       # Skema model database
│   └── seed.ts             # Script untuk mengisi data awal
├── src/
│   ├── lib/                # Kode yang dapat digunakan kembali
│   │   ├── components/     # Komponen UI Svelte
│   │   │   ├── Map.svelte  # Komponen peta utama
│   │   │   └── ...
│   │   ├── server/         # Kode server-side
│   │   │   ├── auth.ts     # Logika autentikasi
│   │   │   └── prisma.ts   # Instansiasi dan konfigurasi Prisma
│   ├── routes/             # Rute dan halaman aplikasi
│   │   ├── +layout.svelte  # Layout aplikasi umum
│   │   ├── +page.svelte    # Halaman utama dengan peta
│   │   ├── admin/          # Halaman admin
│   │   │   └── markers/    # Pengelolaan marker
│   │   └── api/            # API endpoints
│   │       ├── auth/       # Endpoint autentikasi
│   │       ├── markers/    # Endpoint untuk marker
│   │       └── categories/ # Endpoint untuk kategori
│   ├── app.html            # Template HTML utama
│   └── app.css             # Style global
├── static/                 # Asset statis
├── .github/                # Konfigurasi GitHub
│   └── workflows/          # Konfigurasi CI/CD
├── .env.example            # Contoh konfigurasi environment
└── package.json            # Dependensi dan skrip
```

## Panduan Instalasi

### Prasyarat
- Node.js (versi 16.x atau lebih baru)
- npm atau pnpm
- Database (PostgreSQL, MySQL, atau SQLite)
- Git

### Langkah-langkah Instalasi

1. **Clone repository**
   ```bash
   git clone https://github.com/username/peta-petrus.git
   cd peta-petrus
   ```

2. **Install dependensi**
   ```bash
   npm install
   # atau
   pnpm install
   ```

3. **Konfigurasi environment**
   ```bash
   cp .env.example .env
   # Edit .env dengan editor pilihan Anda
   ```

   Konfigurasi penting dalam `.env`:
   - `DATABASE_URL`: URL koneksi ke database
   - `JWT_SECRET`: String acak yang panjang untuk keamanan token
   - `PUBLIC_APP_URL`: URL aplikasi Anda

4. **Setup database dan migrasi**
   ```bash
   # Jalankan migrasi database
   npx prisma migrate dev
   
   # Opsional: Seed database dengan data awal
   npx prisma db seed
   ```

5. **Jalankan aplikasi dalam mode development**
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```
   
   Aplikasi akan tersedia di `http://localhost:5173`

## Penggunaan Aplikasi

### Bagi Pengguna Umum
1. **Melihat Peta dan Marker**
   - Buka halaman utama aplikasi
   - Gunakan kontrol zoom (+/-) untuk memperbesar/memperkecil peta
   - Klik dan geser untuk navigasi peta
   - Klik marker untuk melihat informasi detail

2. **Pencarian dan Filter**
   - Gunakan kotak pencarian untuk mencari marker berdasarkan kata kunci
   - Pilih kategori dari dropdown filter untuk memfilter marker

### Bagi Administrator

1. **Login ke Dashboard Admin**
   - Akses `/login` dan masukkan kredensial admin
   - Setelah login, akses `/admin/dashboard`

2. **Mengelola Marker**
   - Lihat daftar marker di `/admin/markers/manage`
   - Tambah marker baru di `/admin/markers/add`
     - Klik pada peta untuk memilih lokasi
     - Isi formulir dengan detail marker
     - Pilih kategori dan klik "Simpan"
   - Edit marker di `/admin/markers/edit/{id}`
   - Hapus marker dengan mengklik tombol hapus dan konfirmasi

3. **Mengelola Kategori**
   - Tambah, edit, dan hapus kategori untuk marker
   - Kustomisasi ikon dan warna untuk setiap kategori

## API Endpoints

Aplikasi menyediakan API RESTful berikut:

### Autentikasi
- `POST /api/auth/login` - Login dan mendapatkan token
- `POST /api/auth/register` - Registrasi pengguna baru (jika diizinkan)
- `GET /api/auth/logout` - Logout dan invalidasi token

### Marker
- `GET /api/markers` - Mendapatkan semua marker
- `GET /api/markers/:id` - Mendapatkan detail marker spesifik
- `POST /api/markers` - Menambahkan marker baru (perlu autentikasi)
- `PUT /api/markers/:id` - Mengupdate marker (perlu autentikasi)
- `DELETE /api/markers/:id` - Menghapus marker (perlu autentikasi)

### Kategori
- `GET /api/categories` - Mendapatkan semua kategori
- `GET /api/categories/:id` - Mendapatkan detail kategori
- `POST /api/categories` - Menambah kategori baru (admin only)
- `PUT /api/categories/:id` - Mengupdate kategori (admin only)
- `DELETE /api/categories/:id` - Menghapus kategori (admin only)

## Model Data

### User
```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String
  isAdmin   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  markers   Marker[]
}
```

### Marker
```prisma
model Marker {
  id          String    @id @default(uuid())
  title       String
  description String?
  latitude    Float
  longitude   Float
  city        String?
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  userId      String
  createdBy   User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Category
```prisma
model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  color       String?
  icon        String?
  markers     Marker[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Keamanan

### Praktik Keamanan yang Diterapkan
- **Hashing Password**: Semua password di-hash menggunakan algoritma bcrypt
- **JWT untuk Autentikasi**: Menggunakan token JWT dengan masa aktif terbatas
- **Validasi Input**: Validasi client-side dan server-side untuk semua input pengguna
- **CSRF Protection**: Perlindungan terhadap serangan Cross-Site Request Forgery
- **Role-Based Access Control**: Pembatasan akses berdasarkan peran pengguna

### Rekomendasi untuk Production
- Gunakan HTTPS untuk semua komunikasi
- Atur header keamanan seperti CSP, CORS, dan X-XSS-Protection
- Terapkan rate limiting untuk API endpoint
- Gunakan audit trail untuk operasi sensitif
- Jalankan regular security audit

## Deployment

### Persiapan Production Build
```bash
# Buat build production
npm run build

# Verifikasi build
npm run preview
```

### Opsi Deployment

#### Vercel (Disarankan)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy dengan Vercel
vercel
```

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy dengan Netlify
netlify deploy
```

#### Server Tradisional
```bash
# Build aplikasi
npm run build

# Gunakan Node.js atau adaptador lain untuk menjalankan aplikasi
node build
```

## Kontribusi

Kami sangat menghargai kontribusi dari komunitas. Berikut cara Anda dapat berkontribusi:

1. **Fork repository**
2. **Buat branch fitur**
   ```bash
   git checkout -b fitur/nama-fitur
   ```
3. **Commit perubahan**
   ```bash
   git commit -m "Menambahkan: deskripsi fitur"
   ```
4. **Push ke branch**
   ```bash
   git push origin fitur/nama-fitur
   ```
5. **Buat Pull Request**

### Panduan Kontribusi
- Pastikan kode Anda mengikuti konvensi yang ada
- Tulis test untuk fitur baru
- Update dokumentasi jika diperlukan
- Pastikan semua test lulus sebelum membuat PR

## Lisensi

[MIT License](LICENSE)

## Tim Pengembang

- Pengembang Utama - [Nama Anda](https://github.com/username)

---

*Terakhir diperbarui: [Tanggal]*
