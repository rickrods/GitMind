"use server"

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Ideally, this should be in your .env file as ENCRYPTION_KEY
// It must be exactly 32 bytes (256 bits) for aes-256-cbc
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string;

const IV_LENGTH = 16; // For AES, this is always 16

export async function encrypt(text: string): Promise<string> {
  if (!text) return '';
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function decrypt(text: string): Promise<string> {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return '';

    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Encryption error:", error);
    return '';
  }
}
