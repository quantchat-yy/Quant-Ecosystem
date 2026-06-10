'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true);
      setTranscript('');
      setAiResponse('');

      // Simulate voice input after 3 seconds
      setTimeout(() => {
        const sampleText = 'Create a marketing plan for our new AI product launch';
        setTranscript(sampleText);
        setIsListening(false);
        processVoiceInput(sampleText);
      }, 3000);
    } else {
      setIsListening(false);
    }
  };

  const processVoiceInput = async (text: string) => {
    setIsProcessing(true);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const response = `Here's a comprehensive marketing plan for your AI product launch:\n\n1. Target Audience Analysis\n2. Positioning Strategy\n3. Multi-channel Campaign\n4. Influencer Partnerships\n5. Performance Metrics`;

    setAiResponse(response);
    setIsProcessing(false);

    // Addictive XP reward
    const xp = Math.floor(Math.random() * 45) + 25;
    setXpGained(xp);

    setTimeout(() => setXpGained(0), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 text-xs tracking-[3px] mb-4">
            VOICE MODE
          </div>
          <h1 className="text-7xl font-bold tracking-[-3px]">Talk to QuantAI</h1>
          <p className="text-xl text-white/50 mt-3">Your voice. Your agents. Instant execution.</p>
        </div>

        {/* Voice Orb - Addictive Visual */}
        <div className="relative flex items-center justify-center mb-12">
          <motion.button
            onClick={toggleListening}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? 'bg-red-500/20 border-2 border-red-500'
                : 'bg-white/5 border border-white/20 hover:bg-white/10'
            }`}
          >
            {/* Animated rings */}
            {isListening && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border border-red-500/40"
                    animate={{
                      scale: [1, 2.2],
                      opacity: [0.6, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                    style={{ width: 192 + i * 40, height: 192 + i * 40 }}
                  />
                ))}
              </>
            )}

            <div className="text-7xl z-10">{isListening ? '🎙️' : '🎤'}</div>
          </motion.button>
        </div>

        <button
          onClick={toggleListening}
          className="text-lg px-8 py-4 rounded-2xl border border-white/20 hover:bg-white/5 transition-all active:scale-[0.985]"
        >
          {isListening ? 'Stop Listening' : 'Start Speaking'}
        </button>

        {/* Transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 text-left max-w-lg mx-auto"
            >
              <div className="text-xs text-white/40 tracking-[2px] mb-2">YOU SAID</div>
              <div className="text-2xl leading-tight">"{transcript}"</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Response */}
        <AnimatePresence>
          {isProcessing && (
            <div className="mt-12">
              <div className="flex items-center justify-center gap-3 text-white/60">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                <div>QuantAI is thinking...</div>
              </div>
            </div>
          )}

          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 text-left max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-8"
            >
              <div className="text-xs text-emerald-400 tracking-[2px] mb-3">QUANTAI RESPONSE</div>
              <div className="text-lg leading-relaxed whitespace-pre-line">{aiResponse}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* XP Reward Animation */}
        <AnimatePresence>
          {xpGained > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-8 py-3 rounded-2xl font-mono text-xl font-bold flex items-center gap-3"
            >
              +{xpGained} XP
              <span className="text-sm">🔥</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
