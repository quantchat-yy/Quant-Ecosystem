'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolCallCard } from './ToolCallCard';
import { WorkflowProgressCard } from './WorkflowProgressCard';
import type { ToolCall } from '../types/tool-calls';
import type { WorkflowStep } from './WorkflowProgressCard';

interface AskQuantPanelProps {
  className?: string;
}

interface StreamState {
  isStreaming: boolean;
  toolCalls: ToolCall[];
  workflowSteps: WorkflowStep[];
  planDescription?: string;
  error?: string;
  completed: boolean;
}

export function AskQuantPanel({ className = '' }: AskQuantPanelProps) {
  const [input, setInput] = useState('');
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    toolCalls: [],
    workflowSteps: [],
    completed: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || streamState.isStreaming) return;

      setStreamState({
        isStreaming: true,
        toolCalls: [],
        workflowSteps: [],
        completed: false,
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: trimmed }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setStreamState((prev) => ({
            ...prev,
            isStreaming: false,
            error: 'Failed to connect',
          }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          let eventType = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ') && eventType) {
              const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
              handleSSEEvent(eventType, data);
              eventType = '';
            }
          }
        }

        setStreamState((prev) => ({ ...prev, isStreaming: false, completed: true }));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setStreamState((prev) => ({
            ...prev,
            isStreaming: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
        }
      }
    },
    [input, streamState.isStreaming],
  );

  const handleSSEEvent = (eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case 'plan_created': {
        const plan = data.plan as
          | { description?: string; steps?: Array<{ stepId: string; toolId: string }> }
          | undefined;
        if (plan?.steps) {
          const steps: WorkflowStep[] = plan.steps.map((s) => ({
            stepId: s.stepId,
            toolId: s.toolId,
            status: 'pending' as const,
          }));
          setStreamState((prev) => ({
            ...prev,
            workflowSteps: steps,
            planDescription: plan.description,
          }));
        }
        break;
      }
      case 'step_start': {
        const stepId = data.stepId as string;
        const toolId = data.toolId as string;
        setStreamState((prev) => ({
          ...prev,
          workflowSteps: prev.workflowSteps.map((s) =>
            s.stepId === stepId ? { ...s, status: 'running' as const, startedAt: Date.now() } : s,
          ),
          toolCalls: [
            ...prev.toolCalls,
            {
              id: stepId,
              name: toolId,
              status: 'running' as const,
              arguments: {},
            },
          ],
        }));
        break;
      }
      case 'step_complete': {
        const stepId = data.stepId as string;
        const result = data.result as { latencyMs?: number; data?: unknown } | undefined;
        setStreamState((prev) => ({
          ...prev,
          workflowSteps: prev.workflowSteps.map((s) =>
            s.stepId === stepId
              ? {
                  ...s,
                  status: 'completed' as const,
                  completedAt: Date.now(),
                  result: result?.data,
                }
              : s,
          ),
          toolCalls: prev.toolCalls.map((tc) =>
            tc.id === stepId
              ? {
                  ...tc,
                  status: 'completed' as const,
                  duration: result?.latencyMs,
                  result: result?.data,
                }
              : tc,
          ),
        }));
        break;
      }
      case 'step_failed': {
        const stepId = data.stepId as string;
        const errorMsg = data.error as string | undefined;
        setStreamState((prev) => ({
          ...prev,
          workflowSteps: prev.workflowSteps.map((s) =>
            s.stepId === stepId
              ? { ...s, status: 'failed' as const, completedAt: Date.now(), error: errorMsg }
              : s,
          ),
          toolCalls: prev.toolCalls.map((tc) =>
            tc.id === stepId ? { ...tc, status: 'failed' as const, error: errorMsg } : tc,
          ),
        }));
        break;
      }
      case 'error': {
        setStreamState((prev) => ({
          ...prev,
          error: data.error as string,
        }));
        break;
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStreamState((prev) => ({ ...prev, isStreaming: false }));
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Quant to do something..."
          aria-label="Ask Quant"
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--quant-border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={streamState.isStreaming}
        />
        {streamState.isStreaming ? (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            aria-label="Cancel request"
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Submit command"
          >
            Ask
          </button>
        )}
      </form>

      <AnimatePresence mode="wait">
        {streamState.workflowSteps.length > 0 && (
          <motion.div
            key="workflow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <WorkflowProgressCard
              steps={streamState.workflowSteps}
              planDescription={streamState.planDescription}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {streamState.toolCalls.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {streamState.toolCalls.map((tc) => (
              <motion.div
                key={tc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <ToolCallCard toolCall={tc} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {streamState.error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{streamState.error}</p>
        </motion.div>
      )}

      {streamState.completed && !streamState.error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
        >
          <p className="text-sm text-green-600 dark:text-green-400">
            Command executed successfully
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default AskQuantPanel;
