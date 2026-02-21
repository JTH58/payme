// AES-256-GCM 端對端加密模組
// 使用 globalThis.crypto.subtle 確保跨環境相容 (Browser / Node / Worker)

export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;
export const PBKDF2_ITERATIONS = 100_000;

// ─── base64url helpers ──────────────────────────────────────────

export function base64urlEncode(bytes: Uint8Array): string {
  // Convert Uint8Array → binary string → standard base64 → base64url
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlDecode(str: string): Uint8Array {
  // Restore standard base64 padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(paddingNeeded);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Internal: derive AES-256 key via PBKDF2 ───────────────────

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Core: encrypt / decrypt ────────────────────────────────────

export async function encrypt(
  password: string,
  plaintext: string
): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext)
  );

  // Envelope: salt(16) + iv(12) + ciphertext
  const envelope = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + ciphertext.byteLength
  );
  envelope.set(salt, 0);
  envelope.set(iv, SALT_LENGTH);
  envelope.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return base64urlEncode(envelope);
}

export async function decrypt(
  password: string,
  blob: string
): Promise<string> {
  const bytes = base64urlDecode(blob);

  if (bytes.byteLength < SALT_LENGTH + IV_LENGTH) {
    throw new Error(
      `Invalid blob: expected at least ${SALT_LENGTH + IV_LENGTH} bytes, got ${bytes.byteLength}`
    );
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  const plainBuffer = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(plainBuffer);
}

// ─── Utility: check crypto availability ──────────────────────────

/** 檢查 Web Crypto API 是否可用（HTTP 或舊瀏覽器可能不支援） */
export function isCryptoAvailable(): boolean {
  try {
    return typeof globalThis.crypto?.subtle?.encrypt === 'function';
  } catch {
    return false;
  }
}
