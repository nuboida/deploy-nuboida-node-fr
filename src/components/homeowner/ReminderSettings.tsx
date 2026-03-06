import React, { useState, useEffect, useRef } from 'react';
import { Card, Spinner, Modal } from 'react-bootstrap';
import { Bell, Calendar, Zap, AlertCircle, MessageSquare, Clock, Info } from 'lucide-react';
import { settingsService, ApiError } from '../../services';
import type { Reminder } from '../../services/settings.service';
import { AppToast, ToastVariant } from '../common/AppToast';

const defaultReminders: Reminder[] = [
  {
    reminderType: 'electric_meter',
    daysBefore: 1,
    enabled: true,
    customMessage: 'Remember to read the electric meter before generating next month\'s invoice'
  },
  {
    reminderType: 'invoice_due',
    daysBefore: 1,
    enabled: true,
    customMessage: 'Rent payment is due'
  },
  {
    reminderType: 'late_fee',
    daysBefore: 1,
    enabled: true,
    customMessage: 'Late fees will begin accruing'
  }
];

export default function ReminderSettings() {
  const [reminders, setReminders] = useState<Reminder[]>(defaultReminders);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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
  const originalRemindersRef = useRef<Reminder[]>(defaultReminders);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setInitialLoading(true);
    try {
      const data = await settingsService.getReminders();
      if (data && data.length > 0) {
        setReminders(data);
        originalRemindersRef.current = JSON.parse(JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Strip id, $id, and userId from reminders for the API call
      const remindersToSave = reminders.map(({ id, $id, userId, ...rest }) => rest);
      const response = await settingsService.saveReminders(remindersToSave);

      // Extract API toast messages
      const toastTitle = response.title;
      const toastMessage = response.message;

      // Extract the actual data
      const savedData = response.data || response;

      setReminders(savedData);
      originalRemindersRef.current = JSON.parse(JSON.stringify(savedData));
      showToast(toastTitle, toastMessage, 'success');
    } catch (error) {
      if (error instanceof ApiError) {
        const title = error.details?.title;
        const message = error.details?.message;
        showToast(title, message, 'error');
      } else {
        showToast('Error', 'Failed to save reminder settings', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    setReminders(JSON.parse(JSON.stringify(originalRemindersRef.current)));
  };

  const handleResetToDefaults = async () => {
    setLoading(true);
    try {
      // Save the defaults directly without relying on state update
      const remindersToSave = defaultReminders.map(({ id, $id, userId, ...rest }) => rest);
      const response = await settingsService.saveReminders(remindersToSave);

      // Use specific reset message (not the generic save message from API)
      const toastTitle = 'Reset to System Default';
      const toastMessage = 'Reminders have been reset to system defaults';

      // Extract the actual data
      const savedData = response.data || response;

      setReminders(JSON.parse(JSON.stringify(savedData)));
      originalRemindersRef.current = JSON.parse(JSON.stringify(savedData));
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
      setLoading(false);
    }
  };

  const updateReminder = (index: number, field: keyof Reminder, value: any) => {
    const updated = [...reminders];
    updated[index] = { ...updated[index], [field]: value };
    setReminders(updated);
  };

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSave();
    }
  };

  const simulateReminder = (reminder: Reminder) => {
    // Simulate showing a notification
    alert(`🔔 REMINDER SIMULATION\n\nType: ${getReminderLabel(reminder.reminderType)}\nDays Before: ${reminder.daysBefore}\n\nMessage:\n${reminder.customMessage}`);
  };

  const getReminderLabel = (type: string) => {
    switch (type) {
      case 'electric_meter':
        return 'Electric Meter Reading';
      case 'invoice_due':
        return 'Invoice Due Date';
      case 'late_fee':
        return 'Late Fee Start';
      default:
        return type;
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'electric_meter':
        return <Zap size={20} className="text-warning" />;
      case 'invoice_due':
        return <Calendar size={20} className="text-info" />;
      case 'late_fee':
        return <AlertCircle size={20} className="text-danger" />;
      default:
        return <Bell size={20} className="text-primary" />;
    }
  };

  return (
    <>
      <Card className="border-0 shadow-lg mb-4 rounded-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="mb-1">Reminder Settings</h3>
              <p className="text-muted mb-0">Configure automated reminders for invoices and payments</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-link text-decoration-none d-flex align-items-center gap-1"
                onClick={() => setShowInfoModal(true)}
              >
                <Info size={16} />
                <span className="small">How Reminders Work</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSimulation(!showSimulation)}
              >
                {showSimulation ? 'Hide' : 'Show'} Simulation
              </button>
            </div>
          </div>

        {initialLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="text-muted mt-3 mb-0">Loading reminder settings...</p>
          </div>
        ) : (
          <>
            <div className="alert alert-info mb-4">
              <small>
                <strong>Note:</strong> Reminders are currently simulated. In a production environment,
                these would be sent via email or in-app notifications based on the schedule you set.
              </small>
            </div>

            <div className="space-y-3" onKeyDown={handleKeyDown}>
          {reminders.map((reminder, index) => (
            <div key={index} className="glass-card p-3 mb-3">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  {getReminderIcon(reminder.reminderType)}
                  <h5 className="mb-0 ms-2">{getReminderLabel(reminder.reminderType)}</h5>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={reminder.enabled}
                    onChange={(e) => updateReminder(index, 'enabled', e.target.checked)}
                  />
                  <label className="form-check-label">
                    {reminder.enabled ? 'Enabled' : 'Disabled'}
                  </label>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor={`days-before-${index}`} className="form-label">Days Before</label>
                  <div className="position-relative">
                    <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                      <Clock size={20} />
                    </div>
                    <select
                      id={`days-before-${index}`}
                      className="form-select ps-5"
                      value={reminder.daysBefore}
                      onChange={(e) => updateReminder(index, 'daysBefore', parseInt(e.target.value))}
                      disabled={!reminder.enabled}
                    >
                      {[...Array(15)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} day{i + 1 > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-md-8">
                  <label htmlFor={`custom-message-${index}`} className="form-label">Custom Message</label>
                  <div className="position-relative">
                    <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                      <MessageSquare size={20} />
                    </div>
                    <input
                      id={`custom-message-${index}`}
                      type="text"
                      className="form-control ps-5"
                      value={reminder.customMessage}
                      onChange={(e) => updateReminder(index, 'customMessage', e.target.value)}
                      disabled={!reminder.enabled}
                    />
                  </div>
                </div>
              </div>

              {showSimulation && reminder.enabled && (
                <button
                  className="btn btn-secondary btn-sm mt-2"
                  onClick={() => simulateReminder(reminder)}
                >
                  <Bell size={14} className="me-1" />
                  Test Reminder
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="btn btn-tertiary"
          >
            Reset to System Default
          </button>
          <button
            type="button"
            onClick={handleRestore}
            className="btn btn-secondary"
          >
            Restore Last Saved
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
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
          </>
        )}
        </Card.Body>
      </Card>

      {/* Info Modal */}
      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>How Reminders Work</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="mb-3">
            <li className="mb-2">
              <strong>Electric Meter:</strong> Reminds you to read the meter before invoice generation
            </li>
            <li className="mb-2">
              <strong>Invoice Due:</strong> Notifies tenants when rent payment is approaching
            </li>
            <li className="mb-2">
              <strong>Late Fee:</strong> Alerts when late fees will begin accruing
            </li>
          </ul>
          <p className="text-muted small mb-0">
            In production, these would be automated via cron jobs or scheduled functions.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowInfoModal(false)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>

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
