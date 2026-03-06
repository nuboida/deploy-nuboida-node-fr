import { Toast } from 'react-bootstrap';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface AppToastProps {
  show: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  variant?: ToastVariant;
  autohide?: boolean;
  delay?: number;
}

/**
 * Reusable Toast component with consistent styling across the app.
 *
 * Features:
 * - Four variants: success (green), error (red), warning (yellow), info (blue)
 * - Icon automatically selected based on variant
 * - Consistent layout with flexbox and proper spacing
 * - Positioned in top-right corner with high z-index
 * - Optional autohide functionality (error toasts never auto-dismiss)
 *
 * @example
 * ```tsx
 * <AppToast
 *   show={showToast}
 *   onClose={() => setShowToast(false)}
 *   title="Success!"
 *   message="Your changes have been saved."
 *   variant="success"
 * />
 * ```
 */
export function AppToast({
  show,
  onClose,
  title,
  message,
  variant = 'info',
  autohide = false,
  delay = 5000,
}: AppToastProps) {
  // Log all props received
  console.log('[AppToast] Rendered with props:', {
    show,
    title,
    message,
    variant,
    autohide,
    delay,
  });
  console.log('[AppToast] typeof message:', typeof message);
  console.log('[AppToast] message value:', message);
  console.log('[AppToast] message length:', message?.length);

  // Toasts should never auto-dismiss - user must acknowledge them
  const shouldAutohide = false;

  // Convert URLs in message to clickable links
  const formatMessageWithLinks = (text: string | undefined) => {
    // Return empty string if text is undefined or null
    if (!text) return '';

    // Regex to match URLs (http, https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    const elements: React.ReactNode[] = [];

    parts.forEach((part, index) => {
      // Skip empty parts
      if (!part) return;

      // If this part matches a URL, render it as a link
      if (part.match(urlRegex)) {
        // Add a line break before the URL if there's already content
        if (elements.length > 0) {
          elements.push(<br key={`br-before-${index}`} />);
        }
        elements.push(
          <a
            key={`url-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-underline"
            style={{ color: 'inherit', wordBreak: 'break-all' }}
          >
            {part}
          </a>
        );
      } else {
        // Add text, removing newlines (we'll use <br> instead)
        const cleanText = part.replace(/\n+/g, ' ').trim();
        if (cleanText) {
          elements.push(<span key={`text-${index}`}>{cleanText}</span>);
        }
      }
    });

    return elements;
  };

  // Select icon based on variant
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };

  // Select CSS class based on variant
  const getToastClass = () => {
    switch (variant) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
    }
  };

  return (
    <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 99999 }}>
      <Toast
        show={show}
        onClose={onClose}
        autohide={shouldAutohide}
        delay={delay}
        className={getToastClass()}
      >
        <div className="d-flex align-items-start gap-2">
          {/* Icon */}
          <div className="flex-shrink-0">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-grow-1">
            <Toast.Header closeButton={false}>
              <strong className="me-auto">{title}</strong>
            </Toast.Header>
            <Toast.Body>{formatMessageWithLinks(message)}</Toast.Body>
          </div>

          {/* Close Button */}
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          />
        </div>
      </Toast>
    </div>
  );
}
