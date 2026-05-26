// ============================================================================
// E2E - Signal Session
// X3DH key agreement + Double Ratchet session
// ============================================================================

import * as crypto from 'node:crypto';
import type { IdentityKeyPair } from './identity-key';
import type { PreKeyBundle } from './prekey-bundle';

export interface MessageHeader {
  senderEphemeralPublicKey: string;
  previousChainLength: number;
  messageNumber: number;
}

export interface EncryptedMessage {
  header: MessageHeader;
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
}

export interface InitiatorMessage {
  identityPublicKey: crypto.KeyObject;
  ephemeralPublicKey: crypto.KeyObject;
  usedOneTimePreKeyId: number | null;
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
}

interface RatchetState {
  rootKey: Buffer;
  sendingChainKey: Buffer | null;
  receivingChainKey: Buffer | null;
  sendingRatchetKeyPair: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
  };
  receivingRatchetPublicKey: crypto.KeyObject | null;
  sendMessageNumber: number;
  receiveMessageNumber: number;
  previousChainLength: number;
}

function hkdfDerive(ikm: Buffer, salt: Buffer, info: string, length: number): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, length));
}

function deriveMessageAndNextChain(chainKey: Buffer): {
  messageKey: Buffer;
  nextChainKey: Buffer;
} {
  const messageKey = Buffer.from(
    crypto
      .createHmac('sha256', chainKey)
      .update(Buffer.from([0x01]))
      .digest(),
  );
  const nextChainKey = Buffer.from(
    crypto
      .createHmac('sha256', chainKey)
      .update(Buffer.from([0x02]))
      .digest(),
  );
  return { messageKey, nextChainKey };
}

function performDH(privateKey: crypto.KeyObject, publicKey: crypto.KeyObject): Buffer {
  return crypto.diffieHellman({ privateKey, publicKey });
}

function kdfRootKey(rootKey: Buffer, dhOutput: Buffer): { newRootKey: Buffer; chainKey: Buffer } {
  const derived = hkdfDerive(dhOutput, rootKey, 'DoubleRatchetRootKey', 64);
  return {
    newRootKey: derived.subarray(0, 32),
    chainKey: derived.subarray(32, 64),
  };
}

function serializePublicKey(key: crypto.KeyObject): string {
  const der = key.export({ type: 'spki', format: 'der' });
  return Buffer.from(der).toString('base64');
}

