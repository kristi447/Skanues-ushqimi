// Client-side encryption for message bodies (WebCrypto, AES-256-GCM).
//
// Two independent values are derived from the access code with PBKDF2:
//   proof -> sent to the server to prove you know the code
//   key   -> never leaves the device; encrypts/decrypts every message
// The server only ever stores/sees `proof` and ciphertext, so it cannot read messages.

const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERATIONS = 250_000;

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function baseKey(code: string) {
  return crypto.subtle.importKey('raw', enc.encode(code.trim().toUpperCase()), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);
}

export async function deriveFromCode(code: string): Promise<{ proof: string; key: CryptoKey }> {
  const base = await baseKey(code);
  const pbkdf2 = (salt: string) =>
    ({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITERATIONS }) as const;

  const proofBits = await crypto.subtle.deriveBits(pbkdf2('preca-underground/v1/auth'), base, 256);
  const key = await crypto.subtle.deriveKey(
    pbkdf2('preca-underground/v1/e2ee'),
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { proof: toB64(proofBits), key };
}

/** Returns "v1.<iv>.<ciphertext>" (base64 parts). */
export async function encryptText(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return `v1.${toB64(iv)}.${toB64(ct)}`;
}

export async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  const [version, iv, ct] = payload.split('.');
  if (version !== 'v1' || !iv || !ct) throw new Error('bad payload');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct));
  return dec.decode(pt);
}
