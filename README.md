# Peta Petrus

Peta Petrus adalah aplikasi web pemetaan interaktif yang memungkinkan pengguna untuk menjelajahi dan mengelola titik-titik lokasi peristiwa Penembakan Misterius (Petrus) pada peta. Aplikasi ini menyediakan antarmuka yang intuitif untuk memvisualisasikan data geografis tentang peristiwa-peristiwa historis tersebut, dengan fokus pada dokumentasi dan transparansi informasi.

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Aplikasi](#struktur-aplikasi)
- [Panduan Instalasi](#panduan-instalasi)
- [Konfigurasi Keamanan](#konfigurasi-keamanan)
- [Penggunaan Aplikasi](#penggunaan-aplikasi)
- [API Endpoints](#api-endpoints)
- [Model Data](#model-data)
- [Keamanan](#keamanan)
- [Deployment](#deployment)
- [Tim Pengembang](#tim-pengembang)
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
- **Sistem Autentikasi**: Login untuk admin dan pengguna terdaftar dengan JWT
- **Token Refresh**: Implementasi access token dan refresh token untuk keamanan
- **CSRF Protection**: Perlindungan terhadap serangan Cross-Site Request Forgery
- **Captcha**: Integrasi Cloudflare Turnstile untuk mencegah otomatisasi berbahaya
- **Kontrol Akses**: Pembatasan fitur berdasarkan peran pengguna (RBAC)
- **Validasi Input**: Validasi data di client dan server untuk keamanan
- **Sanitasi Input**: Sanitasi komprehensif semua input pengguna menggunakan DOMPurify untuk mencegah XSS dan injeksi

## Teknologi yang Digunakan

### Frontend
- **SvelteKit**: Framework untuk pengembangan full-stack aplikasi web
- **TypeScript**: Memberikan type safety untuk codebase
- **TailwindCSS**: Utility-first CSS framework untuk styling responsif
- **Leaflet**: Library JavaScript untuk peta interaktif
- **DOMPurify**: Library untuk sanitasi input pengguna dan mencegah XSS

### Backend
- **SvelteKit API Routes**: Server-side endpoints untuk aplikasi
- **Prisma ORM**: TypeScript ORM untuk akses database yang type-safe
- **JWT**: JSON Web Tokens untuk autentikasi dan otorisasi
- **argon2**: Untuk hashing password dan keamanan autentikasi

### Keamanan
- **Cloudflare Turnstile**: Captcha modern untuk melindungi form login dan register
- **CSRF Token**: Implementasi token CSRF untuk keamanan form dan API
- **HttpOnly Cookies**: Cookie aman untuk penyimpanan token autentikasi
- **Rate Limiting**: Pembatasan percobaan login yang gagal dengan captcha otomatis
- **DOMPurify**: Sanitasi input lengkap untuk mencegah XSS dan injeksi berbahaya
- **Validasi Tipe Data**: Validasi ketat dan pengecekan tipe data untuk setiap input

### Database
- **MySQL**: Database relasional untuk menyimpan data aplikasi
- **Prisma Migrations**: Manajemen skema database dan migrasi

### Development Tools
- **Vite**: Build tool dan development server
- **ESLint**: Linting kode untuk menjaga kualitas dan konsistensi
- **Prettier**: Formatter kode
- **Multi-environment setup**: Konfigurasi berbeda untuk development dan production

## Struktur Aplikasi

```
peta-petrus/
├── prisma/                 # Konfigurasi database
│   ├── schema.prisma       # Skema model database
│   └── migrations/         # Migrasi database
├── src/
│   ├── lib/                # Kode yang dapat digunakan kembali
│   │   ├── components/     # Komponen UI Svelte
│   │   │   ├── Map.svelte  # Komponen peta utama
│   │   │   ├── Navbar.svelte # Navigasi utama aplikasi
│   │   │   ├── Turnstile.svelte # Komponen captcha Cloudflare
│   │   │   └── ...
│   │   ├── server/         # Kode server-side
│   │   │   ├── auth.ts     # Logika autentikasi
│   │   │   ├── csrf.ts     # Proteksi CSRF
│   │   │   ├── captcha.ts  # Verifikasi captcha
│   │   │   └── prisma.ts   # Instansiasi dan konfigurasi Prisma
│   │   ├── utils/          # Utilitas umum
│   │   │   ├── sanitizer.ts # Fungsi sanitasi input
│   │   │   └── index.ts    # Ekspor fungsi utilitas
│   ├── routes/             # Rute dan halaman aplikasi
│   │   ├── +layout.svelte  # Layout aplikasi umum
│   │   ├── +page.svelte    # Halaman utama dengan peta
│   │   ├── login/          # Halaman login
│   │   ├── team/           # Halaman tim pengembang
│   │   ├── admin/          # Halaman admin
│   │   │   ├── markers/    # Pengelolaan marker
│   │   │   ├── users/      # Pengelolaan pengguna
│   │   │   └── ...
│   │   └── api/            # API endpoints
│   │       ├── auth/       # Endpoint autentikasi
│   │       ├── markers/    # Endpoint untuk marker
│   │       ├── users/      # Endpoint untuk pengguna
│   │       └── categories/ # Endpoint untuk kategori
│   ├── app.html            # Template HTML utama
│   └── app.css             # Style global
├── static/                 # Asset statis
│   ├── images/             # Gambar dan icon
│   ├── team/               # Foto tim pengembang
│   └── ...
├── .env.example            # Contoh konfigurasi environment
└── package.json            # Dependensi dan skrip
```

## Alur Kerja Aplikasi

### Alur Autentikasi
1. **Login User**
   - User mengakses halaman login
   - Memasukkan username dan password
   - Sistem memverifikasi kredensial
   - Jika valid, sistem menerbitkan access token dan refresh token
   - User diarahkan ke halaman yang sesuai dengan perannya

2. **Registrasi User (Admin Only)**
   - Hanya admin yang dapat menambahkan user baru
   - Admin mengakses halaman admin/users
   - Mengisi formulir dengan detail user baru
   - Sistem memverifikasi data dan membuat akun

### Alur Pembuatan Marker
1. **Penambahan Marker (Admin)**
   - Admin login ke sistem
   - Mengakses halaman peta atau admin/markers
   - Klik pada lokasi di peta atau tambahkan melalui form
   - Mengisi data marker (judul, deskripsi, kategori, dll)
   - Sistem menyimpan marker baru

2. **Penampilan Marker (Semua User)**
   - Marker ditampilkan pada peta
   - User dapat memfilter marker berdasarkan kategori
   - Klik pada marker menampilkan popup dengan detail

## Panduan Instalasi

### Prasyarat
- Node.js (versi 16.x atau lebih baru)
- npm atau pnpm
- MySQL Database
- Git
- Akun Cloudflare (untuk Turnstile captcha)

### Langkah-langkah Instalasi

1. **Clone repository**
   ```bash
   git clone https://gitlab.com/fkr00t/peta-petrus.git
   cd peta-petrus
   ```

2. **Install dependensi**
   ```bash
   npm install
   # atau jika menggunakan pnpm
   pnpm install
   ```

3. **Konfigurasi environment**
   ```bash
   cp .env.example .env
   # Edit .env dengan editor pilihan Anda
   ```

4. **Setup database dan migrasi**
   ```bash
   # Jalankan migrasi database
   npm run prisma:migrate
   
   # Generate Prisma client
   npm run prisma:generate
   ```

5. **Jalankan aplikasi dalam mode development**
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```
   
   Aplikasi akan tersedia di `http://localhost:5173`

## Konfigurasi Keamanan

### Environment Variables (.env)

```
# Database
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

# JWT Authentication
ACCESS_TOKEN_SECRET="your_strong_random_secret"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="your_strong_random_refresh_secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

# CSRF Protection
CSRF_SECRET="your_strong_random_csrf_secret"

# Cloudflare Turnstile
TURNSTILE_SITE_KEY="your_turnstile_site_key"
TURNSTILE_SECRET_KEY="your_turnstile_secret_key"
PUBLIC_TURNSTILE_SITE_KEY="your_turnstile_site_key"

# Application
PUBLIC_APP_URL="http://localhost:5173"
NODE_ENV="development"
```

### Mendapatkan Kunci Cloudflare Turnstile

1. Buat akun atau login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pilih menu "Security" → "Turnstile"
3. Klik "Add Site" dan ikuti langkah-langkah berikut:
   - Masukkan domain aplikasi Anda
   - Pilih mode yang sesuai:
     - Development: "Testing Only, Always Pass" (hanya untuk pengembangan)
     - Production: "Managed" atau "Non-Interactive" (untuk lingkungan produksi)
4. Salin "Site Key" dan "Secret Key" yang diberikan
5. Isi di file `.env` seperti berikut:
   ```
   TURNSTILE_SITE_KEY="your_site_key"
   TURNSTILE_SECRET_KEY="your_secret_key"
   PUBLIC_TURNSTILE_SITE_KEY="your_site_key"
   ```

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

3. **Melihat Informasi Tim**
   - Akses halaman `/team` untuk melihat informasi tentang tim pengembang

### Bagi Administrator

1. **Login ke Dashboard Admin**
   - Akses `/login` dan masukkan kredensial admin
   - Setelah login, akses halaman admin

2. **Mengelola Marker**
   - Tambah marker baru dengan mengklik pada peta
   - Isi formulir dengan detail marker
   - Pilih kategori dan klik "Simpan Marker"

3. **Mengelola Kategori**
   - Tambah, edit, dan hapus kategori untuk marker

4. **Mengelola Pengguna**
   - Tambah pengguna baru dengan mengisi formulir
   - Edit peran pengguna
   - Nonaktifkan atau hapus pengguna

## API Endpoints

Aplikasi menyediakan API RESTful berikut:

### Autentikasi
- `POST /api/auth/login` - Login dan mendapatkan token
- `POST /api/auth/register` - Registrasi pengguna baru (admin only)
- `POST /api/auth/logout` - Logout dan invalidasi token
- `POST /api/auth/refresh` - Refresh access token

### Marker
- `GET /api/markers` - Mendapatkan semua marker
- `GET /api/markers/:id` - Mendapatkan detail marker spesifik
- `POST /api/markers` - Menambahkan marker baru (perlu autentikasi)
- `PUT /api/markers/:id` - Mengupdate marker (perlu autentikasi)
- `DELETE /api/markers/:id` - Menghapus marker (perlu autentikasi)

### Kategori
- `GET /api/categories` - Mendapatkan semua kategori
- `POST /api/categories` - Menambah kategori baru (admin only)
- `PUT /api/categories/:id` - Mengupdate kategori (admin only)
- `DELETE /api/categories/:id` - Menghapus kategori (admin only)

### Pengguna
- `GET /api/users` - Mendapatkan semua pengguna (admin only)
- `POST /api/users` - Menambah pengguna baru (admin only)
- `PUT /api/users/:id` - Mengupdate informasi pengguna (admin only)
- `DELETE /api/users/:id` - Menghapus pengguna (admin only)

## Model Data

### User
```prisma
model User {
  id           String         @id @default(uuid())
  username     String         @unique
  password     String
  role         Role           @default(USER)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  markers      Marker[]
  categories   Category[]
  refreshTokens RefreshToken[]
}

enum Role {
  USER
  ADMIN
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
  imageUrl    String?
  url         String?
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
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
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  markers     Marker[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### RefreshToken
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## Keamanan

### Praktik Keamanan yang Diterapkan
- **JWT dengan Refresh Token**: Authentication system two-tier dengan access token dan refresh token
- **Hashing Password**: Semua password di-hash menggunakan algoritma argon2
- **CSRF Protection**: Token CSRF untuk semua form dan API request dengan HttpOnly cookies
- **Captcha Protection**: Cloudflare Turnstile untuk mencegah otomatisasi berbahaya
  - Wajib untuk semua registrasi
  - Kondisional untuk login (setelah 3x percobaan gagal)
- **Token Separation**: Secret terpisah untuk JWT, CSRF, dan layanan lainnya
- **Rate Limiting**: Pembatasan percobaan login untuk mencegah serangan brute force
- **Role-Based Access Control**: Pembatasan akses berdasarkan peran pengguna
- **DOMPurify Sanitization**: Implementasi komprehensif sanitasi input menggunakan DOMPurify
  - Sanitasi semua input pengguna
  - Pencegahan serangan XSS (Cross-Site Scripting)
  - Validasi URL khusus untuk mencegah URL berbahaya
  - Sanitasi rekursif untuk objek kompleks

### Rekomendasi untuk Production
- Gunakan HTTPS untuk semua komunikasi
- Atur header keamanan seperti CSP, CORS, dan X-XSS-Protection
- Gunakan audit trail untuk operasi sensitif
- Aktifkan mode "Managed" untuk Cloudflare Turnstile di lingkungan produksi
- Jalankan regular security audit dan pembaruan dependensi
- Aktifkan rate limiting di server produksi

## Deployment

### Persiapan Production Build
```bash
# Buat file .env.production
cp .env .env.production
# Edit .env.production sesuai kebutuhan produksi

# Buat build production
NODE_ENV=production npm run build

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

#### Server Tradisional
```bash
# Build aplikasi
npm run build

# Gunakan Node.js untuk menjalankan aplikasi
node build
```

## Tim Pengembang

Proyek Peta Petrus dikembangkan oleh tim yang berkomitmen untuk mendokumentasikan peristiwa Penembakan Misterius (Petrus) secara transparan dan akurat.

### Struktur Tim
- **Koordinator Proyek**: Bertanggung jawab atas koordinasi keseluruhan proyek dan memastikan tujuan dokumentasi tercapai.
- **Tim Pengembang**: Membangun dan memelihara platform digital untuk dokumentasi dan visualisasi data peristiwa Petrus.

Kunjungi halaman [Tim Kami](/team) untuk informasi lebih lanjut tentang anggota tim.

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

---

*Terakhir diperbarui: April 2024*
