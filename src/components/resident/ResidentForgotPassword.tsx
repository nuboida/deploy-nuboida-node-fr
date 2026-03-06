import { useState } from 'react';
import { Mail, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService, ApiError } from '../../services';
import { AuthLayout } from '../common/AuthLayout';
import { AppToast } from '../common/AppToast';
import { PORTAL_LABELS, LABELS } from '../../config/labels';
import { messages } from '../../utils/messages';

export function ResidentForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showErrorToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setShowToast(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    // Validate email format
    if (!isValidEmail(email)) {
      const msg = messages.auth.validationError();
      showErrorToast(msg.title, msg.message);
      return;
    }

    setIsLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          const msg = messages.generic.error();
          showErrorToast(msg.title, 'Unable to connect to server. Please check if the API is running.');
        } else {
          // Use API response or fallback to centralized password reset failed message
          const errorTitle = err.details?.title;
          const errorMessage = err.details?.error || err.details?.message;
          if (errorTitle && errorMessage) {
            showErrorToast(errorTitle, errorMessage);
          } else {
            const msg = messages.auth.passwordResetFailed();
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

  const handleCancel = () => {
    navigate('/resident/sign-in');
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
        {!success ? (
          <>
            <div className="text-center d-flex flex-column">
              <h1 className="h2 text-gradient-primary mb-0">
                Reset password
              </h1>
              <span className="text-muted">
                Enter your email to receive reset instructions
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
                      Sending...
                    </>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="icon-container icon-container-lg mx-auto mb-4" style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}>
                <Mail size={40} />
              </div>
              <h1 className="h2 text-gradient-primary mb-3">
                Check Your Email
              </h1>
              <p className="text-muted mb-0">
                We've sent password reset instructions to{' '}
                <strong className="text-white">{email}</strong>
              </p>
            </div>

            <div className="alert alert-success" role="alert">
              Please check your email and follow the instructions to reset your password.
              The link will expire in 1 hour.
            </div>

            <button
              type="button"
              onClick={() => navigate('/resident/sign-in')}
              className="btn btn-primary w-100"
            >
              Return to sign in
            </button>

            <div className="d-flex flex-column align-items-start">
              <span className="text-muted small">Didn't receive the email?</span>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="btn btn-link p-0 small"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>

      {/* Help Notice */}
      {!success && (
        <>
          <div className="mt-4 d-flex flex-column align-items-center">
            <span className="text-muted">Remembered your password?</span>
            <button
              type="button"
              onClick={() => navigate('/resident/sign-in')}
              className="btn btn-link p-0"
            >
              Sign in instead
            </button>
          </div>

          {/* Homeowner Portal Link */}
          <div className="mt-3 d-flex flex-column align-items-center">
            <span className="text-muted">{LABELS.ARE_YOU_HOMEOWNER}</span>
            <button
              type="button"
              onClick={() => navigate('/homeowner/forgot-password')}
              className="btn btn-link p-0"
            >
              {LABELS.GO_TO_HOMEOWNER_PORTAL}
            </button>
          </div>
        </>
      )}
      </AuthLayout>

      {/* Error Toast - Rendered outside AuthLayout to avoid z-index stacking context */}
      <AppToast
        show={showToast}
        onClose={() => setShowToast(false)}
        title={toastMessage.title}
        message={toastMessage.description}
        variant="error"
      />
    </>
  );
}
