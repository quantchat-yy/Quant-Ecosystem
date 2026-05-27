'use client';

import { VoiceInput, Button } from '@quant/shared-ui';

export default function VoicePage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Voice Interaction</h1>
        <p className="text-[var(--quant-muted-foreground)]">
          Tap the microphone to start speaking with QuantAI
        </p>
      </div>
      <div className="mb-8">
        <VoiceInput
          onTranscript={(text) => {
            console.log('Transcript:', text);
          }}
          onRecordingStart={() => {
            console.log('Recording started');
          }}
          onRecordingStop={() => {
            console.log('Recording stopped');
          }}
        />
      </div>
      <div className="w-full max-w-md space-y-4">
        <div className="p-4 rounded-lg bg-[var(--quant-muted)] text-center">
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Transcription will appear here...
          </p>
        </div>
        <div className="flex justify-center">
          <Button variant="secondary">View History</Button>
        </div>
      </div>
    </div>
  );
}
