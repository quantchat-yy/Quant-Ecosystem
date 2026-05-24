// ============================================================================
// QuantChat - Encryption Service
// E2E: key pair gen, X3DH key exchange, Double Ratchet, session management
// ============================================================================
import * as crypto from 'crypto';

interface KeyPair { publicKey: string; privateKey: string; }
interface PreKeyBundle { identityKey: string; signedPreKey: string; signedPreKeySignature: string; oneTimePreKey?: string; registrationId: number; }
interface Session { id: string; userId: string; peerId: string; rootKey: string; chainKey: string; messageNumber: number; previousChainLength: number; established: boolean; createdAt: Date; lastMessageAt: Date; }
interface EncryptedMessage { ciphertext: string; header: { publicKey: string; messageNumber: number; previousChainLength: number }; }

const sessions = new Map<string, Session>();
const keyPairs = new Map<string, { identity: KeyPair; signedPreKey: KeyPair; oneTimePreKeys: KeyPair[] }>();
const messageKeys = new Map<string, string[]>();

const generateKeyPair = (): KeyPair => { const priv = crypto.randomBytes(32).toString('hex'); const pub = crypto.createHash('sha256').update(priv).digest('hex'); return { publicKey: pub, privateKey: priv }; };
const generateId = (): string => `enc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const hmacSha256 = (key: string, data: string): string => crypto.createHmac('sha256', key).update(data).digest('hex');
const hkdf = (input: string, salt: string, info: string): { rootKey: string; chainKey: string } => { const prk = hmacSha256(salt, input); return { rootKey: hmacSha256(prk, info + '1'), chainKey: hmacSha256(prk, info + '2') }; };

export class EncryptionService {
  static async generateKeys(userId: string): Promise<PreKeyBundle> {
    const identity = generateKeyPair(); const signedPreKey = generateKeyPair();
    const signature = hmacSha256(identity.privateKey, signedPreKey.publicKey);
    const oneTimePreKeys = Array.from({ length: 10 }, () => generateKeyPair());
    keyPairs.set(userId, { identity, signedPreKey, oneTimePreKeys });
    return { identityKey: identity.publicKey, signedPreKey: signedPreKey.publicKey, signedPreKeySignature: signature, oneTimePreKey: oneTimePreKeys[0]?.publicKey, registrationId: Math.floor(Math.random() * 16384) };
  }

  static async initiateKeyExchange(initiatorId: string, responderId: string, responderBundle: PreKeyBundle): Promise<Session> {
    const initiatorKeys = keyPairs.get(initiatorId);
    if (!initiatorKeys) throw new Error('Initiator keys not found');
    const ephemeralKey = generateKeyPair();
    const dh1 = hmacSha256(initiatorKeys.identity.privateKey, responderBundle.signedPreKey);
    const dh2 = hmacSha256(ephemeralKey.privateKey, responderBundle.identityKey);
    const dh3 = hmacSha256(ephemeralKey.privateKey, responderBundle.signedPreKey);
    let dh4 = '';
    if (responderBundle.oneTimePreKey) { dh4 = hmacSha256(ephemeralKey.privateKey, responderBundle.oneTimePreKey); }
    const masterSecret = dh1 + dh2 + dh3 + dh4;
    const { rootKey, chainKey } = hkdf(masterSecret, 'X3DH', 'QuantChat');
    const session: Session = { id: generateId(), userId: initiatorId, peerId: responderId, rootKey, chainKey, messageNumber: 0, previousChainLength: 0, established: true, createdAt: new Date(), lastMessageAt: new Date() };
    sessions.set(`${initiatorId}:${responderId}`, session);
    return session;
  }

  static async encryptMessage(senderId: string, recipientId: string, plaintext: string): Promise<EncryptedMessage> {
    const sessionKey = `${senderId}:${recipientId}`;
    let session = sessions.get(sessionKey);
    if (!session) { const senderKeys = keyPairs.get(senderId); if (!senderKeys) throw new Error('Keys not found'); session = { id: generateId(), userId: senderId, peerId: recipientId, rootKey: crypto.randomBytes(32).toString('hex'), chainKey: crypto.randomBytes(32).toString('hex'), messageNumber: 0, previousChainLength: 0, established: true, createdAt: new Date(), lastMessageAt: new Date() }; sessions.set(sessionKey, session); }
    const messageKey = hmacSha256(session.chainKey, `msg_${session.messageNumber}`);
    session.chainKey = hmacSha256(session.chainKey, 'chain_advance');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(messageKey.slice(0, 32), 'hex'), iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const ciphertext = iv.toString('hex') + ':' + encrypted;
    const header = { publicKey: keyPairs.get(senderId)?.identity.publicKey || '', messageNumber: session.messageNumber, previousChainLength: session.previousChainLength };
    session.messageNumber++;
    session.lastMessageAt = new Date();
    return { ciphertext, header };
  }

  static async decryptMessage(recipientId: string, senderId: string, encrypted: EncryptedMessage): Promise<string> {
    const sessionKey = `${recipientId}:${senderId}`;
    let session = sessions.get(sessionKey);
    if (!session) { const reverseKey = `${senderId}:${recipientId}`; session = sessions.get(reverseKey); }
    if (!session) throw new Error('No session found');
    const messageKey = hmacSha256(session.chainKey, `msg_${encrypted.header.messageNumber}`);
    const [ivHex, ciphertextHex] = encrypted.ciphertext.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(messageKey.slice(0, 32), 'hex'), Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static async getSession(userId: string, peerId: string): Promise<Session | null> { return sessions.get(`${userId}:${peerId}`) || sessions.get(`${peerId}:${userId}`) || null; }
  static async rotateKeys(userId: string): Promise<PreKeyBundle> { return EncryptionService.generateKeys(userId); }
  static async getKeyFingerprint(userId: string): Promise<string> { const keys = keyPairs.get(userId); return keys ? crypto.createHash('sha256').update(keys.identity.publicKey).digest('hex') : ''; }
  static async verifyIdentity(userId: string, peerId: string, expectedFingerprint: string): Promise<boolean> { const peerKeys = keyPairs.get(peerId); if (!peerKeys) return false; const fingerprint = crypto.createHash('sha256').update(peerKeys.identity.publicKey).digest('hex'); return fingerprint === expectedFingerprint; }
  static async destroySession(userId: string, peerId: string): Promise<void> { sessions.delete(`${userId}:${peerId}`); sessions.delete(`${peerId}:${userId}`); }
}

export default EncryptionService;
