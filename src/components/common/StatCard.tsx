import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  iconBgClass?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  description,
  icon,
  iconBgClass = 'stat-icon-success',
  highlight = false
}) => {
  return (
    <div className={highlight ? 'stat-card-highlight' : 'stat-card'}>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <p className="stat-label mb-2">{label}</p>
          <h3 className="stat-value">{value}</h3>
        </div>
        <div className={`stat-icon ${iconBgClass}`}>
          {icon}
        </div>
      </div>
      {description && (
        <p className="stat-description mb-0">{description}</p>
      )}
    </div>
  );
};
