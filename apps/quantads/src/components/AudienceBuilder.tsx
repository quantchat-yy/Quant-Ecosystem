// ============================================================================
// QuantAds - AudienceBuilder Component
// Visual audience targeting builder
// ============================================================================

import type { TargetingConfig } from '../types';

interface AudienceBuilderProps {
  targeting?: TargetingConfig;
  onChange?: (targeting: TargetingConfig) => void;
  estimatedReach?: number;
}

export function AudienceBuilder({
  targeting,
  onChange: _onChange,
  estimatedReach = 0,
}: AudienceBuilderProps) {
  const defaultTargeting: TargetingConfig = targeting || {
    demographics: {
      ageMin: 18,
      ageMax: 65,
      genders: ['all'],
      languages: ['en'],
      educationLevels: [],
      incomeRanges: [],
    },
    interests: [],
    behaviors: [],
    locations: [],
    devices: {
      platforms: ['ios', 'android', 'web', 'desktop'],
      osVersions: [],
      deviceTypes: ['mobile', 'tablet', 'desktop'],
      connectionTypes: ['all'],
    },
    custom: [],
    exclusions: [],
  };

  return {
    type: 'div',
    className: 'audience-builder',
    children: [
      // Reach estimate
      {
        type: 'div',
        className: 'reach-estimate',
        children: [
          { type: 'h4', text: 'Estimated Audience Size' },
          { type: 'span', className: 'reach-number', text: formatReach(estimatedReach) },
          {
            type: 'div',
            className: 'reach-gauge',
            children: [
              {
                type: 'div',
                className: 'gauge-fill',
                style: { width: `${Math.min((estimatedReach / 10000000) * 100, 100)}%` },
              },
            ],
          },
          {
            type: 'div',
            className: 'reach-labels',
            children: [
              { type: 'span', text: 'Specific' },
              { type: 'span', text: 'Broad' },
            ],
          },
        ],
      },
      // Demographics
      {
        type: 'section',
        className: 'targeting-section demographics',
        children: [
          { type: 'h3', text: 'Demographics' },
          {
            type: 'div',
            className: 'age-range',
            children: [
              { type: 'label', text: 'Age Range' },
              {
                type: 'input',
                type_attr: 'range',
                min: 13,
                max: 65,
                value: defaultTargeting.demographics.ageMin,
              },
              {
                type: 'span',
                text: `${defaultTargeting.demographics.ageMin} - ${defaultTargeting.demographics.ageMax}`,
              },
            ],
          },
          {
            type: 'div',
            className: 'gender-select',
            children: [
              { type: 'label', text: 'Gender' },
              ...['all', 'male', 'female', 'other'].map((g) => ({
                type: 'button',
                className: `gender-btn ${defaultTargeting.demographics.genders.includes(g as any) ? 'active' : ''}`,
                text: g,
              })),
            ],
          },
        ],
      },
      // Interests
      {
        type: 'section',
        className: 'targeting-section interests',
        children: [
          { type: 'h3', text: 'Interests' },
          { type: 'input', className: 'interest-search', placeholder: 'Search interests...' },
          {
            type: 'div',
            className: 'interest-chips',
            children: defaultTargeting.interests.map((i) => ({
              type: 'span',
              className: 'chip',
              text: i,
            })),
          },
        ],
      },
      // Locations
      {
        type: 'section',
        className: 'targeting-section locations',
        children: [
          { type: 'h3', text: 'Locations' },
          {
            type: 'input',
            className: 'location-search',
            placeholder: 'Search countries, cities...',
          },
          {
            type: 'div',
            className: 'location-list',
            children: defaultTargeting.locations.map((l) => ({
              type: 'span',
              className: 'location-tag',
              text: l.value,
            })),
          },
        ],
      },
      // Devices
      {
        type: 'section',
        className: 'targeting-section devices',
        children: [
          { type: 'h3', text: 'Devices & Platforms' },
          {
            type: 'div',
            className: 'device-buttons',
            children: ['ios', 'android', 'web', 'desktop'].map((p) => ({
              type: 'button',
              className: `device-btn ${defaultTargeting.devices.platforms.includes(p as any) ? 'active' : ''}`,
              text: p,
            })),
          },
        ],
      },
    ],
  };
}

function formatReach(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M people`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K people`;
  return `${n} people`;
}

export default AudienceBuilder;
