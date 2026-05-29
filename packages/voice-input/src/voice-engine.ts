import { randomBytes } from 'crypto';

import type {
  VoiceConfig,
  TranscriptionResult,
  VoiceCommand,
  VoiceSession,
  SupportedLanguage,
} from './types.js';

export class VoiceEngine {
  private config: VoiceConfig;
  private sessions: Map<string, VoiceSession>;
  private commands: Map<string, VoiceCommand>;
  private supportedLanguages: SupportedLanguage[];
  private activeSessionId: string | null;

  constructor(config?: Partial<VoiceConfig>) {
    this.config = {
      language: config?.language ?? 'en-US',
      sampleRate: config?.sampleRate ?? 16000,
      channels: config?.channels ?? 1,
      noiseCancellation: config?.noiseCancellation ?? true,
      autoGainControl: config?.autoGainControl ?? true,
      echoCancellation: config?.echoCancellation ?? true,
      vadEnabled: config?.vadEnabled ?? true,
      vadThreshold: config?.vadThreshold ?? 0.5,
      continuous: config?.continuous ?? true,
      interimResults: config?.interimResults ?? true,
    };
    this.sessions = new Map();
    this.commands = new Map();
    this.activeSessionId = null;
    this.supportedLanguages = [
      { code: 'en-US', name: 'English (US)', nativeName: 'English', supported: true },
      { code: 'en-GB', name: 'English (UK)', nativeName: 'English', supported: true },
      { code: 'es-ES', name: 'Spanish', nativeName: 'Espanol', supported: true },
      { code: 'fr-FR', name: 'French', nativeName: 'Francais', supported: true },
      { code: 'de-DE', name: 'German', nativeName: 'Deutsch', supported: true },
      { code: 'ja-JP', name: 'Japanese', nativeName: 'Nihongo', supported: true },
      { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: 'Zhongwen', supported: true },
      { code: 'ko-KR', name: 'Korean', nativeName: 'Hangugeo', supported: true },
      { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Portugues', supported: true },
      { code: 'ar-SA', name: 'Arabic', nativeName: 'Alarabiyyah', supported: true },
    ];
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  setLanguage(language: string): boolean {
    const supported = this.supportedLanguages.find((l) => l.code === language);
    if (!supported || !supported.supported) return false;
    this.config.language = language;
    return true;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return [...this.supportedLanguages];
  }

  isLanguageSupported(code: string): boolean {
    return this.supportedLanguages.some((l) => l.code === code && l.supported);
  }

  registerCommand(command: Omit<VoiceCommand, 'id'>): VoiceCommand {
    const fullCommand: VoiceCommand = {
      ...command,
      id: `cmd-${Date.now()}-${randomBytes(4).toString('hex')}`,
    };
    this.commands.set(fullCommand.id, fullCommand);
    return fullCommand;
  }

  removeCommand(commandId: string): boolean {
    return this.commands.delete(commandId);
  }

  getCommands(): VoiceCommand[] {
    return Array.from(this.commands.values());
  }

  matchCommand(text: string): VoiceCommand | null {
    const lowerText = text.toLowerCase().trim();
    for (const command of this.commands.values()) {
      if (!command.enabled) continue;
      if (command.phrase.toLowerCase() === lowerText) return command;
      for (const alias of command.aliases) {
        if (alias.toLowerCase() === lowerText) return command;
      }
    }
    return null;
  }

  startSession(language?: string): VoiceSession {
    const session: VoiceSession = {
      id: `vs-${Date.now()}-${randomBytes(4).toString('hex')}`,
      status: 'listening',
      startedAt: new Date(),
      endedAt: null,
      duration: 0,
      transcriptions: [],
      commands: [],
      language: language ?? this.config.language,
      config: { ...this.config },
    };

    if (language) {
      session.config.language = language;
    }

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    return session;
  }

  getSession(sessionId: string): VoiceSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getActiveSession(): VoiceSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) ?? null;
  }

  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'listening') return false;
    session.status = 'paused';
    return true;
  }

  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') return false;
    session.status = 'listening';
    return true;
  }

  endSession(sessionId: string): VoiceSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = 'ended';
    session.endedAt = new Date();
    session.duration = session.endedAt.getTime() - session.startedAt.getTime();

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    return session;
  }

  transcribe(sessionId: string, audioText: string): TranscriptionResult {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.status !== 'listening') throw new Error('Session is not listening');

    const words = audioText.split(' ').map((word, i) => ({
      word,
      confidence: 0.9 + Math.random() * 0.1,
      startTime: i * 0.5,
      endTime: (i + 1) * 0.5,
    }));

    const result: TranscriptionResult = {
      id: `tr-${Date.now()}-${randomBytes(4).toString('hex')}`,
      text: audioText,
      confidence: 0.95,
      language: session.language,
      isFinal: true,
      startTime: 0,
      endTime: words.length * 0.5,
      words,
      alternatives: [],
    };

    session.transcriptions.push(result);

    const matchedCommand = this.matchCommand(audioText);
    if (matchedCommand) {
      session.commands.push(matchedCommand);
    }

    return result;
  }

  isFirstClassInput(): boolean {
    return true;
  }

  getSessionHistory(): VoiceSession[] {
    return Array.from(this.sessions.values());
  }
}

export function createVoiceEngine(config?: Partial<VoiceConfig>): VoiceEngine {
  return new VoiceEngine(config);
}
