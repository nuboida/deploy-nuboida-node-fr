import React, { useState, useEffect, useRef, memo } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { CreditCard, Mail, Phone, FileText, Info, RotateCcw } from 'lucide-react';
import { settingsService, ApiError } from '../../services';
import type { PaymentInfo } from '../../services/settings.service';
import { AppToast, ToastVariant } from '../common/AppToast';

interface PaymentInfoFormProps {
  propertyId?: string; // If provided, manages property-level settings
  onSave?: () => void;
}

const defaultPaymentInfo: PaymentInfo = {
  zelleEmail: '',
  zellePhone: '',
  paymentInstructions: 'Please send rent payment via Zelle by the 1st of each month',
  otherPaymentMethods: []
};

function PaymentInfoForm({ propertyId, onSave }: PaymentInfoFormProps) {
  // Log every render
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`[PaymentInfoForm] RENDER #${renderCountRef.current}`, { propertyId });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(defaultPaymentInfo);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDefault, setIsDefault] = useState(false); // True when showing account defaults

  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    variant: ToastVariant;
  }>({ show: false, title: '', message: '', variant: 'info' });

  const showToast = (title: string, message: string, variant: ToastVariant) => {
    setToast({ show: true, title, message, variant });
  };

  // Store original values for restore functionality
  const originalPaymentInfoRef = useRef<PaymentInfo>(defaultPaymentInfo);

  // Email validation
  const isValidEmail = (email: string) => {
    if (!email) return true; // Allow empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone number formatting
  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limited = cleaned.substring(0, 10);

    // Format as (555) 123 - 4567
    if (limited.length === 0) return '';
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)} - ${limited.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPaymentInfo({ ...paymentInfo, zellePhone: formatted });
  };

  // Payment method options
  const paymentMethodOptions = [
    'Cash',
    'Cash App',
    'Check',
    'Money Order',
    'PayPal',
    'Venmo'
  ];

  const handlePaymentMethodToggle = (method: string) => {
    const selected = paymentInfo.otherPaymentMethods || [];
    const newSelected = selected.includes(method)
      ? selected.filter(m => m !== method)
      : [...selected, method];
    setPaymentInfo({ ...paymentInfo, otherPaymentMethods: newSelected });
  };

  // Use ref to track last loaded propertyId to prevent unnecessary reloads
  const lastLoadedPropertyIdRef = useRef<string | undefined>(undefined);

  // Track mount/unmount
  useEffect(() => {
    console.log('[PaymentInfoForm] Component MOUNTED');
    return () => {
      console.log('[PaymentInfoForm] Component UNMOUNTED');
    };
  }, []);

  useEffect(() => {
    // Only reload if propertyId value actually changed
    const currentId = propertyId;
    const lastId = lastLoadedPropertyIdRef.current;

    console.log('[PaymentInfoForm] useEffect check:', {
      currentId,
      lastId,
      isInitialLoad: lastId === undefined,
      areEqual: currentId === lastId,
      willReload: currentId !== lastId || lastId === undefined
    });

    // Load on initial mount (lastId === undefined) OR when propertyId changes
    if (lastId === undefined || currentId !== lastId) {
      console.log('[PaymentInfoForm] Loading payment info (initial or propertyId changed)');
      lastLoadedPropertyIdRef.current = currentId;
      loadPaymentInfo();
    } else {
      console.log('[PaymentInfoForm] propertyId unchanged, skipping reload');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const loadPaymentInfo = async () => {
    setInitialLoading(true);
    try {
      if (propertyId) {
        // Load property-level settings (with fallback to account defaults)
        const response = await settingsService.getPropertyPaymentInfo(propertyId);
        if (response.data) {
          // Ensure otherPaymentMethods is always an array
          const normalizedData = {
            ...response.data,
            otherPaymentMethods: Array.isArray(response.data.otherPaymentMethods)
              ? response.data.otherPaymentMethods
              : []
          };
          setPaymentInfo(normalizedData);
          originalPaymentInfoRef.current = normalizedData;
          setIsDefault(response.isDefault);
        } else {
          setPaymentInfo(defaultPaymentInfo);
          originalPaymentInfoRef.current = defaultPaymentInfo;
          setIsDefault(false);
        }
      } else {
        // Load account-level settings
        const data = await settingsService.getPaymentInfo();
        if (data) {
          // Ensure otherPaymentMethods is always an array
          const normalizedData = {
            ...data,
            otherPaymentMethods: Array.isArray(data.otherPaymentMethods)
              ? data.otherPaymentMethods
              : []
          };
          setPaymentInfo(normalizedData);
          originalPaymentInfoRef.current = normalizedData;
        }
        setIsDefault(false);
      }
    } catch (error) {
      console.error('Error loading payment info:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const { id, $id, userId, propertyId: propId, ...paymentData } = paymentInfo;

      let response: any;
      if (propertyId) {
        // Save property-level settings
        response = await settingsService.savePropertyPaymentInfo(propertyId, paymentData);
        setIsDefault(false); // Now has custom settings
      } else {
        // Save account-level settings
        response = await settingsService.savePaymentInfo(paymentData);
      }

      // Extract API toast messages
      const toastTitle = response.title;
      const toastMessage = response.message;

      // Extract the actual data
      const savedData = response.data || response;

      // Ensure otherPaymentMethods is always an array
      // If API returns empty array but we sent data, keep the sent data
      const normalizedData = {
        ...savedData,
        otherPaymentMethods: Array.isArray(savedData.otherPaymentMethods) && savedData.otherPaymentMethods.length > 0
          ? savedData.otherPaymentMethods
          : (Array.isArray(paymentData.otherPaymentMethods) && paymentData.otherPaymentMethods.length > 0
              ? paymentData.otherPaymentMethods
              : [])
      };

      setPaymentInfo(normalizedData);
      originalPaymentInfoRef.current = normalizedData;
      showToast(toastTitle, toastMessage, 'success');
      if (onSave) onSave();
    } catch (error) {
      if (error instanceof ApiError) {
        const title = error.details?.title;
        const message = error.details?.message;
        showToast(title, message, 'error');
      } else {
        showToast('Error', 'Failed to save payment information', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevertToDefaults = async () => {
    if (!propertyId) return;

    setDeleteLoading(true);

    try {
      const response = await settingsService.deletePropertyPaymentInfo(propertyId);
      // Reload to get account defaults
      await loadPaymentInfo();

      // Extract API toast messages
      const toastTitle = response.title;
      const toastMessage = response.message;

      showToast(toastTitle, toastMessage, 'success');
    } catch (error) {
      if (error instanceof ApiError) {
        const title = error.details?.title;
        const message = error.details?.message;
        showToast(title, message, 'error');
      } else {
        showToast('Error', 'Failed to revert to defaults', 'error');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = () => {
    setPaymentInfo(originalPaymentInfoRef.current);
    setEmailTouched(false);
  };

  const handleResetToDefaults = async () => {
    if (propertyId) {
      // For property-level: Delete property-specific settings to use account defaults
      setDeleteLoading(true);
      try {
        const response = await settingsService.deletePropertyPaymentInfo(propertyId);
        // Reload to get account defaults
        await loadPaymentInfo();

        // Extract API toast messages
        const toastTitle = response.title;
        const toastMessage = response.message;

        showToast(toastTitle, toastMessage, 'success');
      } catch (error) {
        if (error instanceof ApiError) {
          const title = error.details?.title;
          const message = error.details?.message;
          showToast(title, message, 'error');
        } else {
          showToast('Error', 'Failed to reset to defaults', 'error');
        }
      } finally {
        setDeleteLoading(false);
      }
    } else {
      // For account-level: Save the hardcoded system defaults directly
      setLoading(true);
      try {
        const { id, $id, userId, propertyId: propId, ...paymentData } = defaultPaymentInfo;
        const response = await settingsService.savePaymentInfo(paymentData);

        // Use specific reset message (not the generic save message from API)
        const toastTitle = 'Reset to System Default';
        const toastMessage = 'Payment info has been reset to system defaults';

        // Ensure otherPaymentMethods is always an array
        const savedData = response.data || response;
        const normalizedData = {
          ...savedData,
          otherPaymentMethods: Array.isArray(savedData.otherPaymentMethods) && savedData.otherPaymentMethods.length > 0
            ? savedData.otherPaymentMethods
            : defaultPaymentInfo.otherPaymentMethods
        };

        setPaymentInfo(normalizedData);
        originalPaymentInfoRef.current = normalizedData;
        setEmailTouched(false);
        showToast(toastTitle, toastMessage, 'success');
        if (onSave) onSave();
      } catch (error) {
        if (error instanceof ApiError) {
          const title = error.details?.title;
          const message = error.details?.message;
          showToast(title, message, 'error');
        } else {
          showToast('Error', 'Failed to reset to defaults', 'error');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <Card className="border-0 shadow-lg mb-4 rounded-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="mb-1">Payment Information</h3>
              <p className="text-muted mb-0">Configure payment methods {propertyId ? 'for this property' : 'for your account'}</p>
            </div>
          {propertyId && !isDefault && (
            <button
              type="button"
              onClick={handleRevertToDefaults}
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 px-3 py-2"
              disabled={deleteLoading}
            >
              <RotateCcw size={14} />
              {deleteLoading ? 'Reverting...' : 'Use Account Defaults'}
            </button>
          )}
          </div>

        {initialLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="text-muted mt-3 mb-0">Loading payment information...</p>
          </div>
        ) : (
          <>
            {/* Account Defaults Indicator */}
            {propertyId && isDefault && (
              <div className="alert alert-info d-flex align-items-start gap-2 mb-3">
                <Info size={20} className="shrink-0 mt-1" />
                <div>
                  <strong>Using Account Defaults</strong>
                  <p className="mb-0 small">
                    This property is using your account's default payment settings.
                    Make changes below to create custom settings for this property.
                  </p>
                </div>
              </div>
            )}

            {/* Using div instead of form to avoid nested form issues when rendered inside PropertyForm */}
            <div className="d-flex flex-column gap-3" onKeyDown={handleKeyDown}>
          {/* Zelle Email Field */}
          <div>
            <label htmlFor="zelle-email" className="form-label">Zelle Email</label>
            <div className="position-relative">
              <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                <Mail size={20} />
              </div>
              <input
                id="zelle-email"
                type="email"
                className={`form-control ps-5 ${emailTouched && paymentInfo.zelleEmail && !isValidEmail(paymentInfo.zelleEmail) ? 'is-invalid' : ''} ${emailTouched && paymentInfo.zelleEmail && isValidEmail(paymentInfo.zelleEmail) ? 'is-valid' : ''}`}
                value={paymentInfo.zelleEmail}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, zelleEmail: e.target.value })}
                onBlur={() => setEmailTouched(true)}
                placeholder="owner@example.com"
              />
            </div>
            {emailTouched && paymentInfo.zelleEmail && !isValidEmail(paymentInfo.zelleEmail) && (
              <div className="invalid-feedback d-block">
                Please enter a valid email address
              </div>
            )}
          </div>

          {/* Zelle Phone Field */}
          <div>
            <label htmlFor="zelle-phone" className="form-label">Zelle Phone</label>
            <div className="position-relative">
              <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                <Phone size={20} />
              </div>
              <input
                id="zelle-phone"
                type="tel"
                className="form-control ps-5"
                value={paymentInfo.zellePhone}
                onChange={handlePhoneChange}
                placeholder="(555) 123 - 4567"
              />
            </div>
          </div>

          {/* Payment Instructions Field */}
          <div>
            <label htmlFor="payment-instructions" className="form-label">Payment Instructions</label>
            <div className="position-relative">
              <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                <FileText size={20} />
              </div>
              <textarea
                id="payment-instructions"
                className="form-control ps-5"
                rows={3}
                value={paymentInfo.paymentInstructions}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, paymentInstructions: e.target.value })}
                placeholder="Please send rent payment via Zelle by the 1st of each month"
              />
            </div>
          </div>

          {/* Other Payment Methods Field */}
          <div>
            <label className="form-label">
              Other Payment Methods
            </label>
            <div className="row g-2">
              {paymentMethodOptions.map((method) => {
                const selected = paymentInfo.otherPaymentMethods || [];
                const isChecked = selected.includes(method);
                return (
                  <div key={method} className="col-md-2 col-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`payment-method-${method.toLowerCase().replace(/\s+/g, '-')}`}
                        checked={isChecked}
                        onChange={() => handlePaymentMethodToggle(method)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`payment-method-${method.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {method}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="btn btn-tertiary"
              disabled={loading || deleteLoading}
            >
              {(loading || deleteLoading) ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Resetting...
                </>
              ) : (
                'Reset to System Default'
              )}
            </button>
            <button
              type="button"
              onClick={handleRestore}
              className="btn btn-secondary"
            >
              Restore Last Saved
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
          </>
        )}
        </Card.Body>
      </Card>

      <AppToast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
      />
    </>
  );
}

// Memoize to prevent unnecessary remounts when parent re-renders
// Custom comparison function to only compare propertyId value (not reference)
export default memo(PaymentInfoForm, (prevProps, nextProps) => {
  const shouldSkipRender = prevProps.propertyId === nextProps.propertyId && prevProps.onSave === nextProps.onSave;
  console.log('[PaymentInfoForm memo]', {
    prevPropertyId: prevProps.propertyId,
    nextPropertyId: nextProps.propertyId,
    propsEqual: prevProps.propertyId === nextProps.propertyId,
    shouldSkipRender
  });
  // Return true if props are equal (skip re-render), false if different (re-render)
  return shouldSkipRender;
});
