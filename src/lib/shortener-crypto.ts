// 短連結加密模組 — 與 payme-shortener (s.payme.tw) 的 crypto.ts 逐位元相容
// KDF: HKDF-SHA256 (固定 salt)，Cipher: AES-256-GCM，Envelope: iv(12) + ciphertext

import { base64urlEncode, base64urlDecode } from './crypto';

const CLIENT_KEY_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CLIENT_KEY_LENGTH = 4;
const IV_LENGTH = 12;
const HKDF_SALT = 'payme-shortener-v1';
const HKDF_INFO = 'aes-256-gcm';

/** 產生 4 字元英數 clientKey（保留在 URL fragment，伺服器永遠不會看到） */
export function generateClientKey(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(CLIENT_KEY_LENGTH));
  return Array.from(bytes, (b) => CLIENT_KEY_CHARSET[b % CLIENT_KEY_CHARSET.length]).join('');
}

/** 從 clientKey 推導 AES-256-GCM 密鑰 (HKDF-SHA256) */
export async function deriveEncKey(clientKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const ikm = enc.encode(clientKey);

  const rawKey = await globalThis.crypto.subtle.importKey(
    'raw',
    ikm,
    'HKDF',
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode(HKDF_SALT),
      info: enc.encode(HKDF_INFO),
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/** AES-256-GCM 加密，回傳 base64url(iv + ciphertext) */
export async function encryptPayload(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const enc = new TextEncoder();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return base64urlEncode(combined);
}

/** AES-256-GCM 解密（測試用 round-trip） */
export async function decryptPayload(
  ciphertextB64: string,
  key: CryptoKey
): Promise<string> {
  const combined = base64urlDecode(ciphertextB64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

/** 一站式加密：產生 clientKey → 推導密鑰 → 加密 URL */
export async function encryptForShortener(url: string): Promise<{
  ciphertext: string;
  clientKey: string;
}> {
  const clientKey = generateClientKey();
  const key = await deriveEncKey(clientKey);
  const ciphertext = await encryptPayload(url, key);
  return { ciphertext, clientKey };
}
