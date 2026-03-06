import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, ArrowLeft, User, ChevronDown } from 'lucide-react';
import { Button, Dropdown } from 'react-bootstrap';

export interface AccountMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  dividerAfter?: boolean;
  dividerBefore?: boolean;
  variant?: 'default' | 'danger';
}

export interface PropertyOption {
  id: string;
  label: string;
  isSelected?: boolean;
  slug?: string;
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  /** If true, this breadcrumb renders as a dropdown with propertyOptions */
  isPropertyDropdown?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  onBack?: () => void;
  onHomeClick?: () => void;
  icon?: React.ReactNode;
  customActions?: React.ReactNode;
  accountMenuItems?: AccountMenuItem[];
  breadcrumbs?: BreadcrumbItem[];
  /** Property options for dropdown breadcrumb */
  propertyOptions?: PropertyOption[];
  /** Callback when property is selected from dropdown */
  onPropertySelect?: (propertyId: string) => void;
  /** Callback when property settings is clicked from dropdown */
  onPropertySettings?: (propertyId: string) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onLogout,
  onBack,
  onHomeClick,
  icon,
  customActions,
  accountMenuItems,
  breadcrumbs,
  propertyOptions,
  onPropertySelect,
  onPropertySettings
}) => {
  const navigate = useNavigate();
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      navigate('/homeowner/dashboard');
    }
  };

  return (
    <div className="header-main sticky-top">
      <div className="container-xxl px-4 py-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="btn btn-tertiary btn-sm" type="button">
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Back</span>
            </button>
          )}
          <a
            href="/homeowner/dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleHomeClick();
            }}
            className="d-flex align-items-center gap-3 text-decoration-none"
            aria-label={`${title} - Go to dashboard`}
          >
            <div className="brand-icon" aria-hidden="true">
              {icon || <Building2 size={26} color="white" />}
            </div>
          </a>
          <div>
            <a
              href="/homeowner/dashboard"
              onClick={(e) => {
                e.preventDefault();
                handleHomeClick();
              }}
              className="text-decoration-none"
              aria-label={`${title} - Go to dashboard`}
            >
              <span className="h2 mb-0 d-block">{title}</span>
            </a>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav aria-label="Breadcrumb">
                <ol className="breadcrumb breadcrumb-header mb-0 d-flex align-items-center gap-2 small">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && (
                        <li className="breadcrumb-separator" aria-hidden="true">
                          /
                        </li>
                      )}
                      <li className="breadcrumb-item">
                        {crumb.isPropertyDropdown && propertyOptions && propertyOptions.length > 1 ? (
                          <Dropdown
                            align="start"
                            show={propertyDropdownOpen}
                            onToggle={(isOpen) => setPropertyDropdownOpen(isOpen)}
                          >
                            <Dropdown.Toggle
                              as="button"
                              type="button"
                              className="breadcrumb-dropdown-toggle"
                              aria-label={`Current property: ${crumb.label}. Select to change property.`}
                            >
                              {crumb.label}
                              <ChevronDown size={14} aria-hidden="true" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="breadcrumb-dropdown-menu">
                              {propertyOptions.map((property) => (
                                <div key={property.id} className="property-dropdown-item">
                                  <span
                                    className={`checkmark ${property.isSelected ? 'visible' : ''}`}
                                    aria-hidden="true"
                                  >
                                    ✓
                                  </span>
                                  <span
                                    className="property-name"
                                    onClick={() => {
                                      setPropertyDropdownOpen(false);
                                      onPropertySelect?.(property.id);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setPropertyDropdownOpen(false);
                                        onPropertySelect?.(property.id);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {property.label}
                                  </span>
                                  <div className="property-actions">
                                    <button
                                      type="button"
                                      className="btn btn-link btn-sm"
                                      onClick={() => {
                                        setPropertyDropdownOpen(false);
                                        onPropertySelect?.(property.id);
                                      }}
                                    >
                                      Select
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-link btn-sm"
                                      onClick={() => {
                                        setPropertyDropdownOpen(false);
                                        onPropertySettings?.(property.id);
                                      }}
                                    >
                                      Property Settings
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown>
                        ) : crumb.onClick && !crumb.isActive ? (
                          <button
                            type="button"
                            className="breadcrumb-link"
                            onClick={crumb.onClick}
                          >
                            {crumb.label}
                          </button>
                        ) : (
                          <span className={crumb.isActive ? 'breadcrumb-active' : 'breadcrumb-text'}>
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    </React.Fragment>
                  ))}
                </ol>
              </nav>
            ) : subtitle && (
              <span className="text-muted small">{subtitle}</span>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {customActions}
          {accountMenuItems && accountMenuItems.length > 0 ? (
            <Dropdown align="end">
              <Dropdown.Toggle as="button" type="button" className="btn btn-tertiary">
                <User size={18} aria-hidden="true" />
                <span>My Account</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {accountMenuItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {item.dividerBefore && <Dropdown.Divider />}
                    <Dropdown.Item
                      onClick={item.onClick}
                      className={`d-flex align-items-center gap-2${item.variant === 'danger' ? ' text-danger' : ''}`}
                    >
                      {item.icon}
                      {item.label}
                    </Dropdown.Item>
                    {item.dividerAfter && <Dropdown.Divider />}
                  </React.Fragment>
                ))}
                {onLogout && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={onLogout} className="d-flex align-items-center gap-2">
                      <LogOut size={16} aria-hidden="true" />
                      Sign Out
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
          ) : onLogout && (
            <Button
              variant="secondary"
              onClick={onLogout}
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
