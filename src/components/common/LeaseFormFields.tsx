import { useState } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { FileText, Download, Loader2, X } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { downloadLease } from '../../services/resident.service';
import type { Unit } from '../../App';

export type LeaseFormData = {
  documentType: string;
  leaseType: string;
  unitId: string;
  startDate: string;
  endDate: string;
  notes: string;
  fileUrl: string;
  // Rent details (inherited from unit or editable)
  monthlyRent?: number; // Added for completeness
  securityDeposit: number; // Pre-filled from unit, editable
  securityDepositMultiplier: string; // Multiplier selector (0.5, 1, 1.5, 2.5, custom)
  securityDepositCustom: string; // Custom amount when multiplier is 'custom'
  lateStartDay: number;
  lateFeeDailyRate: number;
  electricRate: number;
};

export type LeaseValidationErrors = {
  startDate: boolean;
  unitId: boolean;
};

type LeaseFormFieldsProps = {
  formData: LeaseFormData;
  validationErrors: LeaseValidationErrors;
  units: Unit[];
  leaseFile: File | null;
  onFormChange: (field: keyof LeaseFormData, value: string | number) => void;
  onFileChange: (file: File | null) => void;
  onRemoveExistingFile?: () => void; // Callback to remove existing file
  onSave?: () => void;
  idPrefix?: string;
  isFirstLease?: boolean; // True if this is the first lease (category is read-only as Original)
  existingFileUrl?: string; // URL of existing file when editing
  existingFileName?: string; // Display name for existing file
  existingLeaseId?: string; // Lease ID for authenticated download
};

