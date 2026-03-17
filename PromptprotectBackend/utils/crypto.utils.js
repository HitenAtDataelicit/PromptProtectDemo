const crypto = require('crypto');

// Use a secure 32-byte key from environment variables or a fallback for development.
// In production, ENCRYPTION_KEY must be a 64-character hex string (32 bytes).
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : crypto.scryptSync('development-fallback-secret-do-not-use-in-prod', 'salt', 32);

const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a plain text string using AES-256-CBC.
 * @param {string} text - The plain text to encrypt.
 * @returns {string} - The initialization vector and encrypted text, separated by a colon. (e.g., "iv:encryptedText")
 */
function encrypt(text) {
    if (!text) return text;

    // Check if it's already encrypted (starts with a 32-char hex IV followed by a colon)
    if (/^[0-9a-f]{32}:/i.test(text)) {
        return text;
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an encrypted string using AES-256-CBC.
 * @param {string} text - The encrypted text format "iv:encryptedText".
 * @returns {string} - The decrypted plain text.
 */
function decrypt(text) {
    if (!text) return text;

    const textParts = text.split(':');

    // If it doesn't look like our encrypted format, just return it (could be legacy plaintext)
    if (textParts.length !== 2) {
        return text;
    }

    try {
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Decryption failed. Returning original or empty string.", error.message);
        // If decryption fails (e.g., wrong key or corrupted format), return the original string to avoid crashing, 
        // or return empty if security is paramount. Since we handle legacy plains, returning empty might break things if misidentified.
        // Returning the original string might expose it if it was somehow valid hex that failed.
        return "";
    }
}

module.exports = {
    encrypt,
    decrypt
};
