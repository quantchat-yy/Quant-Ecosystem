import React from 'react';

export interface ComparisonTableProps {
  className?: string;
}

type FeatureSupport = 'full' | 'partial' | 'none';

interface ComparisonFeature {
  name: string;
  quant: FeatureSupport;
  google: FeatureSupport;
  microsoft: FeatureSupport;
}

const COMPARISON_DATA: ComparisonFeature[] = [
  { name: 'E2E Encryption', quant: 'full', google: 'none', microsoft: 'none' },
  { name: 'Local-First', quant: 'full', google: 'none', microsoft: 'none' },
  { name: 'AI Built-in', quant: 'full', google: 'full', microsoft: 'full' },
  { name: 'Open Source', quant: 'full', google: 'none', microsoft: 'none' },
  { name: 'Self-Hostable', quant: 'full', google: 'none', microsoft: 'partial' },
  { name: 'Privacy-First', quant: 'full', google: 'none', microsoft: 'partial' },
  { name: 'Offline Support', quant: 'full', google: 'partial', microsoft: 'partial' },
  { name: 'Real-time Collab', quant: 'full', google: 'full', microsoft: 'full' },
];

function SupportIcon({ support }: { support: FeatureSupport }): React.ReactElement {
  switch (support) {
    case 'full':
      return (
        <span className="comparison-table__check" aria-label="Fully supported">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    case 'partial':
      return (
        <span className="comparison-table__partial" aria-label="Partially supported">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'none':
      return (
        <span className="comparison-table__x" aria-label="Not supported">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke="#EF4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
  }
}

export function ComparisonTable({ className }: ComparisonTableProps): React.ReactElement {
  return (
    <div className={`comparison-table ${className || ''}`}>
      <h2 className="comparison-table__title">How Quant Compares</h2>
      <div className="comparison-table__wrapper">
        <table className="comparison-table__table" role="table">
          <thead>
            <tr>
              <th className="comparison-table__feature-header">Feature</th>
              <th className="comparison-table__provider-header comparison-table__provider-header--quant">
                Quant
              </th>
              <th className="comparison-table__provider-header">Google Workspace</th>
              <th className="comparison-table__provider-header">Microsoft 365</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_DATA.map((feature) => (
              <tr key={feature.name} className="comparison-table__row">
                <td className="comparison-table__feature-name">{feature.name}</td>
                <td className="comparison-table__cell comparison-table__cell--quant">
                  <SupportIcon support={feature.quant} />
                </td>
                <td className="comparison-table__cell">
                  <SupportIcon support={feature.google} />
                </td>
                <td className="comparison-table__cell">
                  <SupportIcon support={feature.microsoft} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
