// Encryption key and initialization vector sizes in bytes
const KEY_SIZE = 32; // 256 bits
const IV_SIZE = 12; // 96 bits for GCM mode

/**
 * Generates a random encryption key
 * @returns Promise<string>
 */
async function generateKey(): Promise<string> {
    const key = crypto.getRandomValues(new Uint8Array(KEY_SIZE));
    return Array.from(key)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Encrypts data using AES-GCM
 * @param data - Data to encrypt
 * @param keyString - Hex string key to use for encryption
 * @returns Promise<string> Base64 encoded encrypted data
 */
async function encrypt(data: string, keyString: string): Promise<string> {
    // Convert hex key string to bytes
    const key = new Uint8Array(keyString.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        'AES-GCM',
        false,
        ['encrypt']
    );

    // Convert input string to bytes
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        cryptoKey,
        dataBytes
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...result));
}

/**
 * Decrypts AES-GCM encrypted data
 * @param encryptedData - Base64 encoded encrypted data
 * @param keyString - Hex string key to use for decryption
 * @returns Promise<string> Decrypted string
 */
async function decrypt(encryptedData: string, keyString: string): Promise<string> {
    // Convert hex key string to bytes
    const key = new Uint8Array(keyString.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        'AES-GCM',
        false,
        ['decrypt']
    );

    // Convert base64 to bytes
    const data = new Uint8Array(
        atob(encryptedData)
            .split('')
            .map(c => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = data.slice(0, IV_SIZE);
    const encrypted = data.slice(IV_SIZE);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        cryptoKey,
        encrypted
    );

    // Convert bytes to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

export { generateKey, encrypt, decrypt };
