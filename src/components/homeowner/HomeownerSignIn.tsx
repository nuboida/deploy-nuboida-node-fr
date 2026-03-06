import { useState, useEffect } from 'react';
import { LogIn, Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService, ApiError, setCurrentPortal, clearAuthToken } from '../../services';
import { AuthLayout } from '../common/AuthLayout';
import { AppToast } from '../common/AppToast';
import { PORTAL_LABELS, LABELS } from '../../config/labels';
import { messages } from '../../utils/messages';

export function HomeownerSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [toastVariant, setToastVariant] = useState<'error' | 'success'>('error');
  const [showPassword, setShowPassword] = useState(false);

  // Check for account deleted toast on mount
  useEffect(() => {
    const accountDeletedToast = localStorage.getItem('account_deleted_toast');
    if (accountDeletedToast) {
      try {
        const { title, message } = JSON.parse(accountDeletedToast);
        setToastMessage({ title, description: message });
        setToastVariant('success');
        setShowToast(true);
      } catch {
        // Ignore parsing errors
      }
      localStorage.removeItem('account_deleted_toast');
    }
  }, []);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showErrorToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setToastVariant('error');
    setShowToast(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    if (!isValidEmail(email)) {
      const msg = messages.auth.validationError();
      showErrorToast(msg.title, msg.message);
      return;
    }

    setIsLoading(true);

    try {
      // Set portal type before authentication
      setCurrentPortal('homeowner');

      const response = await authService.signIn(email, password, rememberMe);
      console.log('[HomeownerSignIn] Sign-in response:', response);
      console.log('[HomeownerSignIn] User object:', response.user);
      console.log('[HomeownerSignIn] User role:', response.user?.role);

      // Validate that the user has the correct role for this portal
      // Use generic error message to avoid revealing account existence on other portal
      if (response.user?.role !== 'homeowner') {
        console.log('[HomeownerSignIn] Role check failed. Expected homeowner, got:', response.user?.role);
        // Clear the token since this user shouldn't access this portal
        clearAuthToken();
        authService.clearCurrentUser();
        const msg = messages.auth.invalidCredentials();
        showErrorToast(msg.title, msg.message);
        setIsLoading(false);
        return;
      }

      // Store title and message from API for success toast after reload
      if (response.title && response.message) {
        localStorage.setItem('signin_toast', JSON.stringify({
          title: response.title,
          message: response.message,
        }));
      }

      // Force a full page reload to update authentication state
      window.location.href = '/homeowner/dashboard';
    } catch (err) {
      console.error('[HomeownerSignIn] Sign-in error caught:', err);
      console.error('[HomeownerSignIn] Error type:', err instanceof ApiError ? 'ApiError' : typeof err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Use API response or fallback to centralized invalid credentials message
          const errorTitle = err.details?.title;
          const errorMessage = err.details?.error || err.details?.message;
          if (errorTitle && errorMessage) {
            showErrorToast(errorTitle, errorMessage);
          } else {
            const msg = messages.auth.invalidCredentials();
            showErrorToast(msg.title, msg.message);
          }
        } else if (err.status === 0) {
          const msg = messages.generic.error();
          showErrorToast(msg.title, 'Unable to connect to server. Please check if the API is running.');
        } else {
          // Use API response or fallback to generic error message
          const errorTitle = err.details?.title;
          const errorMessage = err.details?.error || err.details?.message;
          if (errorTitle && errorMessage) {
            showErrorToast(errorTitle, errorMessage);
          } else {
            const msg = messages.generic.error();
            showErrorToast(msg.title, msg.message);
          }
        }
      } else {
        console.error('[HomeownerSignIn] Non-ApiError caught, showing generic error');
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
        {/* Logo/Icon */}
        <div className="d-flex justify-content-center mb-4 login-icon-wrapper" role="img" aria-label="Owner portal">
          <div className="icon-container icon-container-lg">
            <Building2 size={40} aria-hidden="true" />
          </div>
        </div>

      {/* Main Card */}
      <div className="login-card">
        <div className="text-center d-flex flex-column">
          <h1 className="h2 text-gradient-primary mb-0">
            {PORTAL_LABELS.HOMEOWNER}
          </h1>
          <span className="text-muted">
            Sign in to manage your properties
          </span>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
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
                placeholder="Enter your password"
                required
                className="form-control ps-5 pe-action-button"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn btn-link position-absolute top-50 translate-middle-y p-0 z-3 end-action-button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="form-check">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="form-check-input"
            />
            <label htmlFor="rememberMe" className="form-check-label">
              Remember me for 30 days
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn-primary w-100 ${isLoading ? 'disabled' : ''}`}
          >
            {isLoading ? (
              <>
                <div className="login-spinner" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex flex-column align-items-start">
            <span className="text-muted">Forgot your password?</span>
            <button
              type="button"
              onClick={() => navigate('/homeowner/forgot-password')}
              className="btn btn-link p-0"
            >
              Reset password
            </button>
          </div>
          <div className="d-flex flex-column align-items-end">
            <span className="text-muted">Don't have an account?</span>
            <button
              type="button"
              onClick={() => navigate('/homeowner/sign-up')}
              className="btn btn-link p-0"
            >
              Create account
            </button>
          </div>
        </div>
      </div>

      {/* Resident Portal Link */}
      <div className="mt-4 d-flex flex-column align-items-center">
        <span className="text-muted">{LABELS.ARE_YOU_RESIDENT}</span>
        <button
          type="button"
          onClick={() => navigate('/resident/sign-in')}
          className="btn btn-link p-0"
        >
          {LABELS.GO_TO_RESIDENT_PORTAL}
        </button>
      </div>
      </AuthLayout>

      {/* Toast - Rendered outside AuthLayout to avoid z-index stacking context */}
      <AppToast
        show={showToast}
        onClose={() => setShowToast(false)}
        title={toastMessage.title}
        message={toastMessage.description}
        variant={toastVariant}
      />
    </>
  );
}