function deserializePublicKey(b64: string): crypto.KeyObject {
  const der = Buffer.from(b64, 'base64');
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

export class SignalSession {
  private state: RatchetState | null = null;

  /**
   * Initialize as the initiator (Alice) using X3DH with the recipient's bundle.
   */
  initializeAsInitiator(
    ownIdentity: IdentityKeyPair,
    recipientBundle: PreKeyBundle,
  ): InitiatorMessage {
    // Generate ephemeral X25519 keypair
    const ephemeral = crypto.generateKeyPairSync('x25519');

    // X3DH DH computations
    const dh1 = performDH(ephemeral.privateKey, recipientBundle.signedPreKey.keyPair.publicKey);

    let dhConcat = dh1;
    if (recipientBundle.oneTimePreKeys.length > 0) {
      const otpk = recipientBundle.oneTimePreKeys[0]!;
      const dh2 = performDH(ephemeral.privateKey, otpk.keyPair.publicKey);
      dhConcat = Buffer.concat([dh1, dh2]);
    }

    // Derive shared secret via HKDF
    const salt = Buffer.alloc(32, 0);
    const sharedSecret = hkdfDerive(dhConcat, salt, 'X3DHMasterSecret', 32);

    // The initiator's sending ratchet key is the ephemeral key itself.
    // Perform the first sending DH ratchet:
    // DH(ephemeral, signedPreKey) to get the sending chain.
    const dhSend = performDH(ephemeral.privateKey, recipientBundle.signedPreKey.keyPair.publicKey);
    const { newRootKey, chainKey: sendingChainKey } = kdfRootKey(sharedSecret, dhSend);

    this.state = {
      rootKey: newRootKey,
      sendingChainKey,
      receivingChainKey: null,
      sendingRatchetKeyPair: ephemeral,
      receivingRatchetPublicKey: null,
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
      previousChainLength: 0,
    };

    // Return initiator message (no encrypted payload needed for handshake)
    const nonce = crypto.randomBytes(12);
    const { messageKey } = deriveMessageAndNextChain(sendingChainKey);
    const cipher = crypto.createCipheriv('aes-256-gcm', messageKey.subarray(0, 32), nonce);
    const ciphertext = Buffer.concat([cipher.update(Buffer.alloc(0)), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      identityPublicKey: ownIdentity.publicKey,
      ephemeralPublicKey: ephemeral.publicKey,
      usedOneTimePreKeyId:
        recipientBundle.oneTimePreKeys.length > 0 ? recipientBundle.oneTimePreKeys[0]!.keyId : null,
      ciphertext,
      nonce,
      authTag,
    };
  }

  /**
   * Initialize as the responder (Bob).
   */
  initializeAsResponder(
    _ownIdentity: IdentityKeyPair,
    ownSignedPreKey: {
      publicKey: crypto.KeyObject;
      privateKey: crypto.KeyObject;
    },
    ownOneTimePreKey: {
      publicKey: crypto.KeyObject;
      privateKey: crypto.KeyObject;
    } | null,
    initiatorMessage: InitiatorMessage,
  ): void {
    // X3DH from responder side
    const dh1 = performDH(ownSignedPreKey.privateKey, initiatorMessage.ephemeralPublicKey);

    let dhConcat = dh1;
    if (ownOneTimePreKey) {
      const dh2 = performDH(ownOneTimePreKey.privateKey, initiatorMessage.ephemeralPublicKey);
      dhConcat = Buffer.concat([dh1, dh2]);
    }

    // Derive the same shared secret
    const salt = Buffer.alloc(32, 0);
    const sharedSecret = hkdfDerive(dhConcat, salt, 'X3DHMasterSecret', 32);

    // Mirror of initiator's DH ratchet step:
    // DH(signedPreKey, ephemeral) gives receiving chain for responder
    const dhRecv = performDH(ownSignedPreKey.privateKey, initiatorMessage.ephemeralPublicKey);
    const { newRootKey, chainKey: receivingChainKey } = kdfRootKey(sharedSecret, dhRecv);

    // Now perform the sending DH ratchet for the responder
    const sendingRatchetKeyPair = crypto.generateKeyPairSync('x25519');
    const dhSend = performDH(sendingRatchetKeyPair.privateKey, initiatorMessage.ephemeralPublicKey);
    const { newRootKey: rootKey2, chainKey: sendingChainKey } = kdfRootKey(newRootKey, dhSend);

    this.state = {
      rootKey: rootKey2,
      sendingChainKey,
      receivingChainKey,
      sendingRatchetKeyPair,
      receivingRatchetPublicKey: initiatorMessage.ephemeralPublicKey,
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
      previousChainLength: 0,
    };
  }

  /**
   * Encrypt a plaintext message using the Double Ratchet
   */
  ratchetEncrypt(plaintext: Buffer): EncryptedMessage {
    if (!this.state) {
      throw new Error('Session not initialized');
    }
    if (!this.state.sendingChainKey) {
      throw new Error('No sending chain key available');
    }

    const { messageKey, nextChainKey } = deriveMessageAndNextChain(this.state.sendingChainKey);
    this.state.sendingChainKey = nextChainKey;

    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', messageKey.subarray(0, 32), nonce);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const header: MessageHeader = {
      senderEphemeralPublicKey: serializePublicKey(this.state.sendingRatchetKeyPair.publicKey),
      previousChainLength: this.state.previousChainLength,
      messageNumber: this.state.sendMessageNumber,
    };

    this.state.sendMessageNumber++;

    return { header, ciphertext, nonce, authTag };
  }

  /**
   * Decrypt a received message using the Double Ratchet
   */
  ratchetDecrypt(
    header: MessageHeader,
    ciphertext: Buffer,
    nonce: Buffer,
    authTag: Buffer,
  ): Buffer {
    if (!this.state) {
      throw new Error('Session not initialized');
    }

    const senderPublicKey = deserializePublicKey(header.senderEphemeralPublicKey);
    const senderSerialized = header.senderEphemeralPublicKey;

    // Determine if we need a DH ratchet step
    let needsRatchet = false;
    if (!this.state.receivingRatchetPublicKey) {
      needsRatchet = true;
    } else {
      const currentSerialized = serializePublicKey(this.state.receivingRatchetPublicKey);
      if (currentSerialized !== senderSerialized) {
        needsRatchet = true;
      }
    }

    if (needsRatchet) {
      // Perform DH ratchet
      this.state.previousChainLength = this.state.sendMessageNumber;
      this.state.sendMessageNumber = 0;
      this.state.receiveMessageNumber = 0;

      // Derive new receiving chain key
      const dhRecv = performDH(this.state.sendingRatchetKeyPair.privateKey, senderPublicKey);
      const { newRootKey, chainKey: newReceivingChainKey } = kdfRootKey(this.state.rootKey, dhRecv);
      this.state.rootKey = newRootKey;
      this.state.receivingChainKey = newReceivingChainKey;
      this.state.receivingRatchetPublicKey = senderPublicKey;

      // Generate new sending ratchet key pair
      const newSendingKeyPair = crypto.generateKeyPairSync('x25519');
      const dhSend = performDH(newSendingKeyPair.privateKey, senderPublicKey);
      const { newRootKey: newRootKey2, chainKey: newSendingChainKey } = kdfRootKey(
        this.state.rootKey,
        dhSend,
      );
      this.state.rootKey = newRootKey2;
      this.state.sendingChainKey = newSendingChainKey;
      this.state.sendingRatchetKeyPair = newSendingKeyPair;
    }

    if (!this.state.receivingChainKey) {
      throw new Error('No receiving chain key available');
    }

    // Derive the message key
    const { messageKey, nextChainKey } = deriveMessageAndNextChain(this.state.receivingChainKey);
    this.state.receivingChainKey = nextChainKey;
    this.state.receiveMessageNumber++;

    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', messageKey.subarray(0, 32), nonce);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return plaintext;
  }
}
