'use client';

import { useState } from 'react';
import { VoiceInput, Button } from '@quant/shared-ui';

export default function VoicePage() {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscript = async (text: string) => {
    setTranscript(text);
    setError(null);
    setAiResponse(null);
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model: 'default' }),
      });
      const json = await res.json();
      if (json.response || json.message || json.data) {
        setAiResponse(json.response || json.message || json.data);
      } else if (json.error) {
        setError(json.error);
      } else {
        setAiResponse('AI responded but the response format was unexpected. Please try again.');
      }
    } catch {
      setError('Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          onTranscript={handleTranscript}
          onRecordingStart={() => {}}
          onRecordingStop={() => {}}
        />
      </div>
      <div className="w-full max-w-md space-y-4">
        {/* Transcript display */}
        <div className="p-4 rounded-lg bg-[var(--quant-muted)]">
          {transcript ? (
            <div>
              <p className="text-xs text-[var(--quant-muted-foreground)] mb-1">Your words:</p>
              <p className="text-sm text-[var(--quant-foreground)]">{transcript}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--quant-muted-foreground)] text-center">
              Transcription will appear here...
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <p className="text-sm text-indigo-400 animate-pulse">Thinking...</p>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <p className="text-xs text-indigo-400 mb-1">Quant AI:</p>
            <p className="text-sm text-[var(--quant-foreground)] whitespace-pre-wrap">
              {aiResponse}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <Button variant="secondary">View History</Button>
        </div>
      </div>
    </div>
  );
}
