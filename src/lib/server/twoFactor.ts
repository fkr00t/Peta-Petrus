import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { randomBytes, randomInt } from 'crypto';

const prisma = new PrismaClient();

// Konfigurasi 2FA
authenticator.options = {
  window: 1, // Allow 1 period before and after the current period
  step: 30   // 30 second period
};

// Fungsi untuk membuat secret 2FA baru untuk user
export async function generateTwoFactorSecret(userId: string): Promise<{ secret: string, qrCodeUrl: string }> {
  try {
    // Cek apakah user sudah memiliki secret
    const existingSecret = await prisma.twoFactorSecret.findUnique({
      where: {
        userId
      }
    });

    // Jika sudah ada dan sudah terverifikasi, kembalikan error
    if (existingSecret && existingSecret.verified) {
      throw new Error('User sudah mengaktifkan 2FA');
    }

    // Generate secret baru
    const secret = authenticator.generateSecret();
    
    // Dapatkan username user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    // Buat atau update secret di database
    if (existingSecret) {
      await prisma.twoFactorSecret.update({
        where: { id: existingSecret.id },
        data: {
          secret,
          verified: false,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.twoFactorSecret.create({
        data: {
          secret,
          userId,
          verified: false
        }
      });
    }

    // Buat otpauth URL untuk QR code
    const issuer = 'Peta Petrus';
    const otpauthUrl = authenticator.keyuri(user.username, issuer, secret);
    
    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeUrl
    };
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    throw error;
  }
}

// Fungsi untuk verifikasi kode 2FA
export async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  try {
    // Dapatkan secret user
    const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
      where: { userId }
    });

    if (!twoFactorSecret) {
      return false;
    }

    // Verifikasi token
    return authenticator.verify({ 
      token, 
      secret: twoFactorSecret.secret 
    });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
}

// Fungsi untuk mengaktifkan 2FA setelah verifikasi berhasil
export async function enableTwoFactor(userId: string): Promise<string[]> {
  try {
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const backupCodesJSON = JSON.stringify(backupCodes);

    // Update twoFactorSecret
    await prisma.twoFactorSecret.update({
      where: { userId },
      data: {
        verified: true,
        backupCodes: backupCodesJSON,
        updatedAt: new Date()
      }
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true
      }
    });

    return backupCodes;
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw error;
  }
}

// Fungsi untuk menonaktifkan 2FA
export async function disableTwoFactor(userId: string): Promise<boolean> {
  try {
    // Hapus twoFactorSecret
    await prisma.twoFactorSecret.delete({
      where: { userId }
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false
      }
    });

    return true;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return false;
  }
}

// Fungsi untuk generate backup codes
function generateBackupCodes(count = 10, length = 8): string[] {
  const codes: string[] = [];
  const possibleChars = '0123456789';
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
    }
    // Format kode menjadi XXXX-XXXX
    code = code.slice(0, 4) + '-' + code.slice(4);
    codes.push(code);
  }
  
  return codes;
}

// Fungsi untuk verifikasi backup code
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  try {
    // Dapatkan backup codes user
    const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
      where: { userId }
    });

    if (!twoFactorSecret || !twoFactorSecret.backupCodes) {
      return false;
    }

    // Parse backup codes
    const backupCodes = JSON.parse(twoFactorSecret.backupCodes) as string[];
    
    // Cek apakah kode ada dalam backup codes
    const codeIndex = backupCodes.indexOf(code);
    if (codeIndex === -1) {
      return false;
    }

    // Hapus kode yang sudah digunakan
    backupCodes.splice(codeIndex, 1);
    
    // Update backup codes
    await prisma.twoFactorSecret.update({
      where: { userId },
      data: {
        backupCodes: JSON.stringify(backupCodes)
      }
    });

    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
}

// Fungsi untuk mengecek apakah user memiliki 2FA aktif
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    });

    return user?.twoFactorEnabled || false;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
} 