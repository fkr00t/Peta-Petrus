import { PrismaClient } from "@prisma/client";
// Untuk menghindari masalah dengan impor dari auth.ts, kita buat fungsi hash password di sini
import * as argon2 from "argon2";

// Definisikan fungsi hash untuk seed
async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Mulai seeding data...");
    
    // Buat user admin
    const adminPassword = await hashPassword("admin");
    
    const admin = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        password: adminPassword,
        role: "ADMIN",
      },
    });
    
    console.log(`User admin berhasil dibuat: ${admin.id}`);
    
    // REKOMENDASI: Aktifkan 2FA untuk akun admin melalui UI setelah seeding untuk keamanan optimal
    // Buka /profile/2fa setelah login sebagai admin untuk mengaktifkan 2FA
    
    // Tambahkan beberapa marker contoh
    const markers = [
      {
        title: "Jakarta",
        description: "Ibukota Indonesia",
        latitude: -6.2088,
        longitude: 106.8456,
        userId: admin.id,
      },
      {
        title: "Bandung",
        description: "Kota Kembang",
        latitude: -6.9175,
        longitude: 107.6191,
        userId: admin.id,
      },
      {
        title: "Surabaya",
        description: "Kota Pahlawan",
        latitude: -7.2575,
        longitude: 112.7521,
        userId: admin.id,
      },
    ];
    
    for (const markerData of markers) {
      const marker = await prisma.marker.create({
        data: markerData,
      });
      console.log(`Marker "${marker.title}" berhasil dibuat`);
    }
    
    console.log("Seeding data selesai!");
    
  } catch (error) {
    console.error("Terjadi kesalahan saat seeding data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 