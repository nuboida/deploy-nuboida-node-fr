import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Calendar, DollarSign, Trash2 } from 'lucide-react';

interface ReceiptManagerProps {
  invoiceId: string;
  renterId: string;
}

interface ReceiptRecord {
  id?: string;
  invoice_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  reference_number: string;
  notes: string;
}

export default function ReceiptManager({ invoiceId, renterId }: ReceiptManagerProps) {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ReceiptRecord>({
    invoice_id: invoiceId,
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: 0,
    payment_method: 'Zelle',
    reference_number: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadReceipts();
  }, [invoiceId]);

  const loadReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('receipts')
        .insert([formData]);

      if (error) throw error;

      setMessage('Receipt recorded successfully!');
      setShowForm(false);
      setFormData({
        invoice_id: invoiceId,
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: 0,
        payment_method: 'Zelle',
        reference_number: '',
        notes: ''
      });
      await loadReceipts();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadReceipts();
    } catch (error: any) {
      alert(`Error deleting receipt: ${error.message}`);
    }
  };

  const totalPaid = receipts.reduce((sum, r) => sum + r.amount_paid, 0);

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <Receipt className="me-2 text-primary" size={24} />
          <h4 className="mb-0">Payment Receipts</h4>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={16} className="me-1" />
          {showForm ? 'Cancel' : 'Record Payment'}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} mb-3`}>
          {message}
        </div>
      )}

      {/* Total Paid Summary */}
      {receipts.length > 0 && (
        <div className="glass-card p-3 mb-3 bg-success">
          <div className="d-flex align-items-center justify-content-between">
            <small className="text-white">Total Paid</small>
            <h4 className="mb-0 text-white">${totalPaid.toFixed(2)}</h4>
          </div>
        </div>
      )}

      {/* Add Receipt Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-3 mb-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label d-flex align-items-center">
                <Calendar size={14} className="me-2" />
                Payment Date
              </label>
              <input
                type="date"
                className="form-control"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label d-flex align-items-center">
                <DollarSign size={14} className="me-2" />
                Amount Paid
              </label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Zelle">Zelle</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Venmo">Venmo</option>
                <option value="Cash App">Cash App</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Reference Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Check #, Transaction ID, etc."
              />
            </div>

            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-100 mt-3" disabled={loading}>
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      )}

      {/* Receipts List */}
      {receipts.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>{new Date(receipt.payment_date).toLocaleDateString()}</td>
                  <td className="text-success">${receipt.amount_paid.toFixed(2)}</td>
                  <td>
                    <span className="badge bg-glass">{receipt.payment_method}</span>
                  </td>
                  <td>
                    <small className="text-muted">{receipt.reference_number || '-'}</small>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => receipt.id && deleteReceipt(receipt.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !showForm && (
          <div className="text-center text-muted py-3">
            <Receipt size={32} className="opacity-50 mb-2" />
            <p className="mb-0">No payments recorded yet</p>
          </div>
        )
      )}
    </div>
  );
}
