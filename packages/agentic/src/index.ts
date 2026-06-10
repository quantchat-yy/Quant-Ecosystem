import { QuantOrchestrator } from './orchestrator/orchestrator';
import { QuantMailAgent } from './agents/quantmail.agent';
import { QuantChatAgent } from './agents/quantchat.agent';
import { QuantAIAgent } from './agents/quantai.agent';
import { QuantDriveAgent } from './agents/quantdrive.agent';
import { QuantMeetAgent } from './agents/quantmeet.agent';
import { QuantSyncAgent } from './agents/quantsync.agent';
import { PersonalAgent } from './agents/personal.agent';

export * from './core/agent';
export * from './memory/memory-store';
export * from './tools/tool-registry';
export * from './planning/planner';
export * from './execution/executor';
export * from './orchestrator/orchestrator';
export * from './agents/quantmail.agent';
export * from './agents/quantchat.agent';
export * from './agents/quantai.agent';
export * from './agents/quantdrive.agent';
export * from './agents/quantmeet.agent';
export * from './agents/quantsync.agent';
export * from './agents/personal.agent';

export function createQuantEcosystemOrchestrator() {
  const orchestrator = new QuantOrchestrator({
    maxConcurrentAgents: 20,
    defaultModel: 'gpt-4o',
  });

  // Register all agents
  orchestrator.registerAgent(new QuantMailAgent());
  orchestrator.registerAgent(new QuantChatAgent());
  orchestrator.registerAgent(new QuantAIAgent());
  orchestrator.registerAgent(new QuantDriveAgent());
  orchestrator.registerAgent(new QuantMeetAgent());
  orchestrator.registerAgent(new QuantSyncAgent());

  return orchestrator;
}

export const orchestrator = createQuantEcosystemOrchestrator();
