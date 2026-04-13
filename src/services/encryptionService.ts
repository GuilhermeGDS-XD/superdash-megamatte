import crypto from 'crypto';

/**
 * Serviço de criptografia AES-256-GCM
 * Usado para proteger access_tokens antes de salvar no banco
 */
export class EncryptionService {
  private static readonly algorithm = 'aes-256-gcm';
  
  /**
   * Chave deve ter exatamente 32 bytes para AES-256
   */
  private static getKey(): Buffer {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY não configurado no .env');
    }

    // Decodifica a chave base64 e pega os primeiros 32 bytes
    const keyBuffer = Buffer.from(encryptionKey, 'utf-8');
    
    if (keyBuffer.length < 32) {
      throw new Error('ENCRYPTION_KEY deve ter pelo menos 32 caracteres');
    }
    
    return keyBuffer.slice(0, 32);
  }

  /**
   * Criptografa um texto usando AES-256-GCM
   * Retorna no formato: iv:authTag:ciphertext (separado por :)
   */
  static encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = this.getKey();
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Formato: iv:authTag:ciphertext (separado por :)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Erro ao criptografar:', error);
      throw new Error('Falha ao criptografar dados');
    }
  }

  /**
   * Descriptografa um texto usando AES-256-GCM
   * Espera formato: iv:authTag:ciphertext
   */
  static decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Formato de ciphertext inválido');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = this.getKey();
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      throw new Error('Falha ao descriptografar dados');
    }
  }
}
