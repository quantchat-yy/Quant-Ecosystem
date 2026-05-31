import React from 'react';
import type { Incident, IncidentSeverity, IncidentStatus } from '../types.js';

export interface IncidentTimelineProps {
  incidents: Incident[];
}

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string; bgColor: string }> =
  {
    minor: { label: 'Minor', color: '#F59E0B', bgColor: '#FFFBEB' },
    major: { label: 'Major', color: '#F97316', bgColor: '#FFF7ED' },
    critical: { label: 'Critical', color: '#EF4444', bgColor: '#FEF2F2' },
  };

const STATUS_LABELS: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentTimeline({ incidents }: IncidentTimelineProps): React.ReactElement {
  const sortedIncidents = [...incidents].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  if (sortedIncidents.length === 0) {
    return (
      <div className="incident-timeline incident-timeline--empty">
        <p className="incident-timeline__empty-message">
          No incidents reported. All systems operating normally.
        </p>
      </div>
    );
  }

  return (
    <div className="incident-timeline">
      <h2 className="incident-timeline__title">Incident History</h2>

      <div className="incident-timeline__list" role="list">
        {sortedIncidents.map((incident) => {
          const severity = SEVERITY_CONFIG[incident.severity];
          return (
            <article key={incident.id} className="incident-timeline__item" role="listitem">
              <header className="incident-timeline__item-header">
                <div className="incident-timeline__item-title-row">
                  <h3 className="incident-timeline__item-title">{incident.title}</h3>
                  <span
                    className="incident-timeline__severity-badge"
                    style={{ color: severity.color, backgroundColor: severity.bgColor }}
                  >
                    {severity.label}
                  </span>
                </div>
                <div className="incident-timeline__item-meta">
                  <span
                    className={`incident-timeline__status incident-timeline__status--${incident.status}`}
                  >
                    {STATUS_LABELS[incident.status]}
                  </span>
                  <span className="incident-timeline__date">{formatDate(incident.createdAt)}</span>
                </div>
              </header>

              <div className="incident-timeline__updates">
                {incident.updates.map((update) => (
                  <div key={update.id} className="incident-timeline__update">
                    <div className="incident-timeline__update-marker" />
                    <div className="incident-timeline__update-content">
                      <div className="incident-timeline__update-header">
                        <span
                          className={`incident-timeline__update-status incident-timeline__update-status--${update.status}`}
                        >
                          {STATUS_LABELS[update.status]}
                        </span>
                        <time className="incident-timeline__update-time">
                          {formatTime(update.timestamp)}
                        </time>
                      </div>
                      <p className="incident-timeline__update-message">{update.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