export function LeaseFormFields({
  formData,
  validationErrors,
  units,
  leaseFile,
  onFormChange,
  onFileChange,
  onRemoveExistingFile,
  onSave,
  idPrefix = 'lease',
  isFirstLease = false,
  existingFileUrl,
  existingFileName,
  existingLeaseId,
}: LeaseFormFieldsProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!existingLeaseId) return;

    setIsDownloading(true);
    try {
      const blob = await downloadLease(existingLeaseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = existingFileName || 'lease.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download lease:', error);
      alert('Failed to download lease document. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Textarea-specific handler to allow multiline input
  const handleTextAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSave) {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* File Display - shown when there's an existing file OR new file uploaded */}
      {(existingFileUrl && formData.fileUrl) || leaseFile ? (
        <div className="mb-2">
          <Form.Label className="fw-semibold">Lease Document</Form.Label>
          <div className="d-flex align-items-center gap-3 p-3 bg-light border rounded-3 position-relative">
            <div className="d-flex align-items-center justify-content-center bg-danger bg-opacity-10 rounded" style={{ width: '40px', height: '48px' }}>
              <FileText size={20} className="text-danger" />
            </div>
            <div className="flex-grow-1">
              <p className="small fw-semibold mb-0 text-dark">
                {leaseFile ? leaseFile.name : (existingFileName || 'Lease Document')}
              </p>
              <p className="small text-muted mb-0">PDF Document</p>
            </div>
            <button
              type="button"
              onClick={leaseFile ? () => onFileChange(null) : onRemoveExistingFile}
              className="file-dropzone__remove-btn"
              aria-label="Remove lease document"
            >
              <X size={20} />
            </button>
            {!leaseFile && existingLeaseId && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
                aria-label="Download lease PDF"
              >
                {isDownloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Document Upload - Show only when no file exists */
        <FileDropzone
          id={`${idPrefix}-document`}
          label="Lease Document PDF (Optional)"
          accept=".pdf,application/pdf"
          maxSize={10 * 1024 * 1024}
          file={leaseFile}
          onFileChange={(file) => {
            onFileChange(file);
            if (file) {
              const fileUrl = URL.createObjectURL(file);
              onFormChange('fileUrl', fileUrl);
            } else {
              onFormChange('fileUrl', '');
            }
          }}
          helperText="Drag and drop your lease PDF or select to browse"
        />
      )}

      <Row className="g-3">
        {/* Category */}
        <Col md={4}>
          <Form.Group>
            <Form.Label>Category</Form.Label>
            <Form.Select
              value={isFirstLease ? 'original' : formData.documentType}
              onChange={(e) => onFormChange('documentType', e.target.value)}
              disabled={isFirstLease}
              required
            >
              <option value="original">Original Lease</option>
              <option value="renewal">Renewal Lease</option>
            </Form.Select>
            {isFirstLease && (
              <Form.Text className="text-muted">
                First lease is always Original
              </Form.Text>
            )}
          </Form.Group>
        </Col>

        {/* Lease Type */}
        <Col md={4}>
          <Form.Group>
            <Form.Label>Lease Type</Form.Label>
            <Form.Select
              value={formData.leaseType}
              onChange={(e) => onFormChange('leaseType', e.target.value)}
              required
            >
              <option value="month-to-month">Month-to-Month</option>
              <option value="yearly">Yearly (Fixed Term)</option>
            </Form.Select>
          </Form.Group>
        </Col>

        {/* Start Date */}
        <Col md={4}>
          <Form.Group>
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              value={formData.startDate}
              onChange={(e) => onFormChange('startDate', e.target.value)}
              required
              isInvalid={validationErrors.startDate}
            />
            <Form.Control.Feedback type="invalid">
              Please select a start date
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        {/* Unit Selection - Radio Buttons */}
        <Col md={12}>
          <Form.Group>
            <Form.Label className="fw-semibold">Select Unit</Form.Label>
            {units.length === 0 ? (
              <div className="text-muted small">
                No units available. Please create units in Property Settings first.
              </div>
            ) : (
              <div className="d-flex gap-3 flex-wrap">
                {units.map(unit => (
                  <div
                    key={unit.id}
                    className={`border rounded-3 p-3 flex-fill ${formData.unitId === unit.id ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'} ${validationErrors.unitId && !formData.unitId ? 'border-danger' : ''}`}
                    style={{ cursor: 'pointer', minWidth: '200px' }}
                    onClick={() => onFormChange('unitId', unit.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onFormChange('unitId', unit.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${unit.number}, ${unit.status}, $${unit.rentAmount} per month`}
                  >
                    <div className="d-flex align-items-center">
                      <Form.Check
                        type="radio"
                        id={`${idPrefix}-unit-${unit.id}`}
                        name={`${idPrefix}-unit`}
                        checked={formData.unitId === unit.id}
                        onChange={() => onFormChange('unitId', unit.id)}
                        className="mb-0"
                      />
                      <label htmlFor={`${idPrefix}-unit-${unit.id}`} className="d-flex gap-2 align-items-center flex-fill mb-0 ms-2" style={{ cursor: 'pointer' }}>
                        <strong>{unit.number}</strong>
                        <span className="fw-semibold text-primary">${unit.rentAmount?.toLocaleString() || 0}/mo</span>
                        <span className={`badge ms-auto ${unit.status === 'available' ? 'bg-success' : unit.status === 'occupied' ? 'bg-secondary' : 'bg-warning'} text-white`}>
                          {unit.status === 'available' ? 'Available' : unit.status === 'occupied' ? 'Occupied' : 'Maintenance'}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {validationErrors.unitId && !formData.unitId && (
              <div className="text-danger small mt-2">
                Please select a unit
              </div>
            )}
          </Form.Group>
        </Col>

        {/* Rent Details - shown after unit selection */}
        {formData.unitId && (
          <>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Security Deposit</Form.Label>
                <div className="d-flex gap-3">
                  {/* Multiplier Dropdown */}
                  <div className="flex-grow-1">
                    <Form.Select
                      value={formData.securityDepositMultiplier || 'custom'}
                      onChange={(e) => onFormChange('securityDepositMultiplier', e.target.value)}
                    >
                      <option value="0.5">0.5x Monthly Rent</option>
                      <option value="1">1x Monthly Rent</option>
                      <option value="1.5">1.5x Monthly Rent</option>
                      <option value="2.5">2.5x Monthly Rent</option>
                      <option value="custom">Custom Amount</option>
                    </Form.Select>
                  </div>

                  {/* Calculated or Custom Amount Display */}
                  <div className="flex-grow-1">
                    {formData.securityDepositMultiplier === 'custom' ? (
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.securityDepositCustom}
                          onChange={(e) => onFormChange('securityDepositCustom', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <Form.Control
                        type="text"
                        value={`$${formData.securityDeposit.toFixed(2)}`}
                        disabled
                        className="bg-light"
                      />
                    )}
                  </div>
                </div>
                <Form.Text className="text-muted">
                  Pre-filled from unit, but can be adjusted for this lease
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Late Start Day</Form.Label>
                <Form.Select
                  value={formData.lateStartDay}
                  onChange={(e) => onFormChange('lateStartDay', parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(day => (
                    <option key={day} value={day}>Day {day} of the month</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Late fees begin after this day
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Daily Late Fee</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.lateFeeDailyRate}
                    onChange={(e) => onFormChange('lateFeeDailyRate', parseFloat(e.target.value) || 0)}
                    placeholder="5.00"
                  />
                  <span className="input-group-text">/day</span>
                </div>
                <Form.Text className="text-muted">
                  Charged per day after late start day
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Electric Rate</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.electricRate}
                    onChange={(e) => onFormChange('electricRate', parseFloat(e.target.value) || 0)}
                    placeholder="0.12"
                  />
                  <span className="input-group-text">/kWh</span>
                </div>
                <Form.Text className="text-muted">
                  Rate charged per kilowatt-hour
                </Form.Text>
              </Form.Group>
            </Col>
          </>
        )}
      </Row>

      {/* Notes */}
      <Form.Group>
        <Form.Label>Notes (Optional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={formData.notes}
          onChange={(e) => onFormChange('notes', e.target.value)}
          onKeyDown={handleTextAreaKeyDown}
          placeholder="Additional lease terms or notes..."
        />
        <Form.Text className="text-muted">
          Press Ctrl+Enter (or Cmd+Enter) to submit
        </Form.Text>
      </Form.Group>
    </div>
  );
}
