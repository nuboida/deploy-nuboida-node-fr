import React from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import type { Invoice } from '../../App';

interface InvoiceDownloadProps {
  invoices: Invoice[];
}

export default function InvoiceDownload({ invoices }: InvoiceDownloadProps) {
  const generateInvoicePDF = (invoice: Invoice) => {
    // Calculate total with late fees and electric charges
    const electricCharge = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
    const lateFee = (invoice.daysLate || 0) * (invoice.lateFeeDailyRate || 0);
    const total = invoice.lastMonthBalance + invoice.currentRent + electricCharge + lateFee;

    // Create a simple HTML invoice for printing
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.month}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #667eea;
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
          .invoice-details {
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
          .detail-value {
            text-align: right;
          }
          .total {
            font-size: 24px;
            color: #667eea;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f3f4f6;
            border-radius: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
          }
          .paid-stamp {
            color: #10b981;
            font-weight: bold;
            font-size: 1.5rem;
            text-align: center;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice</h1>
          <p>Period: ${invoice.month}</p>
          <p>Invoice Date: ${invoice.date}</p>
        </div>

        ${invoice.isPaid ? `<div class="paid-stamp">✓ PAID</div>` : ''}

        <div class="invoice-details">
          <div class="detail-row">
            <span class="detail-label">Last Month's Balance:</span>
            <span class="detail-value">$${invoice.lastMonthBalance.toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Current Rent:</span>
            <span class="detail-value">$${invoice.currentRent.toFixed(2)}</span>
          </div>
          ${electricCharge > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Electric Usage (${invoice.previousMonthElectricUsageKwh} kWh @ $${invoice.electricRate}/kWh):</span>
            <span class="detail-value">$${electricCharge.toFixed(2)}</span>
          </div>
          ` : ''}
          ${lateFee > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Late Fee (${invoice.daysLate} days @ $${invoice.lateFeeDailyRate}/day):</span>
            <span class="detail-value">$${lateFee.toFixed(2)}</span>
          </div>
          ` : ''}
        </div>

        <div class="total">
          Total Amount ${invoice.isPaid ? 'Paid' : 'Due'}: $${total.toFixed(2)}
        </div>

        ${invoice.isPaid && invoice.paidDate ? `
        <div class="invoice-details">
          <div class="detail-row">
            <span class="detail-label">Payment Date:</span>
            <span class="detail-value">${new Date(invoice.paidDate).toLocaleDateString()}</span>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you!</p>
          <p><small>Generated on ${new Date().toLocaleString()}</small></p>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const downloadAsText = (invoice: Invoice) => {
    const electricCharge = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
    const lateFee = (invoice.daysLate || 0) * (invoice.lateFeeDailyRate || 0);
    const total = invoice.lastMonthBalance + invoice.currentRent + electricCharge + lateFee;

    const invoiceText = `
INVOICE
=======

Period: ${invoice.month}
Invoice Date: ${invoice.date}
Status: ${invoice.isPaid ? 'PAID' : 'UNPAID'}

Charges:
--------
Last Month's Balance: $${invoice.lastMonthBalance.toFixed(2)}
Current Rent: $${invoice.currentRent.toFixed(2)}
${electricCharge > 0 ? `Electric Usage (${invoice.previousMonthElectricUsageKwh} kWh @ $${invoice.electricRate}/kWh): $${electricCharge.toFixed(2)}` : ''}
${lateFee > 0 ? `Late Fee (${invoice.daysLate} days @ $${invoice.lateFeeDailyRate}/day): $${lateFee.toFixed(2)}` : ''}

Total Amount ${invoice.isPaid ? 'Paid' : 'Due'}: $${total.toFixed(2)}

${invoice.isPaid && invoice.paidDate ? `Payment Date: ${new Date(invoice.paidDate).toLocaleDateString()}` : ''}

Generated: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.month.replace(' ', '-')}-${invoice.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter to only show paid invoices
  const paidInvoices = invoices.filter(inv => inv.isPaid);

  if (paidInvoices.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="d-flex align-items-center mb-4">
          <FileText className="me-2 text-primary" size={24} />
          <h3 className="mb-0">Invoice History</h3>
        </div>
        <div className="alert alert-info">
          <p className="mb-0">No paid invoices found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center mb-4">
        <FileText className="me-2 text-primary" size={24} />
        <h3 className="mb-0">Invoice History</h3>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paidInvoices.map((invoice) => {
              const electricCharge = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
              const lateFee = (invoice.daysLate || 0) * (invoice.lateFeeDailyRate || 0);
              const total = invoice.lastMonthBalance + invoice.currentRent + electricCharge + lateFee;

              return (
                <tr key={invoice.id}>
                  <td>{invoice.month}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Calendar size={14} className="me-2 text-muted" />
                      {invoice.date}
                    </div>
                  </td>
                  <td>
                    <strong className="text-success">${total.toFixed(2)}</strong>
                  </td>
                  <td>
                    <span className="badge bg-success">Paid</span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => generateInvoicePDF(invoice)}
                        title="Print Invoice"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => downloadAsText(invoice)}
                        title="Download as Text"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <small className="text-muted">
          Click the document icon to print or the download icon to save as text file.
        </small>
      </div>
    </div>
  );
}
