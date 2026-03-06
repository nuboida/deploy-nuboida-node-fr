import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';

export type FileDropzoneProps = {
  /** Accepted file types (e.g., '.pdf', '.pdf,.doc') */
  accept?: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Currently selected file */
  file?: File | null;
  /** Callback when file is selected or removed */
  onFileChange: (file: File | null) => void;
  /** Label for the dropzone */
  label?: string;
  /** Helper text shown below the dropzone */
  helperText?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Unique ID for accessibility */
  id?: string;
};

/**
 * ADA-compliant file dropzone with drag-and-drop support
 *
 * Accessibility features:
 * - Keyboard navigable (Tab, Enter, Space)
 * - Screen reader announcements for state changes
 * - Clear focus indicators
 * - Descriptive labels and ARIA attributes
 * - Error states announced to screen readers
 */
export function FileDropzone({
  accept = '.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB default
  file,
  onFileChange,
  label = 'Upload File',
  helperText,
  disabled = false,
  error,
  id = 'file-dropzone',
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get accepted file types for display (sentence case, not all caps for accessibility)
  const getAcceptedTypes = (): string => {
    return accept
      .split(',')
      .map(type => {
        const ext = type.trim().replace('.', '').toLowerCase();
        // Capitalize first letter only
        return ext.charAt(0).toUpperCase() + ext.slice(1);
      })
      .join(', ');
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type;
      }
      return mimeType === type || mimeType.startsWith(type.replace('*', ''));
    });

    if (!isValidType) {
      return `Invalid file type. Accepted types: ${getAcceptedTypes()}`;
    }

    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${formatFileSize(maxSize)}`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setLocalError(null);

    if (!selectedFile) {
      onFileChange(null);
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setLocalError(validationError);
      // Announce error to screen readers
      const announcement = document.getElementById(`${id}-announcement`);
      if (announcement) {
        announcement.textContent = validationError;
      }
      return;
    }

    onFileChange(selectedFile);

    // Announce success to screen readers
    const announcement = document.getElementById(`${id}-announcement`);
    if (announcement) {
      announcement.textContent = `File selected: ${selectedFile.name}`;
    }
  }, [accept, maxSize, onFileChange, id]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    handleFileSelect(selectedFile);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the dropzone entirely
    if (e.currentTarget === dropzoneRef.current && !dropzoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  };

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  // Handle click to open file dialog
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Handle file removal
  const handleRemove = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onFileChange(null);
    setLocalError(null);

    // Announce removal to screen readers
    const announcement = document.getElementById(`${id}-announcement`);
    if (announcement) {
      announcement.textContent = 'File removed';
    }

    // Return focus to dropzone
    dropzoneRef.current?.focus();
  };

  const handleRemoveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRemove(e);
    }
  };

  const displayError = error || localError;
  const hasFile = !!file;

  return (
    <div className="file-dropzone-wrapper">
      {/* Screen reader announcements */}
      <div
        id={`${id}-announcement`}
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Label */}
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="form-label"
      >
        {label}
      </label>

      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description ${displayError ? `${id}-error` : ''}`}
        aria-disabled={disabled}
        aria-invalid={!!displayError}
        className={`file-dropzone ${isDragging ? 'file-dropzone--dragging' : ''} ${hasFile ? 'file-dropzone--has-file' : ''} ${displayError ? 'file-dropzone--error' : ''} ${disabled ? 'file-dropzone--disabled' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          id={id}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="visually-hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {hasFile ? (
          /* File selected state */
          <div className="file-dropzone__file">
            <div className="file-dropzone__file-icon">
              <FileText size={32} aria-hidden="true" />
            </div>
            <div className="file-dropzone__file-info">
              <span className="file-dropzone__file-name">{file.name}</span>
              <span className="file-dropzone__file-size">{formatFileSize(file.size)}</span>
            </div>
            <button
              type="button"
              className="file-dropzone__remove-btn"
              onClick={handleRemove}
              onKeyDown={handleRemoveKeyDown}
              aria-label={`Remove file ${file.name}`}
              disabled={disabled}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        ) : (
          /* Empty state */
          <div className="file-dropzone__empty">
            <div className={`file-dropzone__icon ${isDragging ? 'file-dropzone__icon--active' : ''}`}>
              <Upload size={32} aria-hidden="true" />
            </div>
            <div className="file-dropzone__text">
              <span className="file-dropzone__primary-text">
                {isDragging ? 'Drop file here' : 'Drag and drop or browse to upload'}
              </span>
              <span className="file-dropzone__secondary-text" id={`${id}-description`}>
                PDF only • Max {formatFileSize(maxSize)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div
          id={`${id}-error`}
          className="file-dropzone__error"
          role="alert"
        >
          <AlertCircle size={16} aria-hidden="true" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Helper text */}
      {helperText && !displayError && (
        <div className="file-dropzone__helper form-text text-muted">
          {helperText}
        </div>
      )}
    </div>
  );
}

export default FileDropzone;
