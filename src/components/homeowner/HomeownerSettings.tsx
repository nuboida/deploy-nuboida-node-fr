import React, { useState, useEffect, useRef } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { Settings, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { PageHeader, AccountMenuItem } from '../common/PageHeader';
import { TabNavigation } from '../common/TabNavigation';
import { AppToast, ToastVariant } from '../common/AppToast';
import { LABELS } from '../../config/labels';
import { authService, ApiError } from '../../services';
import { PasswordRequirements, getPasswordRequirements, allRequirementsMet } from '../common/PasswordRequirements';
import PaymentInfoForm from './PaymentInfoForm';
import ReminderSettings from './ReminderSettings';

interface OwnerSettingsProps {
  onBack: () => void;
  initialTab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
  accountMenuItems?: AccountMenuItem[];
  onLogout?: () => void;
}

export type SettingsTab = 'profile' | 'password' | 'payment' | 'reminders';

const validTabs: SettingsTab[] = ['profile', 'password', 'payment', 'reminders'];

export function isValidSettingsTab(tab: string | undefined): tab is SettingsTab {
  return tab !== undefined && validTabs.includes(tab as SettingsTab);
}

export default function HomeownerSettings({ onBack, initialTab = 'profile', onTabChange, accountMenuItems, onLogout }: OwnerSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync activeTab when initialTab changes (from URL navigation)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle tab changes - update URL via callback
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

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
  const originalProfileRef = useRef({ name: '', email: '' });

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password requirements
  const passwordRequirements = getPasswordRequirements(newPassword);
  const allPasswordRequirementsMet = allRequirementsMet(passwordRequirements);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // Load current user data on component mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const userData = {
        name: currentUser.name || '',
        email: currentUser.email || '',
      };
      setName(userData.name);
      setEmail(userData.email);
      originalProfileRef.current = userData;
    }
  }, []);

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile' },
    { id: 'password' as SettingsTab, label: 'Password' },
    { id: 'payment' as SettingsTab, label: 'Payment Info' },
    { id: 'reminders' as SettingsTab, label: 'Reminders' },
  ];

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      await authService.updateProfile({ name, email });
      originalProfileRef.current = { name, email };
      showToast('Success', 'Profile updated successfully!', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        const title = err.details?.title;
        const message = err.details?.message;
        showToast(title, message, 'error');
      } else {
        showToast('Error', 'Failed to update profile', 'error');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileRestore = () => {
    setName(originalProfileRef.current.name);
    setEmail(originalProfileRef.current.email);
    setEmailTouched(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPasswordRequirementsMet) {
      showToast('Validation Error', 'Please meet all password requirements', 'warning');
      return;
    }
    if (!passwordsMatch) {
      showToast("Passwords Don't Match", "The passwords you entered don't match", 'warning');
      return;
    }

    setPasswordLoading(true);

    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      showToast('Success', 'Password changed successfully!', 'success');
      handlePasswordClear();
    } catch (err) {
      if (err instanceof ApiError) {
        const title = err.details?.title;
        const message = err.details?.message;
        showToast(title, message, 'error');
      } else {
        showToast('Error', 'Failed to change password', 'error');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordClear = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewPasswordTouched(false);
    setConfirmPasswordTouched(false);
  };

  return (
    <div className="bg-page min-vh-100">
      <PageHeader
        title={LABELS.PROFILE_AND_SETTINGS}
        subtitle="Manage your profile, payment information, and reminders"
        icon={<Settings size={26} color="white" />}
        onBack={onBack}
        accountMenuItems={accountMenuItems}
        onLogout={onLogout}
      />

      <main id="main-content" className="container-xl px-4 py-4 d-flex flex-column gap-4">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => handleTabChange(tabId as SettingsTab)}
        />

        <div className="tab-content-section">
          {activeTab === 'profile' && (
            <Card className="border-0 shadow-lg mb-4 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h3 className="mb-1">Profile Information</h3>
                    <p className="text-muted mb-0">Manage your account details</p>
                  </div>
                </div>

              <form onSubmit={handleProfileSave} className="d-flex flex-column gap-3">
                <div className="row g-3">
                  {/* Full Name Field */}
                  <div className="col-md-6">
                    <label htmlFor="profile-name" className="form-label">Full Name</label>
                    <div className="position-relative">
                      <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                        <User size={20} />
                      </div>
                      <input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-control ps-5"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="col-md-6">
                    <label htmlFor="profile-email" className="form-label">Email Address</label>
                    <div className="position-relative">
                      <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                        <Mail size={20} />
                      </div>
                      <input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        className={`form-control ps-5 ${emailTouched && email && !isValidEmail(email) ? 'is-invalid' : ''} ${emailTouched && isValidEmail(email) ? 'is-valid' : ''}`}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    {emailTouched && email && !isValidEmail(email) && (
                      <div className="invalid-feedback d-block">
                        Please enter a valid email address
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    onClick={handleProfileRestore}
                    className="btn btn-secondary"
                  >
                    Restore Last Saved
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                    {profileLoading ? (
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
              </form>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card className="border-0 shadow-lg mb-4 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h3 className="mb-1">Change Password</h3>
                    <p className="text-muted mb-0">Update your account password</p>
                  </div>
                </div>

              <form onSubmit={handlePasswordChange} className="d-flex flex-column gap-3">
                {/* Current Password - Full Width */}
                <div>
                  <label htmlFor="current-password" className="form-label">Current Password</label>
                  <div className="position-relative">
                    <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                      <Lock size={20} />
                    </div>
                    <input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="form-control ps-5 pe-action-button"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="btn btn-link position-absolute p-0 z-3 end-action-button top-3"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  {/* New Password */}
                  <div className="col-md-6">
                    <label htmlFor="new-password" className="form-label">New Password</label>
                    <div className="position-relative">
                      <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                        <Lock size={20} />
                      </div>
                      <input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setNewPasswordFocused(true)}
                        onBlur={() => {
                          setNewPasswordFocused(false);
                          setNewPasswordTouched(true);
                        }}
                        className={`form-control ps-5 ${(newPasswordTouched && !newPasswordFocused && newPassword.length > 0) ? 'pe-action-button-validated' : 'pe-action-button'} ${newPasswordTouched && !newPasswordFocused && newPassword.length > 0 && !allPasswordRequirementsMet ? 'is-invalid' : ''} ${newPasswordTouched && !newPasswordFocused && newPassword.length > 0 && allPasswordRequirementsMet ? 'is-valid' : ''}`}
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`btn btn-link position-absolute p-0 z-3 top-3 ${(newPasswordTouched && !newPasswordFocused && newPassword.length > 0) ? 'end-action-button-validated' : 'end-action-button'}`}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="col-md-6">
                    <label htmlFor="confirm-password" className="form-label">Confirm New Password</label>
                    <div className="position-relative">
                      <div className="position-absolute start-0 ms-3 text-muted top-3" style={{ pointerEvents: 'none' }}>
                        <Lock size={20} />
                      </div>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setConfirmPasswordTouched(true)}
                        className={`form-control ps-5 ${(confirmPasswordTouched && confirmPassword.length > 0) ? 'pe-action-button-validated' : 'pe-action-button'} ${confirmPasswordTouched && confirmPassword && !passwordsMatch ? 'is-invalid' : ''} ${confirmPasswordTouched && passwordsMatch ? 'is-valid' : ''}`}
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`btn btn-link position-absolute p-0 z-3 top-3 ${(confirmPasswordTouched && confirmPassword.length > 0) ? 'end-action-button-validated' : 'end-action-button'}`}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {confirmPasswordTouched && confirmPassword && !passwordsMatch && (
                      <div className="invalid-feedback d-block">
                        Passwords do not match
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Requirements */}
                {(newPasswordFocused || (newPasswordTouched && newPassword.length > 0)) && (
                  <PasswordRequirements
                    requirements={passwordRequirements}
                    touched={newPasswordTouched}
                    hasPassword={newPassword.length > 0}
                  />
                )}

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    onClick={handlePasswordClear}
                    className="btn btn-secondary"
                  >
                    Clear
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                    {passwordLoading ? (
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
              </form>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'payment' && <PaymentInfoForm />}
          {activeTab === 'reminders' && <ReminderSettings />}
        </div>
      </main>

      <AppToast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        autohide
        delay={5000}
      />
    </div>
  );
}
