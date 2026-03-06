import { useRef, useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Clock, LogOut } from 'lucide-react';

interface IdleTimeoutModalProps {
  show: boolean;
  initialSeconds: number; // Initial countdown value when modal opens
  onStayLoggedIn: () => void;
  onSignOut: () => void;
  onTimeout?: () => void; // Called when countdown reaches 0
}

/**
 * Modal that warns users about impending session timeout due to inactivity.
 * Shows a countdown timer and options to stay logged in or sign out.
 *
 * Manages its own internal countdown to prevent parent re-renders.
 */
export function IdleTimeoutModal({
  show,
  initialSeconds,
  onStayLoggedIn,
  onSignOut,
  onTimeout,
}: IdleTimeoutModalProps) {
  // Internal visibility state (can be dismissed independently of parent show prop)
  const [internalShow, setInternalShow] = useState(false);

  // Internal countdown state
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  // Store the initial warning time when modal first opens
  const initialSecondsRef = useRef<number>(initialSeconds);

  // Track previous show value and a unique ID for each warning
  const prevShowRef = useRef<boolean>(show);
  const warningIdRef = useRef(0);
  const lastSeenWarningIdRef = useRef(-1);

  // Increment warning ID when show transitions from false to true
  useEffect(() => {
    if (show && !prevShowRef.current) {
      // Warning just fired - give it a new ID
      warningIdRef.current += 1;
    }
    prevShowRef.current = show;
  }, [show]);

  // Show modal when we see a new warning ID
  useEffect(() => {
    if (show && warningIdRef.current > lastSeenWarningIdRef.current) {
      // New warning - show the modal
      setInternalShow(true);
      setRemainingSeconds(initialSeconds);
      initialSecondsRef.current = initialSeconds;
      lastSeenWarningIdRef.current = warningIdRef.current;
    }
  }, [show, initialSeconds]);

  // Manage internal countdown timer
  useEffect(() => {
    if (!internalShow || remainingSeconds <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;

        // Call onTimeout when countdown reaches 0
        if (next <= 0 && onTimeout) {
          onTimeout();
        }

        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [internalShow, remainingSeconds, onTimeout]);

  // Format remaining time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage based on initial time
  const progressPercent = (remainingSeconds / initialSecondsRef.current) * 100;

  const handleStayLoggedIn = () => {
    setInternalShow(false);
    onStayLoggedIn();
  };

  return (
    <Modal
      show={internalShow}
      onHide={handleStayLoggedIn}
      centered
      backdrop="static"
      keyboard={true}
      className="idle-timeout-modal"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <Clock size={24} className="text-warning" />
          Session Expiring
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        <p className="mb-4">
          You will be automatically signed out due to inactivity.
        </p>

        {/* Countdown Timer */}
        <div className="idle-timeout-timer mb-4">
          <div className="timer-circle">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--bs-gray-200)"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={remainingSeconds <= 30 ? 'var(--bs-danger)' : 'var(--bs-warning)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div className="timer-text">
              <span
                className={`timer-value ${remainingSeconds <= 30 ? 'text-danger' : ''}`}
                role="timer"
                aria-live="polite"
                aria-label={`${formatTime(remainingSeconds)} remaining`}
              >
                {formatTime(remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-muted small mb-0">
          Select "Stay Signed In" to continue your session.
        </p>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 justify-content-end gap-2">
        <Button
          variant="secondary"
          onClick={onSignOut}
          className="d-inline-flex align-items-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </Button>
        <Button
          variant="primary"
          onClick={handleStayLoggedIn}
          className="btn-gradient border-0"
          autoFocus
        >
          Stay Signed In
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
