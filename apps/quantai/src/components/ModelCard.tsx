// ============================================================================
// QuantAI - Model Card Component
// ============================================================================

import type { AIModel } from '../types';

interface ModelCardProps {
  model: AIModel;
  onSelect: () => void;
  isSelected: boolean;
}

export function ModelCard({ model, onSelect, isSelected }: ModelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all min-h-[44px] ${
        isSelected
          ? 'border-purple-500 bg-purple-900/20 ring-2 ring-purple-500/30'
          : 'border-gray-700 bg-gray-800 hover:border-gray-500'
      } ${model.status === 'deprecated' ? 'opacity-60' : ''}`}
      aria-label={`${model.name} by ${model.provider}${isSelected ? ', selected' : ''}`}
      aria-pressed={isSelected}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white truncate">{model.name}</h3>
        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{model.provider}</span>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mb-3" aria-label="Capabilities">
        {model.capabilities.map((cap) => (
          <span
            key={cap}
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-700 text-gray-300"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Specs */}
      <div className="grid grid-cols-3 gap-2 text-xs" aria-label="Model specifications">
        <div className="flex flex-col">
          <span className="text-gray-500">Context</span>
          <span className="text-gray-200 font-medium">{model.contextWindow / 1000}K</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">Latency</span>
          <span className="text-gray-200 font-medium">{model.latencyMs}ms</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">Cost</span>
          <span className="text-gray-200 font-medium">${model.costPer1kTokens.input}/1K in</span>
        </div>
      </div>

      {/* Fine-tuned Badge */}
      {model.isFineTuned && (
        <span className="inline-flex items-center mt-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-900/50 text-green-300 border border-green-700/50">
          Fine-tuned
        </span>
      )}
    </button>
  );
}

export default ModelCard;
