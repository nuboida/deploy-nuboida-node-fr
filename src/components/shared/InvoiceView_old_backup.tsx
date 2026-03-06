import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Button, Badge, Alert, Modal } from 'react-bootstrap';
import { Share2, Check, Download, ArrowLeft, FileText, Edit2, Calendar, User, MapPin, DollarSign, AlertCircle, Zap } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Invoice, Resident, Property } from '../../App';
import { InvoiceForm } from '../homeowner/InvoiceForm';

type InvoiceViewProps = {
  resident: Resident;
  invoice: Invoice;
  property: Property;
  onClose: () => void;
  onUpdateInvoice: (invoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => void;
  onEditResident: () => void;
  isPublicView?: boolean; // Whether this is a public/tenant view (no editing allowed)
};

export function InvoiceView({ resident, invoice, property, onClose, onUpdateInvoice, onEditResident, isPublicView = false }: InvoiceViewProps) {
  console.log('[InvoiceView] ===== VIEWING INVOICE =====');
  console.log('[InvoiceView] Invoice data:', invoice);
  console.log('[InvoiceView] Invoice ID:', invoice.id);
  console.log('[InvoiceView] Month:', invoice.month);
  console.log('[InvoiceView] Electric meter snapshot:', invoice.electricMeterSnapshot);
  console.log('[InvoiceView] Has snapshot:', !!invoice.electricMeterSnapshot);
  console.log('[InvoiceView] All invoice fields:', JSON.stringify(invoice, null, 2));
  console.log('[InvoiceView] ===== END INVOICE DATA =====');

  const navigate = useNavigate();
  const location = useLocation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Apply adjustments to calculations
  const adjustedBalance = invoice.lastMonthBalance + (invoice.prevMonthBalanceAdjustment ?? 0);
  const baseLateFee = invoice.daysLate * invoice.lateFeeDailyRate;
  const adjustedLateFee = baseLateFee + (invoice.prevMonthLateFeeAdjustment ?? 0);
  const baseElectricCharge = invoice.previousMonthElectricUsageKwh * invoice.electricRate;
  const adjustedElectricCharge = baseElectricCharge + (invoice.prevMonthElectricAdjustment ?? 0);

  const total = adjustedBalance + invoice.currentRent + adjustedLateFee + adjustedElectricCharge;

  // Helper to parse name from legacy data
  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  // Get occupants array (use new field or parse from legacy)
  const occupants = resident.occupants && resident.occupants.length > 0 
    ? resident.occupants 
    : [{
        id: 'occupant-1',
        ...parseName(resident.name),
        email: resident.email,
        phone: resident.phone,
      }];

  // Format occupants names for display
  const formatOccupantsNames = (occupants: any[]) => {
    const names = occupants.map(occ => `${occ.firstName} ${occ.lastName}`.trim()).filter(name => name);
    
    if (names.length === 0) return 'Tenant';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    
    // 3 or more: "John Smith, Jane Doe and Bob Johnson"
    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast} and ${names[names.length - 1]}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleEdit = () => {
    // Navigate to edit URL by replacing /view with /edit
    const editPath = location.pathname.replace('/view', '/edit');
    navigate(editPath);
  };

  const getShareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/invoice/${invoice.shareToken}`;
  };

  const copyShareLink = async () => {
    const link = getShareLink();
    
    try {
      await copyToClipboard(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="invoice-view">
      <div className="invoice-container">
        {/* Action Buttons */}
        <div className="invoice-actions">
          <Button
            variant="light"
            onClick={onClose}
            className="invoice-action-btn"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          <Button
            onClick={() => setShowShareModal(true)}
            className="invoice-action-btn invoice-action-btn-primary"
          >
            <Share2 size={18} />
            Share Link
          </Button>
          <Button
            variant="light"
            onClick={handleDownloadPDF}
            className="invoice-action-btn"
          >
            <Download size={18} />
            Download PDF
          </Button>
          <Button
            variant="light"
            onClick={handlePrint}
            className="invoice-action-btn"
          >
            <FileText size={18} />
            Print
          </Button>
          {!isPublicView && (
            <Button
              variant="light"
              onClick={handleEdit}
              className="invoice-action-btn"
            >
              <Edit2 size={18} />
              Edit
            </Button>
          )}
        </div>

        {/* Invoice Card */}
        <Card className="invoice-card">
          <Card.Body className="invoice-body">
            {/* Header Section */}
            <div className="invoice-header">
              <div className="invoice-header-left">
                <h1 className="invoice-title">Invoice</h1>
                <div className="invoice-property-name">{property.name}</div>
                <div className="invoice-property-address">{property.address}</div>
              </div>
              <div className="invoice-header-right">
                <div className="invoice-date-badge">
                  <Calendar size={16} />
                  <span>
                    {new Date(invoice.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="invoice-period-label">Period</div>
                <div className="invoice-period-value">{invoice.month}</div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="invoice-section">
              <div className="invoice-section-header">
                <User size={20} />
                <h5 className="invoice-section-title">Bill To</h5>
              </div>
              <div className="invoice-bill-to-card">
                <div className="invoice-bill-to-name">
                  {formatOccupantsNames(occupants)}
                </div>
                <div className="invoice-bill-to-contact">
                  {resident.email}
                </div>
                <div className="invoice-bill-to-contact">
                  {resident.phone}
                </div>
                <div className="invoice-bill-to-address">
                  <MapPin size={16} />
                  <div>
                    {resident.streetAddress}, Apt {resident.aptNumber}<br />
                    {resident.city}, {resident.state} {resident.zipCode}
                  </div>
                </div>
                {!isPublicView && (
                  <Button
                    size="sm"
                    variant="link"
                    className="invoice-edit-link d-print-none"
                    onClick={onEditResident}
                  >
                    Edit Contact Info →
                  </Button>
                )}
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="invoice-section">
              <div className="invoice-section-header">
                <DollarSign size={20} />
                <h5 className="invoice-section-title">Charges</h5>
              </div>

              {/* Line Items */}
              <div className="invoice-line-items">
                {/* Last Month Balance */}
                <div className="invoice-line-item">
                  <span className="invoice-line-item-label">
                    Last Month's Balance
                  </span>
                  <span className="invoice-line-item-amount">
                    ${adjustedBalance.toFixed(2)}
                  </span>
                </div>

                {/* Current Rent */}
                <div className="invoice-line-item">
                  <span className="invoice-line-item-label">
                    Current Rent
                  </span>
                  <span className="invoice-line-item-amount">
                    ${invoice.currentRent.toFixed(2)}
                  </span>
                </div>

                {/* Late Fees */}
                {invoice.daysLate > 0 && (
                  <div className="invoice-line-item invoice-line-item-late">
                    <div className="invoice-line-item-header">
                      <div className="invoice-line-item-icon-label">
                        <AlertCircle size={18} />
                        <span className="invoice-line-item-label">Late Fees</span>
                      </div>
                      <span className="invoice-line-item-amount">
                        ${adjustedLateFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="invoice-line-item-details">
                      {invoice.daysLate} days × ${invoice.lateFeeDailyRate.toFixed(2)}/day
                      <span style={{ marginLeft: '12px', opacity: 0.8 }}>
                        (Late after day {resident.lateStartDay})
                      </span>
                    </div>
                  </div>
                )}

                {/* Electric Charges */}
                <div className={`invoice-line-item invoice-line-item-electric ${!invoice.electricMeterSnapshot ? 'invoice-line-item-electric-no-border' : ''}`}>
                  <div className="invoice-line-item-header">
                    <div className="invoice-line-item-icon-label">
                      <Zap size={18} />
                      <span className="invoice-line-item-label">Electric Charges</span>
                    </div>
                    <span className="invoice-line-item-amount">
                      ${adjustedElectricCharge.toFixed(2)}
                    </span>
                  </div>
                  <div className="invoice-line-item-details">
                    {invoice.previousMonthElectricUsageKwh} kWh × ${invoice.electricRate.toFixed(2)}/kWh
                  </div>
                </div>

                {/* Meter Photo */}
                {invoice.electricMeterSnapshot && (
                  <div className="invoice-meter-snapshot">
                    <div className="invoice-meter-label">
                      Meter Reading
                    </div>
                    <div className="invoice-meter-image-wrapper">
                      <ImageWithFallback
                        src={invoice.electricMeterSnapshot}
                        alt="Electric meter reading"
                        className="invoice-meter-image"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="invoice-total-section">
              <div className="invoice-total-content">
                <span className="invoice-total-label">Total Amount Due</span>
                <span className="invoice-total-amount">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="invoice-payment-instructions">
              <h6 className="invoice-payment-instructions-title">
                Payment Instructions
              </h6>
              <p className="invoice-payment-instructions-text">
                Please make payment by the {resident.lateStartDay}th of the month to avoid late fees.
                Late fees of ${invoice.lateFeeDailyRate.toFixed(2)}/day will be applied after day {resident.lateStartDay}.
              </p>
            </div>

            {/* Footer */}
            <div className="invoice-footer">
              <p className="invoice-footer-text">
                Thank you for your tenancy
              </p>
            </div>
          </Card.Body>
        </Card>

        {/* Share Link Modal */}
        <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
          <Modal.Header closeButton className="invoice-modal-header">
            <Modal.Title className="invoice-modal-title">
              Share Invoice
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="invoice-modal-body">
            <p className="invoice-modal-text">
              Share this link with <strong>{resident.name}</strong> to give them access to this invoice:
            </p>
            <Alert variant="info" className="invoice-share-alert">
              <input
                type="text"
                readOnly
                value={getShareLink()}
                onClick={(e) => e.currentTarget.select()}
                className="invoice-share-input"
              />
              <Button
                size="sm"
                onClick={copyShareLink}
                className="invoice-share-copy-btn"
              >
                {copiedLink ? '✓ Copied!' : 'Copy Link'}
              </Button>
            </Alert>
            <p className="invoice-modal-footnote">
              This link allows view-only access to this specific invoice.
            </p>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
}