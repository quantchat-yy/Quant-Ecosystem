import React from 'react';
import type { ServiceStatus, ServiceStatusLevel } from '../types.js';

export interface StatusDashboardProps {
  overallStatus: ServiceStatusLevel;
  services: ServiceStatus[];
  lastUpdated?: Date;
}

const STATUS_CONFIG: Record<ServiceStatusLevel, { label: string; color: string; bgColor: string }> =
  {
    operational: { label: 'All Systems Operational', color: '#10B981', bgColor: '#ECFDF5' },
    degraded: { label: 'Degraded Performance', color: '#F59E0B', bgColor: '#FFFBEB' },
    partial_outage: { label: 'Partial Outage', color: '#F97316', bgColor: '#FFF7ED' },
    major_outage: { label: 'Major Outage', color: '#EF4444', bgColor: '#FEF2F2' },
    maintenance: { label: 'Scheduled Maintenance', color: '#6366F1', bgColor: '#EEF2FF' },
  };

function StatusDot({ status }: { status: ServiceStatusLevel }): React.ReactElement {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`status-dot status-dot--${status}`}
      style={{ backgroundColor: config.color }}
      aria-label={config.label}
    />
  );
}

export function StatusDashboard({
  overallStatus,
  services,
  lastUpdated,
}: StatusDashboardProps): React.ReactElement {
  const config = STATUS_CONFIG[overallStatus];

  return (
    <div className="status-dashboard">
      <header
        className="status-dashboard__header"
        style={{ backgroundColor: config.bgColor, borderColor: config.color }}
      >
        <StatusDot status={overallStatus} />
        <h1 className="status-dashboard__title" style={{ color: config.color }}>
          {config.label}
        </h1>
        {lastUpdated && (
          <p className="status-dashboard__updated">Last updated: {lastUpdated.toLocaleString()}</p>
        )}
      </header>

      <div className="status-dashboard__services" role="list" aria-label="Service status">
        {services.map((service) => {
          const serviceConfig = STATUS_CONFIG[service.status];
          return (
            <div key={service.serviceId} className="status-dashboard__service" role="listitem">
              <div className="status-dashboard__service-info">
                <StatusDot status={service.status} />
                <span className="status-dashboard__service-name">{service.name}</span>
              </div>
              <div className="status-dashboard__service-meta">
                {service.responseTime !== undefined && (
                  <span className="status-dashboard__response-time">{service.responseTime}ms</span>
                )}
                <span
                  className="status-dashboard__service-status"
                  style={{ color: serviceConfig.color }}
                >
                  {serviceConfig.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
