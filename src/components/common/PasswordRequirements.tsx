import { X, Check } from 'lucide-react';

export interface PasswordRequirementsState {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const getPasswordRequirements = (password: string): PasswordRequirementsState => ({
  minLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasLowerCase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

export const allRequirementsMet = (requirements: PasswordRequirementsState): boolean => {
  return Object.values(requirements).every(Boolean);
};

interface PasswordRequirementsProps {
  requirements: PasswordRequirementsState;
  touched: boolean;
  hasPassword: boolean;
}

export function PasswordRequirements({ requirements, touched, hasPassword }: PasswordRequirementsProps) {
  const getItemClass = (isMet: boolean): string => {
    if (isMet) return 'text-success';
    if (touched && hasPassword) return 'text-danger';
    return '';
  };

  const getItemStyle = (isMet: boolean): React.CSSProperties | undefined => {
    if (!isMet && (!touched || !hasPassword)) {
      return { color: 'var(--bs-gray-600)' };
    }
    return undefined;
  };

  return (
    <div className="mt-2 p-3 rounded-3" style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <p className="small mb-2 fw-semibold" style={{ color: 'var(--bs-gray-600)' }}>Password must contain</p>
      <ul className="list-unstyled mb-0 small">
        <li className={`d-flex align-items-center gap-2 mb-1 ${getItemClass(requirements.minLength)}`} style={getItemStyle(requirements.minLength)}>
          {requirements.minLength ? <Check size={16} /> : <X size={16} />}
          At least 8 characters
        </li>
        <li className={`d-flex align-items-center gap-2 mb-1 ${getItemClass(requirements.hasUpperCase)}`} style={getItemStyle(requirements.hasUpperCase)}>
          {requirements.hasUpperCase ? <Check size={16} /> : <X size={16} />}
          One uppercase letter
        </li>
        <li className={`d-flex align-items-center gap-2 mb-1 ${getItemClass(requirements.hasLowerCase)}`} style={getItemStyle(requirements.hasLowerCase)}>
          {requirements.hasLowerCase ? <Check size={16} /> : <X size={16} />}
          One lowercase letter
        </li>
        <li className={`d-flex align-items-center gap-2 mb-1 ${getItemClass(requirements.hasNumber)}`} style={getItemStyle(requirements.hasNumber)}>
          {requirements.hasNumber ? <Check size={16} /> : <X size={16} />}
          One number
        </li>
        <li className={`d-flex align-items-center gap-2 ${getItemClass(requirements.hasSpecialChar)}`} style={getItemStyle(requirements.hasSpecialChar)}>
          {requirements.hasSpecialChar ? <Check size={16} /> : <X size={16} />}
          One special character (!@#$%^&*)
        </li>
      </ul>
    </div>
  );
}
