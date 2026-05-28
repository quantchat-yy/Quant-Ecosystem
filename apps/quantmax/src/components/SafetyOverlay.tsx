// ============================================================================
// QuantMax - Safety Overlay Component
// Safety/report overlay with quick actions
// ============================================================================

import type { ReportReason } from '../types';

interface SafetyOverlayProps {
  isVisible: boolean;
  targetUserId: string;
  onReport: (reason: ReportReason, description: string) => void;
  onBlock: () => void;
  onClose: () => void;
  onEmergency: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or Scam' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'catfish', label: 'Fake Profile / Catfish' },
  { value: 'underage', label: 'Appears Underage' },
  { value: 'violence', label: 'Violence or Threats' },
  { value: 'other', label: 'Other' },
];

export function SafetyOverlay({
  isVisible,
  targetUserId: _targetUserId,
  onReport,
  onBlock,
  onClose,
  onEmergency,
}: SafetyOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Safety center"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-gray-800 border border-gray-700 p-6 pb-8 animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <h2 className="text-lg font-bold text-white mb-1">Safety Center</h2>
        <p className="text-sm text-gray-400 mb-5">
          Your safety is our priority. What would you like to do?
        </p>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6" role="group" aria-label="Quick actions">
          <button
            type="button"
            onClick={onBlock}
            className="flex-1 min-h-[44px] rounded-xl bg-gray-700 px-4 py-3 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-900/30 focus:outline-none focus:ring-2 focus:ring-orange-400"
            aria-label="Block user"
          >
            Block User
          </button>
          <button
            type="button"
            onClick={onEmergency}
            className="flex-1 min-h-[44px] rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Emergency"
          >
            Emergency
          </button>
        </div>

        {/* Report Section */}
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Report</h3>
        <div className="flex flex-col gap-2 mb-6" role="group" aria-label="Report reasons">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => onReport(reason.value, reason.label)}
              className="w-full min-h-[44px] rounded-lg bg-gray-700/60 px-4 py-3 text-left text-sm text-gray-200 transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-400"
              aria-label={`Report for ${reason.label}`}
            >
              {reason.label}
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Cancel and close safety center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SafetyOverlay;
