// Client-side encryption utilities using Web Crypto API

const PBKDF2_ITERATIONS = 200000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

// Generate a random salt
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Generate a random IV for AES-GCM
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// Convert ArrayBuffer to base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

// Derive encryption key from master password using PBKDF2
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(masterPassword);

  // Import master password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a verification hash for the master password
export async function generateVerifier(
  masterPassword: string,
  salt: Uint8Array
): Promise<string> {
  const key = await deriveKey(masterPassword, salt);
  const verifierData = new TextEncoder().encode('VERIFY');
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(IV_LENGTH) },
    key,
    verifierData
  );
  return arrayBufferToBase64(encrypted);
}

// Verify master password against stored verifier
export async function verifyMasterPassword(
  masterPassword: string,
  salt: Uint8Array,
  storedVerifier: string
): Promise<boolean> {
  try {
    const key = await deriveKey(masterPassword, salt);
    const encryptedData = base64ToArrayBuffer(storedVerifier);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(IV_LENGTH) },
      key,
      encryptedData
    );
    const decoded = new TextDecoder().decode(decrypted);
    return decoded === 'VERIFY';
  } catch {
    return false;
  }
}

// Encrypt data using AES-GCM
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = generateIV();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    dataBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

// Decrypt data using AES-GCM
export async function decryptData(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedData = base64ToArrayBuffer(ciphertext);
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer as BufferSource },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decrypted);
}

// Encrypt a file (returns encrypted ArrayBuffer)
export async function encryptFile(
  file: ArrayBuffer,
  key: CryptoKey
): Promise<{ encryptedData: ArrayBuffer; iv: string }> {
  const iv = generateIV();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    file
  );

  return {
    encryptedData: encrypted,
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

// Decrypt a file
export async function decryptFile(
  encryptedData: ArrayBuffer,
  iv: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer as BufferSource },
    key,
    encryptedData
  );
}

// Generate a strong random password
export function generatePassword(
  length: number = 16,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let charset = '';
  if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

// Copy to clipboard with auto-clear
export async function secureClipboardCopy(
  text: string,
  clearAfterMs: number = 30000
): Promise<void> {
  await navigator.clipboard.writeText(text);

  if (clearAfterMs > 0) {
    setTimeout(async () => {
      const current = await navigator.clipboard.readText();
      if (current === text) {
        await navigator.clipboard.writeText('');
      }
    }, clearAfterMs);
  }
}
