import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient untuk digunakan di seluruh aplikasi
export const prisma = new PrismaClient(); 