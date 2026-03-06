import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      {/* Skip to Main Content Link - WCAG 2.2 AA Accessibility */}
      <a href="#main-content" className="visually-hidden-focusable skip-link">
        Skip to main content
      </a>

      {/* Animated Background */}
      <div className="login-container">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />

        <style>{`
          .login-bg-orb {
            position: absolute;
            border-radius: 50%;
          }
          .login-bg-orb-1 {
            top: -20%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
          }
          .login-bg-orb-2 {
            bottom: -15%;
            left: -5%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 8s ease-in-out infinite reverse;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .login-form-container {
            position: relative;
            z-index: 1;
            animation: fadeIn 0.6s ease-out;
            width: 100%;
            max-width: 440px;
          }
          .login-icon-wrapper {
            animation: scaleIn 0.5s ease-out;
          }
          .login-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>

        <div id="main-content" className="login-form-container">
          {children}
        </div>
      </div>
    </>
  );
}
