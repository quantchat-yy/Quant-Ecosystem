export type CallState =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'on-hold'
  | 'ended'
  | 'failed';

export type CallDirection = 'inbound' | 'outbound';

export interface CallSession {
  callSid: string;
  status: CallState;
  fromNumber: string;
  toNumber: string;
  startTime: number;
  duration: number;
  direction: CallDirection;
}

export interface CallEvent {
  type: 'state-change' | 'dtmf' | 'error';
  callSid: string;
  data: unknown;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  statusCallbackUrl?: string;
}

export interface CallAgentIntent {
  action: 'place' | 'answer' | 'end' | 'hold' | 'transfer';
  target?: string;
  callId?: string;
}
