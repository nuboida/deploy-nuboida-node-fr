import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { downloadLease } from '../../services/resident.service';

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfPreviewProps = {
  /** URL of the PDF file (for display only, not for download) */
  fileUrl: string;
  /** Filename for download */
  downloadName?: string;
  /** Width of the preview thumbnail - number for pixels, 'auto' for 100% */
  width?: number | 'auto';
  /** Height of the preview thumbnail - number for pixels, 'auto' for automatic based on aspect ratio */
  height?: number | 'auto';
  /** Lease ID for authenticated download (required for Appwrite storage URLs) */
  leaseId?: string;
};

/**
 * PDF Preview component that shows a thumbnail of the first page
 * Clicking the preview downloads the PDF
 */
export function PdfPreview({
  fileUrl,
  downloadName = 'document.pdf',
  width = 120,
  height = 160,
  leaseId,
}: PdfPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(typeof width === 'number' ? width : 200);
  const containerRef = React.useRef<HTMLButtonElement>(null);

  // Measure container width when using auto width
  useEffect(() => {
    if (width !== 'auto' || !containerRef.current) return;

    const measureWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, [width]);

  // Fetch the PDF as a blob for preview (handles authentication)
  useEffect(() => {
    if (!leaseId) {
      // If no leaseId, try using fileUrl directly (for local blob URLs)
      if (fileUrl.startsWith('blob:')) {
        setBlobUrl(fileUrl);
      }
      return;
    }

    let cancelled = false;

    const fetchPdf = async () => {
      try {
        const blob = await downloadLease(leaseId);
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('Failed to fetch PDF for preview:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      cancelled = true;
      if (blobUrl && blobUrl !== fileUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [leaseId, fileUrl]);

  const handleClick = async () => {
    if (leaseId) {
      // Use authenticated download
      setDownloading(true);
      try {
        const blob = await downloadLease(leaseId);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download PDF:', err);
        alert('Failed to download PDF. Please try again.');
      } finally {
        setDownloading(false);
      }
    } else {
      // Fallback: direct link download (for local blob URLs)
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = downloadName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Letter paper aspect ratio (8.5 x 11)
  const LETTER_ASPECT_RATIO = 8.5 / 11;

  // Compute actual dimensions
  // If width is 'auto' and height is a number, calculate width from height
  // If both are 'auto', use container width
  // If both are numbers, use as-is
  let pdfPageWidth: number;
  let computedWidth: number | string;
  let computedHeight: number | 'auto';

  if (width === 'auto' && typeof height === 'number') {
    // Calculate width from height using letter aspect ratio
    pdfPageWidth = Math.round(height * LETTER_ASPECT_RATIO);
    computedWidth = pdfPageWidth;
    computedHeight = height;
  } else if (width === 'auto') {
    // Both auto - use container width
    pdfPageWidth = containerWidth;
    computedWidth = '100%';
    computedHeight = 'auto';
  } else {
    // Fixed width
    pdfPageWidth = width;
    computedWidth = width;
    computedHeight = height === 'auto' ? 'auto' : height;
  }

  if (error) {
    // Fallback if PDF can't be rendered
    return (
      <button
        type="button"
        ref={containerRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="pdf-preview pdf-preview--fallback"
        style={{ width: computedWidth, height: computedHeight, minHeight: computedHeight === 'auto' ? 200 : undefined }}
        aria-label={`Download ${downloadName}`}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 size={32} className="text-primary spin" />
        ) : (
          <FileText size={32} className="text-danger" />
        )}
        <span className="pdf-preview__label">{downloading ? 'Downloading...' : 'PDF'}</span>
      </button>
    );
  }

  // Show loading state while fetching blob URL for preview
  const pdfUrl = blobUrl || fileUrl;
  const showInitialLoading = leaseId && !blobUrl && !error;

  return (
    <button
      type="button"
      ref={containerRef}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="pdf-preview"
      style={{ width: computedWidth, height: computedHeight, minHeight: computedHeight === 'auto' ? 200 : undefined }}
      aria-label={`Preview and download ${downloadName}`}
      title="Select to download"
      disabled={downloading}
    >
      {(loading || showInitialLoading || downloading) && (
        <div className="pdf-preview__loading">
          {downloading ? (
            <Loader2 size={24} className="text-primary spin" />
          ) : (
            <div className="spinner-border spinner-border-sm text-muted" role="status">
              <span className="visually-hidden">Loading PDF preview...</span>
            </div>
          )}
        </div>
      )}
      {pdfUrl && !showInitialLoading && (
        <Document
          file={pdfUrl}
          onLoadSuccess={() => setLoading(false)}
          onLoadError={() => {
            setLoading(false);
            setError(true);
          }}
          loading={null}
          error={null}
        >
          <Page
            pageNumber={1}
            width={pdfPageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      )}
      <div className="pdf-preview__overlay">
        <span className="pdf-preview__download-hint">{downloading ? 'Downloading...' : 'Select to download'}</span>
      </div>
    </button>
  );
}

export default PdfPreview;
