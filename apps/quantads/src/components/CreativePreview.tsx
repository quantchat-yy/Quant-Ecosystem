// ============================================================================
// QuantAds - CreativePreview Component
// Ad creative preview across formats
// ============================================================================

import type { Creative } from '../types';

interface CreativePreviewProps {
  creative: Creative;
  placement?: string;
  showMetrics?: boolean;
}

export function CreativePreview({
  creative,
  placement = 'feed',
  showMetrics = false,
}: CreativePreviewProps) {
  const dimensions = getDimensions(placement);

  return {
    type: 'div',
    className: `creative-preview format-${creative.format} placement-${placement}`,
    style: { maxWidth: `${dimensions.width}px` },
    children: [
      { type: 'div', className: 'preview-label', text: `${creative.format} - ${placement}` },
      {
        type: 'div',
        className: 'preview-frame',
        style: { aspectRatio: `${dimensions.width}/${dimensions.height}` },
        children: [
          creative.assets.length > 0 && {
            type: 'img',
            src: creative.assets[0]?.url,
            className: 'preview-asset',
          },
          {
            type: 'div',
            className: 'preview-overlay',
            children: [
              { type: 'span', className: 'ad-label', text: 'Sponsored' },
              { type: 'h3', className: 'preview-headline', text: creative.headline },
              { type: 'p', className: 'preview-description', text: creative.description },
              { type: 'button', className: 'preview-cta', text: creative.callToAction },
            ],
          },
        ].filter(Boolean),
      },
      showMetrics &&
        creative.performance && {
          type: 'div',
          className: 'preview-metrics',
          children: [
            { type: 'span', text: `${creative.performance.impressions} imp` },
            { type: 'span', text: `${creative.performance.ctr.toFixed(2)}% CTR` },
            {
              type: 'span',
              text: `Quality: ${(creative.performance.qualityScore * 10).toFixed(1)}/10`,
            },
          ],
        },
      {
        type: 'span',
        className: `status-badge status-${creative.status}`,
        text: creative.status.replace('_', ' '),
      },
    ].filter(Boolean),
  };
}

function getDimensions(placement: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    feed: { width: 600, height: 400 },
    sidebar: { width: 300, height: 250 },
    banner: { width: 728, height: 90 },
    stories: { width: 360, height: 640 },
    'pre-roll': { width: 640, height: 360 },
  };
  return dims[placement] || { width: 600, height: 400 };
}

export default CreativePreview;
