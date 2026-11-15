/**
 * Cryptographic security utilities for the CareBridge Healthcare Platform.
 * PASSCODES ARE NEVER STORED IN PLAIN TEXT.
 * Uses Web Crypto API with high-entropy salting and SHA-256 hashing.
 */

export async function hashPasscode(passcode: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const chosenSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(chosenSalt + passcode + 'CareBridgeSecureSalt2026');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex, salt: chosenSalt };
}

export async function verifyPasscode(inputPasscode: string, storedHash: string, storedSalt: string): Promise<boolean> {
  if (!storedHash || !storedSalt) return false;
  const { hash } = await hashPasscode(inputPasscode, storedSalt);
  return hash === storedHash;
}

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CARE-';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  return code;
}
