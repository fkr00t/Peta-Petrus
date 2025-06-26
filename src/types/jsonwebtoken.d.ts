/**
 * Deklarasi tambahan untuk jsonwebtoken
 * 
 * File ini dibuat untuk menghindari error TypeScript dengan jwt.sign
 */

import jwt from 'jsonwebtoken';

declare module 'jsonwebtoken' {
  // Pastikan fungsi sign menerima parameter seperti yang kita gunakan
  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string,
    options?: jwt.SignOptions
  ): string;
} 