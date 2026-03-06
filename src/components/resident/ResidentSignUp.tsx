import { useState } from 'react';
import { UserPlus, Home, Lock, Mail, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService, ApiError, setCurrentPortal } from '../../services';
import { AuthLayout } from '../common/AuthLayout';
import { AppToast } from '../common/AppToast';
import { PasswordRequirements, getPasswordRequirements, allRequirementsMet } from '../common/PasswordRequirements';
import { PORTAL_LABELS, LABELS } from '../../config/labels';
import { messages } from '../../utils/messages';

export function ResidentSignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', isError: false });
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCancel = () => {
    navigate('/resident/sign-in');
  };

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password requirements
  const passwordRequirements = getPasswordRequirements(password);
  const allPasswordRequirementsMet = allRequirementsMet(passwordRequirements);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const showErrorToast = (title: string, description: string) => {
    setToastMessage({ title, description, isError: true });
    setShowToast(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name
    if (!name.trim() || name.trim().length < 1) {
      const msg = messages.auth.validationError();
      showErrorToast(msg.title, msg.message);
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      const msg = messages.auth.validationError();
      showErrorToast(msg.title, msg.message);
      return;
    }

    // Validate password requirements
    if (!allPasswordRequirementsMet) {
      const msg = messages.auth.validationError();
      showErrorToast(msg.title, msg.message);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      const msg = messages.auth.passwordUpdateMismatch();
      showErrorToast(msg.title, msg.message);
      return;
    }

    setIsLoading(true);

    try {
      // Set portal type before authentication
      setCurrentPortal('resident');

      const response = await authService.signUp(email, password, name);

      // Store title and message from API for welcome toast after reload
      if (response.title && response.message) {
        localStorage.setItem('welcome_toast_renter', JSON.stringify({
          title: response.title,
          message: response.message,
        }));
      } else {
        // Fallback to centralized welcome message
        const msg = messages.auth.signupSuccess(name);
        localStorage.setItem('welcome_toast_renter', JSON.stringify({
          title: msg.title,
          message: msg.message,
        }));
      }

      // Force a full page reload to update authentication state
      window.location.href = '/resident/dashboard';
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          const msg = messages.generic.error();
          showErrorToast(msg.title, 'Unable to connect to server. Please check if the API is running.');
        } else {
          // Use API response or fallback to centralized signup failed message
          const errorTitle = err.details?.title;
          const errorMessage = err.details?.error || err.details?.message;
          if (errorTitle && errorMessage) {
            showErrorToast(errorTitle, errorMessage);
          } else {
            const msg = messages.auth.signupFailed();
            showErrorToast(msg.title, msg.message);
          }
        }
      } else {
        const msg = messages.generic.error();
        showErrorToast(msg.title, msg.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout>
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/resident/sign-in')}
          className="btn btn-link text-white p-0 mb-3"
          aria-label="Back to sign in"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back to sign in
        </button>

      {/* Logo/Icon */}
      <div className="d-flex justify-content-center mb-4 login-icon-wrapper" role="img" aria-label={PORTAL_LABELS.RESIDENT}>
        <div className="icon-container icon-container-lg">
          <Home size={40} aria-hidden="true" />
        </div>
      </div>

      {/* Main Card */}
      <div className="login-card">
        <div className="text-center d-flex flex-column">
          <h1 className="h2 text-gradient-primary mb-0">
            {LABELS.CREATE_RESIDENT_ACCOUNT}
          </h1>
          <span>
            Get access to your rental portal
          </span>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {/* Name Field */}
          <div>
            <label className="form-label">
              Full Name
            </label>
            <div>
              <div className="position-relative">
                <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ pointerEvents: 'none' }}>
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  placeholder="Enter your full name"
                  required
                  className={`form-control ps-5 ${nameTouched && (!name.trim() || name.trim().length < 1) ? 'is-invalid' : ''} ${nameTouched && name.trim().length >= 1 ? 'is-valid' : ''}`}
                />
              </div>
              {nameTouched && (!name.trim() || name.trim().length < 1) && (
                <div className="invalid-feedback d-block">
                  Please enter your full name
                </div>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="form-label">
              Email
            </label>
            <div>
              <div className="position-relative">
                <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ pointerEvents: 'none' }}>
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="Enter your email"
                  required
                  className={`form-control ps-5 ${emailTouched && email && !isValidEmail(email) ? 'is-invalid' : ''} ${emailTouched && isValidEmail(email) ? 'is-valid' : ''}`}
                />
              </div>
              {emailTouched && email && !isValidEmail(email) && (
                <div className="invalid-feedback d-block">
                  Please enter a valid email address
                </div>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="form-label">
              Password
            </label>
            <div className="position-relative">
              <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => {
                  setPasswordFocused(true);
                  setPasswordTouched(true);
                }}
                onBlur={() => {
                  setPasswordFocused(false);
                }}
                placeholder="Create a password"
                required
                className={`form-control ps-5 ${(passwordTouched && !passwordFocused && password.length > 0) ? 'pe-action-button-validated' : 'pe-action-button'} ${passwordTouched && !passwordFocused && password.length > 0 && !allPasswordRequirementsMet ? 'is-invalid' : ''} ${passwordTouched && !passwordFocused && password.length > 0 && allPasswordRequirementsMet ? 'is-valid' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`btn btn-link position-absolute top-50 translate-middle-y p-0 z-3 ${(passwordTouched && !passwordFocused && password.length > 0) ? 'end-action-button-validated' : 'end-action-button'}`}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Requirements Checklist - Show when focused or after blur if password entered */}
            {(passwordFocused || (passwordTouched && password.length > 0)) && (
              <PasswordRequirements
                requirements={passwordRequirements}
                touched={passwordTouched}
                hasPassword={password.length > 0}
              />
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="form-label">
              Confirm Password
            </label>
            <div>
              <div className="position-relative">
                <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ pointerEvents: 'none' }}>
                  <Lock size={20} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmPasswordTouched(true)}
                  placeholder="Confirm your password"
                  required
                  className={`form-control ps-5 ${(confirmPasswordTouched && confirmPassword.length > 0) ? 'pe-action-button-validated' : 'pe-action-button'} ${confirmPasswordTouched && confirmPassword && !passwordsMatch ? 'is-invalid' : ''} ${confirmPasswordTouched && passwordsMatch ? 'is-valid' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`btn btn-link position-absolute top-50 translate-middle-y p-0 z-3 ${(confirmPasswordTouched && confirmPassword.length > 0) ? 'end-action-button-validated' : 'end-action-button'}`}
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

          {/* Action Buttons */}
          <div className="d-flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary w-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`btn btn-primary w-100 ${isLoading ? 'disabled' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="login-spinner" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div className="d-flex flex-column align-items-start">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => navigate('/resident/sign-in')}
            className="btn btn-link p-0"
          >
            Sign in
          </button>
        </div>
      </div>

      {/* Terms Notice */}
      <div className="auth-terms-notice mt-4 p-4 rounded-3 text-center bg-white bg-opacity-10 border border-white border-opacity-25" role="complementary" aria-label="Terms and privacy information">
        <p className="mb-0 small">
          By creating an account, you agree to our{' '}
          <a href="/terms-of-service" onClick={(e) => { e.preventDefault(); navigate('/terms-of-service'); }}>
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigate('/privacy-policy'); }}>
            Privacy Policy
          </a>
        </p>
      </div>

      {/* Homeowner Portal Link */}
      <div className="mt-3 d-flex flex-column align-items-center">
        <span className="text-muted">{LABELS.ARE_YOU_HOMEOWNER}</span>
        <button
          type="button"
          onClick={() => navigate('/homeowner/sign-up')}
          className="btn btn-link p-0"
        >
          {LABELS.GO_TO_HOMEOWNER_PORTAL}
        </button>
      </div>
      </AuthLayout>

      {/* Toast Notification - Rendered outside AuthLayout to avoid z-index stacking context */}
      <AppToast
        show={showToast}
        onClose={() => setShowToast(false)}
        title={toastMessage.title}
        message={toastMessage.description}
        variant={toastMessage.isError ? 'error' : 'success'}
      />
    </>
  );
}
