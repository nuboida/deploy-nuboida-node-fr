import React, { useState, useEffect } from 'react';
import { Download, Receipt, Calendar, CheckCircle } from 'lucide-react';

interface ReceiptDownloadProps {
  residentId: string;
}

interface ReceiptRecord {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  reference_number: string;
  notes: string;
  invoice_number: string;
  month: string;
  year: number;
}

export default function ReceiptDownload({ residentId }: ReceiptDownloadProps) {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, [residentId]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // Get all invoices for this resident
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, month, year')
        .eq('resident_id', residentId)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Get receipts for these invoices
      const invoiceIds = invoices?.map(inv => inv.id) || [];
      
      if (invoiceIds.length > 0) {
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('receipts')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        if (receiptsError) throw receiptsError;

        // Merge invoice info with receipts
        const mergedReceipts = receiptsData?.map(receipt => {
          const invoice = invoices?.find(inv => inv.id === receipt.invoice_id);
          return {
            ...receipt,
            invoice_number: invoice?.invoice_number || 'N/A',
            month: invoice?.month || '',
            year: invoice?.year || 0
          };
        }) || [];

        setReceipts(mergedReceipts);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptPDF = (receipt: ReceiptRecord) => {
    // Create a simple HTML receipt for printing
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${receipt.invoice_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #8b5cf6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #111827;
            margin: 0;
          }
          .header p {
            color: #6b7280;
            margin: 0.5rem 0 0 0;
          }
          .receipt-details {
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            font-weight: bold;
            color: #666;
          }
          .amount {
            font-size: 24px;
            color: #8b5cf6;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Receipt</h1>
          <p>Receipt ID: ${receipt.id.substring(0, 8).toUpperCase()}</p>
        </div>
        
        <div class="receipt-details">
          <div class="detail-row">
            <span class="detail-label">Invoice Number:</span>
            <span>${receipt.invoice_number}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Period:</span>
            <span>${receipt.month} ${receipt.year}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Date:</span>
            <span>${new Date(receipt.payment_date).toLocaleDateString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span>${receipt.payment_method}</span>
          </div>
          ${receipt.reference_number ? `
          <div class="detail-row">
            <span class="detail-label">Reference Number:</span>
            <span>${receipt.reference_number}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="amount">
          Amount Paid: $${receipt.amount_paid.toFixed(2)}
        </div>
        
        ${receipt.notes ? `
        <div class="receipt-details">
          <div class="detail-row">
            <span class="detail-label">Notes:</span>
            <span>${receipt.notes}</span>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p><small>Generated on ${new Date().toLocaleString()}</small></p>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const downloadAsText = (receipt: ReceiptRecord) => {
    const receiptText = `
PAYMENT RECEIPT
===============

Receipt ID: ${receipt.id.substring(0, 8).toUpperCase()}
Invoice Number: ${receipt.invoice_number}
Period: ${receipt.month} ${receipt.year}

Payment Details:
- Date: ${new Date(receipt.payment_date).toLocaleDateString()}
- Amount: $${receipt.amount_paid.toFixed(2)}
- Method: ${receipt.payment_method}
${receipt.reference_number ? `- Reference: ${receipt.reference_number}` : ''}

${receipt.notes ? `Notes: ${receipt.notes}` : ''}

Generated: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receipt.invoice_number}-${receipt.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center mb-4">
        <Receipt className="me-2 text-primary" size={24} />
        <h3 className="mb-0">Payment Receipts</h3>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="alert alert-info">
          <p className="mb-0">No payment receipts found.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <Calendar size={14} className="me-2 text-muted" />
                      {new Date(receipt.payment_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{receipt.invoice_number}</td>
                  <td>{receipt.month} {receipt.year}</td>
                  <td>
                    <strong className="text-success">${receipt.amount_paid.toFixed(2)}</strong>
                  </td>
                  <td>
                    <span className="badge bg-glass">{receipt.payment_method}</span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => generateReceiptPDF(receipt)}
                        title="Print Receipt"
                      >
                        <Receipt size={14} />
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => downloadAsText(receipt)}
                        title="Download as Text"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3">
        <small className="text-muted">
          <CheckCircle size={14} className="me-1" />
          Click the receipt icon to print or the download icon to save as text file.
        </small>
      </div>
    </div>
  );
}
