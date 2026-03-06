import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Modal, Alert, Dropdown, Spinner } from 'react-bootstrap';
import { Share2, Download, FileText, Edit2, Eye, ArrowLeft, Heart, DollarSign, Zap, FileCheck, AlertCircle, ChevronDown, MoreVertical } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { AppToast } from '../common/AppToast';
import { messages } from '../../utils/messages';
import type { Invoice, Resident, Property } from '../../App';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

type InvoiceViewProps = {
  resident: Resident;
  invoice: Invoice;
  property: Property;
  onClose: () => void;
  onUpdateInvoice: (invoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => void;
  onEditResident: () => void;
  isPublicView?: boolean;
};

export function InvoiceView({
  resident,
  invoice,
  property,
  onClose,
  onUpdateInvoice,
  onEditResident,
  isPublicView = false
}: InvoiceViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: 'success' as 'success' | 'error', title: '', message: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Get month names - use API-provided values if available, otherwise calculate
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Parse invoice date first - this is our most reliable source
  const invoiceDateObj = invoice.date ? new Date(invoice.date) : new Date();
  const isValidInvoiceDate = !isNaN(invoiceDateObj.getTime());

  // Use monthName from API if available, otherwise parse from month field or date
  let invoiceMonthName: string;
  let invoiceYear: number;
  let currentMonthIndex: number;

  if ((invoice as any).monthName) {
    // API provides pre-formatted month name
    invoiceMonthName = (invoice as any).monthName;
    currentMonthIndex = monthNames.indexOf(invoiceMonthName);
    // If month name doesn't match exactly, fall back to date-based index
    if (currentMonthIndex === -1 && isValidInvoiceDate) {
      currentMonthIndex = invoiceDateObj.getMonth();
      invoiceMonthName = monthNames[currentMonthIndex];
    }
    invoiceYear = isValidInvoiceDate ? invoiceDateObj.getFullYear() : new Date().getFullYear();
  } else if (invoice.month) {
    // Fallback: parse from month field (handles "December 2025" format)
    const invoiceMonthStr = typeof invoice.month === 'string' ? invoice.month : String(invoice.month || '');
    const invoiceMonthParts = invoiceMonthStr.split(' ');
    invoiceMonthName = invoiceMonthParts[0];
    invoiceYear = parseInt(invoiceMonthParts[1]) || (isValidInvoiceDate ? invoiceDateObj.getFullYear() : new Date().getFullYear());
    currentMonthIndex = monthNames.indexOf(invoiceMonthName);
    // If month name doesn't match, fall back to date
    if (currentMonthIndex === -1 && isValidInvoiceDate) {
      currentMonthIndex = invoiceDateObj.getMonth();
      invoiceMonthName = monthNames[currentMonthIndex];
    }
  } else {
    // Last resort: use invoice date directly
    currentMonthIndex = isValidInvoiceDate ? invoiceDateObj.getMonth() : new Date().getMonth();
    invoiceMonthName = monthNames[currentMonthIndex];
    invoiceYear = isValidInvoiceDate ? invoiceDateObj.getFullYear() : new Date().getFullYear();
  }

  // Ensure we have valid values
  if (currentMonthIndex === -1) {
    currentMonthIndex = new Date().getMonth();
    invoiceMonthName = monthNames[currentMonthIndex];
  }

  // Use prevMonthName from API if available, otherwise calculate
  const previousMonthName = (invoice as any).prevMonthName ||
    monthNames[currentMonthIndex === 0 ? 11 : currentMonthIndex - 1];

  // Calculate due date (5th of current invoice month)
  const dueDay = resident?.lateStartDay || 5;
  const dueDate = new Date(invoiceYear, currentMonthIndex, dueDay);
  const dueDateStr = !isNaN(dueDate.getTime())
    ? dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : `${invoiceMonthName} ${dueDay}, ${invoiceYear}`;

  // Apply adjustments (ensure all values are numbers to prevent NaN)
  // Note: API returns dailyLateRate, frontend type uses lateFeeDailyRate - support both
  const lateFeeDailyRate = invoice.lateFeeDailyRate || (invoice as any).dailyLateRate || resident?.lateFeeDailyRate || 0;
  const adjustedBalance = (invoice.lastMonthBalance || 0) + (invoice.prevMonthBalanceAdjustment ?? 0);
  const baseLateFee = (invoice.daysLate || 0) * lateFeeDailyRate;
  const adjustedLateFee = baseLateFee + (invoice.prevMonthLateFeeAdjustment ?? 0);
  const baseElectricCharge = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
  const adjustedElectricCharge = baseElectricCharge + (invoice.prevMonthElectricAdjustment ?? 0);

  const total = adjustedBalance + (invoice.currentRent || 0) + adjustedLateFee + adjustedElectricCharge;
  const totalAdjustments = (invoice.prevMonthBalanceAdjustment ?? 0) +
                          (invoice.prevMonthLateFeeAdjustment ?? 0) +
                          (invoice.prevMonthElectricAdjustment ?? 0);

  // Format occupants
  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  const occupants = resident.occupants && resident.occupants.length > 0
    ? resident.occupants
    : [{
        id: 'occupant-1',
        ...parseName(resident.name),
        email: resident.email,
        phone: resident.phone,
      }];

  const formatOccupantsNames = (occupants: any[]) => {
    const names = occupants.map(occ => `${occ.firstName} ${occ.lastName}`.trim()).filter(name => name);
    if (names.length === 0) return 'Tenant';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast} and ${names[names.length - 1]}`;
  };

  const residentName = formatOccupantsNames(occupants);

  // Generate invoice number using same logic as ResidentDetails
  const generateInvoiceNumber = () => {
    // Extract house number from property address (e.g., "101" from "101 Main St")
    const addressParts = property.address.split(' ');
    const houseNumber = addressParts[0] || '';

    // Extract first letter of street name (e.g., "M" from "Main St")
    const streetName = addressParts[1] || '';
    const streetInitial = streetName.charAt(0).toUpperCase();

    // Get unit number from resident (default to empty string if no unit)
    const unitNumber = resident.aptNumber || resident.unit || '';

    // Parse invoice date to get MMDDYY
    const invoiceDate = new Date(invoice.date);
    const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
    const day = '01'; // Always 1st of the month
    const year = String(invoiceDate.getFullYear()).slice(-2);

    return `#${houseNumber}${streetInitial}${unitNumber}${month}${day}${year}`;
  };

  const invoiceNumber = generateInvoiceNumber();

  // Smart trim function to remove whitespace from captured image
  const smartTrim = async (dataUrl: string, { tol = 20, bleed = 12, paddingBottom = 60 } = {}) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    const src = document.createElement('canvas');
    src.width = img.width;
    src.height = img.height;
    const sctx = src.getContext('2d')!;
    sctx.drawImage(img, 0, 0);

    const { width, height } = src;
    const { data } = sctx.getImageData(0, 0, width, height);

    const isNearWhite = (i: number) => {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 8) return true;
      return (r >= 255 - tol && g >= 255 - tol && b >= 255 - tol);
    };

    const rowIsTrim = (y: number) => {
      let nonWhite = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (!isNearWhite(i)) nonWhite++;
        if (nonWhite > width * 0.002) return false;
      }
      return true;
    };

    const colIsTrim = (x: number, top: number, bottom: number) => {
      let nonWhite = 0;
      for (let y = top; y <= bottom; y++) {
        const i = (y * width + x) * 4;
        if (!isNearWhite(i)) nonWhite++;
        if (nonWhite > (bottom - top + 1) * 0.002) return false;
      }
      return true;
    };

    let top = 0, bottom = height - 1, left = 0, right = width - 1;
    while (top <= bottom && rowIsTrim(top)) top++;
    while (bottom >= top && rowIsTrim(bottom)) bottom--;
    while (left <= right && colIsTrim(left, top, bottom)) left++;
    while (right >= left && colIsTrim(right, top, bottom)) right--;

    // Bleed out a bit to avoid clipping
    left = Math.max(0, left - bleed);
    top = Math.max(0, top - bleed);
    right = Math.min(width - 1, right + bleed);
    bottom = Math.min(height - 1, bottom + bleed);

    const outW = Math.max(1, right - left + 1);
    const outH = Math.max(1, bottom - top + 1);

    // Trimmed canvas
    const trimmed = document.createElement('canvas');
    trimmed.width = outW;
    trimmed.height = outH;
    trimmed.getContext('2d')!.drawImage(src, left, top, outW, outH, 0, 0, outW, outH);

    // Bottom padding only
    const paddedW = outW;
    const paddedH = outH + paddingBottom;

    const padded = document.createElement('canvas');
    padded.width = paddedW;
    padded.height = paddedH;

    const pctx = padded.getContext('2d')!;
    pctx.fillStyle = '#fff';
    pctx.fillRect(0, 0, paddedW, paddedH);

    // Draw the trimmed canvas
    pctx.drawImage(trimmed, 0, 0);

    return { dataUrl: padded.toDataURL('image/png'), width: paddedW, height: paddedH };
  };

  const handlePrint = async () => {
    const invoiceElement = document.querySelector('.invoice-container') as HTMLElement;
    if (!invoiceElement) return;

    setIsPrinting(true);

    const originalBoxShadow = invoiceElement.style.boxShadow;

    // Store original box shadows for all invoice cards and header cards
    const invoiceCards = invoiceElement.querySelectorAll('.invoice-card, .invoice-header-card') as NodeListOf<HTMLElement>;
    const originalCardShadows = Array.from(invoiceCards).map(card => card.style.boxShadow);

    try {
      invoiceElement.style.boxShadow = 'none';

      // Remove box shadows from all invoice cards and header cards
      invoiceCards.forEach(card => {
        card.style.boxShadow = 'none';
      });

      // Get the bounding rect for accurate dimensions
      const rect = invoiceElement.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      console.log('[InvoiceView Print] Container dimensions:', containerWidth, 'x', containerHeight);

      const dataUrl = await toPng(invoiceElement, {
        pixelRatio: 2,
        cacheBust: false,
        width: containerWidth,
        height: containerHeight,
        style: {
          background: '#ffffff',
          margin: '0',
          padding: '0',
          boxShadow: 'none'
        },
        skipFonts: true,
        filter: (node) => {
          if (node.classList) {
            return !node.classList.contains('invoice-actions') &&
                   !node.classList.contains('invoice-actions-redesign') &&
                   !node.classList.contains('d-print-none');
          }
          return true;
        }
      }).catch(err => {
        console.error('[InvoiceView] toPng error details:', err);
        return toPng(invoiceElement, {
          pixelRatio: 2,
          cacheBust: false,
          width: containerWidth,
          height: containerHeight,
          style: {
            background: '#ffffff',
            margin: '0',
            padding: '0',
            boxShadow: 'none'
          },
          skipFonts: true,
          filter: (node) => {
            if (node.classList) {
              return !node.classList.contains('invoice-actions') &&
                     !node.classList.contains('invoice-actions-redesign') &&
                     !node.classList.contains('d-print-none') &&
                     !node.classList.contains('invoice-meter-snapshot-item') &&
                     !node.classList.contains('invoice-meter-gallery');
            }
            return node.nodeName !== 'IMG';
          }
        });
      });

      console.log('[InvoiceView Print] Capture complete');

      // Add 15pt padding on all sides
      const padding = 15;
      const pdfWidth = containerWidth + (padding * 2);
      const pdfHeight = containerHeight + (padding * 2);

      console.log('[InvoiceView Print] PDF dimensions:', pdfWidth, 'x', pdfHeight);

      // Create PDF with padding
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight]
      });

      // Center image with padding on all sides
      pdf.addImage(dataUrl, 'PNG', padding, padding, containerWidth, containerHeight, '', 'FAST');

      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } catch (error) {
      console.error('Error printing invoice:', error);
      window.print();
    } finally {
      invoiceElement.style.boxShadow = originalBoxShadow;
      // Restore original box shadows for all invoice cards
      invoiceCards.forEach((card, index) => {
        card.style.boxShadow = originalCardShadows[index];
      });
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    console.log('[InvoiceView] Download PDF clicked');

    if (!invoice.shareToken) {
      console.error('[InvoiceView] No share token available');
      setToastMessage({ type: 'error', title: 'Error', message: 'Unable to generate PDF. Share token not available.' });
      setShowToast(true);
      return;
    }

    setIsDownloading(true);

    // Generate friendly filename
    const invoiceDate = new Date(invoice.date);
    const month = invoiceDate.toLocaleDateString('en-US', { month: 'long' });
    const year = invoiceDate.getFullYear();
    const firstOccupant = occupants[0];
    const occupantName = `${firstOccupant.firstName}-${firstOccupant.lastName}`;
    const filename = `Invoice-${invoiceNumber}-${occupantName}-${month}-${year}.pdf`;

    try {
      // Get API URL from environment
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Pass current viewport width so PDF matches what user sees
      const viewportWidth = window.innerWidth;
      const pdfUrl = `${apiUrl}/api/invoices/shared/${invoice.shareToken}/pdf?viewport=${viewportWidth}`;

      console.log('[InvoiceView] Fetching PDF from:', pdfUrl);

      const response = await fetch(pdfUrl);

      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('[InvoiceView] PDF download complete');
    } catch (error) {
      console.error('[InvoiceView] Error downloading PDF:', error);
      setToastMessage({ type: 'error', title: 'Error', message: 'Failed to generate PDF. Please try again.' });
      setShowToast(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEdit = () => {
    const editPath = location.pathname.replace('/view', '/edit');
    navigate(editPath);
  };

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/i/${invoice.shareToken}`;
  };

  // Format invoice date as "December 1st, 2025"
  const getFormattedInvoiceDate = () => {
    const invoiceDate = new Date(invoice.date);
    const month = invoiceDate.toLocaleDateString('en-US', { month: 'long' });
    const day = invoiceDate.getDate();
    const year = invoiceDate.getFullYear();

    // Add ordinal suffix (1st, 2nd, 3rd, etc.)
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
  };

  const copyShareLink = async () => {
    const link = getShareLink();
    const formattedDate = getFormattedInvoiceDate();

    try {
      await copyToClipboard(link);
      setCopiedLink(true);

      // Show success toast using API messages
      const { title, message } = messages.invoices.linkCopied(formattedDate);
      setToastMessage({
        type: 'success',
        title,
        message
      });
      setShowToast(true);

      // Close modal after a brief delay to show the "Copied!" state
      setTimeout(() => {
        setShowShareModal(false);
        setCopiedLink(false);
      }, 800);
    } catch (err) {
      console.error('Failed to copy:', err);

      // Show failure toast using API messages
      const { title, message } = messages.invoices.linkCopyFailed(formattedDate);
      setToastMessage({
        type: 'error',
        title,
        message
      });
      setShowToast(true);

      // Close modal
      setShowShareModal(false);
    }
  };

  // Get all snapshots (support both legacy single snapshot and new array)
  const getSnapshots = (): string[] => {
    const snapshots: string[] = [];
    if (invoice.electricMeterSnapshots && invoice.electricMeterSnapshots.length > 0) {
      snapshots.push(...invoice.electricMeterSnapshots.slice(0, 4)); // Max 4
    } else if (invoice.electricMeterSnapshot) {
      snapshots.push(invoice.electricMeterSnapshot); // Legacy support
    }
    return snapshots;
  };

  const snapshots = getSnapshots();

  const handleViewSnapshot = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="invoice-view">
      {/* Back Button and Action Buttons */}
      <div className="invoice-actions d-print-none">
        {!isPublicView && (
          <Button onClick={() => navigate(-1)} variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2 btn-back me-auto">
            <ArrowLeft size={16} />
            <span>Back</span>
          </Button>
        )}

        {/* Desktop Action Buttons */}
        <div className="d-none d-md-flex gap-2">
          <Button onClick={() => setShowShareModal(true)} variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2">
            <Share2 size={16} />
            <span>Share</span>
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2" disabled={isDownloading}>
            {isDownloading ? <Spinner animation="border" size="sm" /> : <Download size={16} />}
            <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
          </Button>
          <Button onClick={handlePrint} variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2" disabled={isPrinting}>
            {isPrinting ? <Spinner animation="border" size="sm" /> : <FileText size={16} />}
            <span>{isPrinting ? 'Preparing...' : 'Print'}</span>
          </Button>
          {!isPublicView && (
            <Button onClick={handleEdit} variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2">
              <Edit2 size={16} />
              <span>Edit</span>
            </Button>
          )}
        </div>

        {/* Mobile Actions Dropdown */}
        <Dropdown className="d-md-none" align="start">
          <Dropdown.Toggle as="button" type="button" className="btn btn-tertiary d-flex align-items-center justify-content-between">
            <span>Actions</span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setShowShareModal(true)} className="d-flex align-items-center gap-2">
              <Share2 size={16} />
              <span>Share</span>
            </Dropdown.Item>
            <Dropdown.Item onClick={handleDownloadPDF} className="d-flex align-items-center gap-2" disabled={isDownloading}>
              {isDownloading ? <Spinner animation="border" size="sm" /> : <Download size={16} />}
              <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            </Dropdown.Item>
            <Dropdown.Item onClick={handlePrint} className="d-flex align-items-center gap-2" disabled={isPrinting}>
              {isPrinting ? <Spinner animation="border" size="sm" /> : <FileText size={16} />}
              <span>{isPrinting ? 'Preparing...' : 'Print'}</span>
            </Dropdown.Item>
            {!isPublicView && (
              <Dropdown.Item onClick={handleEdit} className="d-flex align-items-center gap-2">
                <Edit2 size={16} />
                <span>Edit</span>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Invoice Container */}
      <div className="invoice-container">
        {/* Header Card: Dark Navy with Amount Due */}
        <section className="invoice-header-card bg-gradient-navy">
          {/* Positive Quote */}
          <div className="invoice-quote-card">
            <div className="quote-text">
              "Home is where love resides, memories are created, and laughter never ends."
            </div>
          </div>

          <div className="invoice-header-content">
            <div className="invoice-header-left">
              <div className="invoice-id-section">
                <div className="invoice-heart-icon">
                  <Heart size={20} fill="currentColor" />
                </div>
                <div className="invoice-meta">
                  <div className="invoice-id">Invoice {invoiceNumber}</div>
                </div>
              </div>
              <div className="amount-due-section">
                <div className="amount-value">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="due-date-badge">Due {dueDateStr}</div>
              </div>
            </div>
            <div className="invoice-header-right">
              <div className="resident-info">
                <div className="resident-name">{residentName}</div>
                <div className="resident-address">
                  {resident.streetAddress}<br />
                  {resident.city}, {resident.state} {resident.zipCode}
                </div>
                <div className="unit-badge">
                  <span className="unit-label">Unit</span>
                  <span className="unit-number">{resident.aptNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Charges Breakdown Card */}
        <section className="invoice-card">
          <h5 className="card-header-with-icon">
            <span className="icon-circle icon-blue">
              <DollarSign size={16} strokeWidth={2.5} />
            </span>
            Charges Breakdown
          </h5>
          <table className="invoice-table">
            <tbody>
              <tr>
                <td>{invoiceMonthName}'s Rent</td>
                <td>${(invoice.currentRent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>{previousMonthName}'s Balance</td>
                <td className={adjustedBalance < 0 ? 'amount-credit' : ''}>${Math.abs(adjustedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              {invoice.daysLate > 0 && (
                <tr>
                  <td>
                    {previousMonthName}'s Late Fee <span className="text-muted">({invoice.daysLate || 0} days × ${lateFeeDailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day)</span>
                  </td>
                  <td>${adjustedLateFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              )}
              <tr>
                <td>
                  {previousMonthName}'s Electric <span className="text-muted">({(invoice.previousMonthElectricUsageKwh || 0).toLocaleString()} kWh × ${(invoice.electricRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kWh)</span>
                </td>
                <td>${adjustedElectricCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              {totalAdjustments !== 0 && (
                <tr>
                  <td>{previousMonthName} Adjustments</td>
                  <td className={totalAdjustments < 0 ? 'text-success' : 'text-danger'}>
                    {totalAdjustments < 0 ? 'Credit +' : 'Debit -'}${Math.abs(totalAdjustments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr className="invoice-table-total">
                <td>Total Due</td>
                <td>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Balance Details - Full Width (right after Breakdown) */}
        {adjustedBalance !== 0 && (
          <section className="invoice-card">
            <h5 className="card-header-with-icon">
              <span className="icon-circle icon-purple">
                <FileText size={16} strokeWidth={2.5} />
              </span>
              {previousMonthName}'s Balance
            </h5>
            <table className="invoice-table">
              <tbody>
                <tr>
                  <td>Balance as of {previousMonthName} 1st, {currentMonthIndex === 0 ? invoiceYear - 1 : invoiceYear}</td>
                  <td>${(invoice.lastMonthBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                {invoice.prevMonthPayments && invoice.prevMonthPayments.length > 0 &&
                  invoice.prevMonthPayments.map((payment, index) => {
                    const paymentDate = new Date(payment.date);
                    const formattedDate = paymentDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    });
                    return (
                      <tr key={payment.id || index}>
                        <td>
                          {previousMonthName} {formattedDate.split(' ')[1]} Payment
                          {payment.method && <span className="text-muted"> (via {payment.method})</span>}
                        </td>
                        <td className="amount-credit">-${Math.abs(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })
                }
                <tr className="invoice-table-purple">
                  <td>Remaining</td>
                  <td>${Math.abs(adjustedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Meter Snapshot - Full Width (right after Balance) */}
        <section className="invoice-card">
          <h5 className="card-header-with-icon">
            <span className="icon-circle icon-yellow">
              <Zap size={16} strokeWidth={2.5} />
            </span>
            Meter Snapshot
          </h5>
          {snapshots.length > 0 ? (
            <div className="invoice-meter-gallery">
              {snapshots.map((url, index) => (
                <div
                  key={index}
                  className="invoice-meter-snapshot-item"
                  onClick={() => handleViewSnapshot(url)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleViewSnapshot(url);
                    }
                  }}
                  aria-label={`View electric meter snapshot ${index + 1} of ${snapshots.length}`}
                >
                  <img src={url} alt={`Electric meter snapshot ${index + 1}`} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
              No snapshot available
            </div>
          )}
        </section>

        {/* Adjustments - Full Width */}
        {totalAdjustments !== 0 && (
          <section className="invoice-card">
            <h5 className="card-header-with-icon">
              <span className="icon-circle icon-green">
                <FileCheck size={16} strokeWidth={2.5} />
              </span>
              {previousMonthName}'s Adjustments
            </h5>
            <table className="invoice-table">
              <tbody>
                {(invoice.prevMonthBalanceAdjustment ?? 0) !== 0 && (
                  <tr>
                    <td>Balance Adjustment</td>
                    <td className={(invoice.prevMonthBalanceAdjustment ?? 0) < 0 ? 'text-success' : 'text-danger'}>
                      {(invoice.prevMonthBalanceAdjustment ?? 0) < 0 ? 'Credit +' : 'Debit -'}${Math.abs(invoice.prevMonthBalanceAdjustment ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {(invoice.prevMonthLateFeeAdjustment ?? 0) !== 0 && (
                  <tr>
                    <td>Late Fee Adjustment</td>
                    <td className={(invoice.prevMonthLateFeeAdjustment ?? 0) < 0 ? 'text-success' : 'text-danger'}>
                      {(invoice.prevMonthLateFeeAdjustment ?? 0) < 0 ? 'Credit +' : 'Debit -'}${Math.abs(invoice.prevMonthLateFeeAdjustment ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {(invoice.prevMonthElectricAdjustment ?? 0) !== 0 && (
                  <tr>
                    <td>Electric Adjustment</td>
                    <td className={(invoice.prevMonthElectricAdjustment ?? 0) < 0 ? 'text-success' : 'text-danger'}>
                      {(invoice.prevMonthElectricAdjustment ?? 0) < 0 ? 'Credit +' : 'Debit -'}${Math.abs(invoice.prevMonthElectricAdjustment ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="invoice-table-credit">
                  <td>Total Adjustments</td>
                  <td>{totalAdjustments < 0 ? 'Credit +' : 'Debit -'}${Math.abs(totalAdjustments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Payment Instructions */}
        <section className="invoice-payment-instructions">
          <h5 className="card-header-with-icon">
            <span className="icon-circle icon-orange">
              <AlertCircle size={16} strokeWidth={2.5} />
            </span>
            Payment Instructions
          </h5>
          <p>
            Please make payment by <strong>{dueDateStr}</strong> to avoid late fees.
            <br />
            Late fees of <strong>${lateFeeDailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per day</strong> will be applied after <strong>{dueDateStr}</strong>.
          </p>
        </section>
      </div>

      {/* Share Modal */}
      <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered className="share-invoice-modal">
        <Modal.Header closeButton className="border-0 pb-2">
          <Modal.Title className="d-flex align-items-center gap-2">
            <Share2 size={20} className="text-primary" />
            Share Invoice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-2">
          <p className="mb-2">
            <strong>{getFormattedInvoiceDate()} Invoice</strong>
          </p>
          <p className="mb-3 text-secondary">
            {isPublicView ? (
              <>
                Copy the link below to share this invoice with anyone you'd like. Anyone with this link can view the invoice.
              </>
            ) : (
              <>
                Copy the link below to share this invoice with residents or others who need access. Anyone with this link can view the invoice.
              </>
            )}
          </p>

          {/* Share Link Input */}
          <div className="share-link-container">
            <div className="share-link-input-wrapper">
              <input
                type="text"
                readOnly
                value={getShareLink()}
                onClick={(e) => e.currentTarget.select()}
                className="share-link-input"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-2">
          <Button variant="secondary" onClick={() => setShowShareModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={copyShareLink}
            className={`d-flex align-items-center gap-2 ${copiedLink ? 'btn-success' : ''}`}
          >
            {copiedLink ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Link
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <AppToast
        show={showToast}
        onClose={() => setShowToast(false)}
        title={toastMessage.title}
        message={toastMessage.message}
        variant={toastMessage.type}
      />
    </div>
  );
}
