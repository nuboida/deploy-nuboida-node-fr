import React from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, FileText, Mail, Phone } from 'lucide-react';
import { Badge } from 'react-bootstrap';

interface TenantCardProps {
  name: string;
  unit: string;
  email: string;
  phone?: string;
  rentCollected: number;
  electricCollected: number;
  latestInvoiceAmount?: number;
  latestInvoiceMonth?: string;
  isPaid?: boolean;
  onClick: () => void;
  onViewInvoice?: () => void;
  residentHref?: string; // URL to navigate to for "View Resident"
  invoiceHref?: string; // URL to navigate to for "View Latest Invoice"
  latestInvoice?: {
    currentRent: number;
    previousMonthElectricUsageKwh: number;
    electricRate: number;
    daysLate: number;
    lateFeeDailyRate: number;
    prevMonthBalanceAdjustment?: number;
    prevMonthLateFeeAdjustment?: number;
    prevMonthElectricAdjustment?: number;
  };
}

export const TenantCard: React.FC<TenantCardProps> = ({
  name,
  unit,
  email,
  phone,
  rentCollected,
  electricCollected,
  latestInvoiceAmount,
  latestInvoiceMonth,
  isPaid,
  onClick,
  onViewInvoice,
  residentHref,
  invoiceHref,
  latestInvoice
}) => {
  const yearToDateCollected = rentCollected + electricCollected;

  // Calculate breakdown from latest invoice
  const electricCost = latestInvoice
    ? (latestInvoice.previousMonthElectricUsageKwh || 0) * (latestInvoice.electricRate || 0)
    : 0;
  const lateFee = latestInvoice
    ? (latestInvoice.daysLate || 0) * (latestInvoice.lateFeeDailyRate || 0)
    : 0;
  const totalAdjustments = latestInvoice
    ? (latestInvoice.prevMonthBalanceAdjustment || 0) +
      (latestInvoice.prevMonthLateFeeAdjustment || 0) +
      (latestInvoice.prevMonthElectricAdjustment || 0)
    : 0;

  // Debug logging
  console.log('[TenantCard] Breakdown calculation:', {
    name,
    latestInvoiceAmount,
    electricCost,
    lateFee,
    totalAdjustments,
    latestInvoice,
  });

  // Determine payment status
  const getPaymentStatus = () => {
    if (isPaid || !latestInvoiceAmount) {
      return { label: 'Caught Up', variant: 'success' };
    }

    const unpaidAmount = latestInvoiceAmount;
    if (unpaidAmount >= 200) {
      return { label: 'Far Behind', variant: 'danger' };
    } else {
      return { label: 'Behind', variant: 'warning' };
    }
  };

  const paymentStatus = getPaymentStatus();

  return (
    <div className="card-tenant-sleek-horizontal">
      {/* Avatar Section */}
      <div className="tenant-avatar-section d-flex align-items-center justify-content-center w-100 h-100 tenant-avatar">
        <UserCircle size={24} strokeWidth={1.5} />
      </div>

      {/* Info Section: Name, Badge, Contact, Action */}
      <div className="tenant-info-section d-flex flex-column gap-3 h-100">
        {/* Header with Name */}
        <div className="d-flex flex-column gap-2">
          <div className="d-flex flex-column">
            <h3 className="h6 fw-bold text-dark text-truncate">
              {name}
            </h3>
            <p className="text-muted small">
              {unit ? `Unit ${unit}` : 'No Unit Assigned'}
            </p>
          </div>
          {/* Payment Status Badge */}
          {latestInvoiceAmount !== undefined && (
            <Badge
              bg={paymentStatus.variant}
              className="badge-status-subtle align-self-start"
            >
              {paymentStatus.label}
            </Badge>
          )}
        </div>

        {/* Contact Info */}
        <div className="d-flex flex-column gap-2">
          {email && (
            <a
              href={`mailto:${email}`}
              className="d-flex align-items-center gap-2 text-decoration-none contact-link"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail size={14} className="text-muted" />
              <span className="small text-muted">{email}</span>
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="d-flex align-items-center gap-2 text-decoration-none contact-link"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={14} className="text-muted" />
              <span className="small text-muted">{phone}</span>
            </a>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-grow-1"></div>

        {/* Action Button */}
        <div className="d-flex gap-2">
          {residentHref ? (
            <Link
              to={residentHref}
              className="btn btn-outline-secondary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1"
            >
              <UserCircle size={16} />
              <span className="small">View Details</span>
            </Link>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="btn btn-outline-secondary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1"
            >
              <UserCircle size={16} />
              <span className="small">View Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Balance Section: Current Balance */}
      {latestInvoiceAmount !== undefined ? (
        <div className="tenant-balance-section d-flex flex-column gap-3 h-100">
          <div className="tenant-current-balance d-flex flex-column gap-3 flex-grow-1">
            <div className="d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted fw-semibold">Current Balance</span>
                {latestInvoiceMonth && (
                  <span className="small text-muted">{latestInvoiceMonth}</span>
                )}
              </div>
              <div className={`h4 fw-bold ${
                latestInvoiceAmount > 0 ? 'text-danger' : 'text-success'
              }`}>
                ${latestInvoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Breakdown - Horizontal */}
            <div className="d-flex gap-4">
              <div className="d-flex flex-column">
                <span className="small text-muted">Electric Cost</span>
                <span className="fw-semibold text-danger">
                  ${electricCost.toFixed(2)}
                </span>
              </div>
              <div className="d-flex flex-column">
                <span className="small text-muted">Late Fee</span>
                <span className={`fw-semibold ${lateFee > 0 ? 'text-danger' : ''}`}>
                  ${lateFee.toFixed(2)}
                </span>
              </div>
              <div className="d-flex flex-column">
                <span className="small text-muted">Total Adjustments</span>
                <span className={`fw-semibold ${
                  totalAdjustments > 0 ? 'text-danger' : totalAdjustments < 0 ? 'text-success' : ''
                }`}>
                  {totalAdjustments > 0 ? 'Debit - ' : totalAdjustments < 0 ? 'Credit + ' : ''}
                  ${Math.abs(totalAdjustments).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Action Buttons */}
          <div className="d-flex gap-2">
            {invoiceHref ? (
              <>
                <Link
                  to={invoiceHref}
                  className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                >
                  <FileText size={14} />
                  <span className="small">Preview</span>
                </Link>
                <Link
                  to={invoiceHref.replace('/view', '/edit')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                >
                  <FileText size={14} />
                  <span className="small">Details</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-1">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </Link>
              </>
            ) : onViewInvoice ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewInvoice();
                  }}
                  className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                >
                  <FileText size={14} />
                  <span className="small">Preview</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewInvoice();
                  }}
                  className="btn btn-sm btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                >
                  <FileText size={14} />
                  <span className="small">Details</span>
                </button>
              </>
            ) : (
              <button
                disabled
                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 w-100"
              >
                <FileText size={14} />
                <span className="small">No invoices available</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tenant-balance-section d-flex align-items-center justify-content-center">
          <p className="text-muted small">No invoices available</p>
        </div>
      )}

      {/* YTD Section */}
      <div className="tenant-ytd-section d-flex flex-column gap-3 h-100">
        {/* Year to Date Collected */}
        <div className="tenant-ytd-collected d-flex flex-column gap-3 flex-grow-1">
          <div className="d-flex flex-column">
            <span className="small text-muted fw-semibold">Year to Date Collected</span>
            <span className="h4 fw-bold text-success">
              ${yearToDateCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* YTD Breakdown - Horizontal */}
          <div className="d-flex gap-3">
            <div className="d-flex flex-column">
              <span className="small text-muted">Rent</span>
              <span className="fw-semibold text-success">
                ${rentCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="d-flex flex-column">
              <span className="small text-muted">Electric</span>
              <span className="fw-semibold text-success">
                ${electricCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
