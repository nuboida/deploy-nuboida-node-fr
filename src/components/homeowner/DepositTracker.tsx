import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface DepositTrackerProps {
  residentId: string;
  viewOnly?: boolean;
}

interface Deposit {
  id?: string;
  resident_id: string;
  base_amount: number;
  current_portfolio_value: number;
  last_adjustment_date: string;
  notes: string;
}

export default function DepositTracker({ residentId, viewOnly = false }: DepositTrackerProps) {
  const [deposit, setDeposit] = useState<Deposit>({
    resident_id: residentId,
    base_amount: 0,
    current_portfolio_value: 0,
    last_adjustment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadDeposit();
  }, [residentId]);

  const loadDeposit = async () => {
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('resident_id', residentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setDeposit(data);
    } catch (error) {
      console.error('Error loading deposit:', error);
    }
  };

  const calculateEarnedValue = () => {
    const earned = (deposit.current_portfolio_value - deposit.base_amount) / 2;
    return Math.max(0, earned);
  };

  const calculateUpdatedDeposit = () => {
    return deposit.base_amount + calculateEarnedValue();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (deposit.id) {
        const { error } = await supabase
          .from('deposits')
          .update(deposit)
          .eq('id', deposit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deposits')
          .insert([deposit]);

        if (error) throw error;
      }

      setMessage('Deposit information saved successfully!');
      await loadDeposit();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnualAdjustment = async () => {
    const updatedDeposit = calculateUpdatedDeposit();
    const newDeposit = {
      ...deposit,
      base_amount: updatedDeposit,
      current_portfolio_value: updatedDeposit,
      last_adjustment_date: new Date().toISOString().split('T')[0],
      notes: `${deposit.notes}\nAnnual adjustment on ${new Date().toLocaleDateString()}`
    };

    setDeposit(newDeposit);
    setMessage('Annual adjustment applied. Click Save to confirm.');
  };

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center mb-4">
        <Wallet className="me-2 text-primary" size={24} />
        <h3 className="mb-0">Security Deposit Tracker</h3>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} mb-3`}>
          {message}
        </div>
      )}

      {/* Display Current Values */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="glass-card p-3">
            <div className="d-flex align-items-center mb-2">
              <DollarSign size={18} className="text-primary me-2" />
              <small className="text-muted">Base Deposit</small>
            </div>
            <h4 className="mb-0">${deposit.base_amount.toFixed(2)}</h4>
          </div>
        </div>

        <div className="col-md-6">
          <div className="glass-card p-3">
            <div className="d-flex align-items-center mb-2">
              <TrendingUp size={18} className="text-success me-2" />
              <small className="text-muted">Current Portfolio Value</small>
            </div>
            <h4 className="mb-0">${deposit.current_portfolio_value.toFixed(2)}</h4>
          </div>
        </div>

        <div className="col-md-6">
          <div className="glass-card p-3">
            <div className="d-flex align-items-center mb-2">
              <TrendingUp size={18} className="text-info me-2" />
              <small className="text-muted">Earned Value (50% split)</small>
            </div>
            <h4 className="mb-0">${calculateEarnedValue().toFixed(2)}</h4>
          </div>
        </div>

        <div className="col-md-6">
          <div className="glass-card p-3 bg-gradient-primary">
            <div className="d-flex align-items-center mb-2">
              <Wallet size={18} className="text-white me-2" />
              <small className="text-white">Updated Deposit</small>
            </div>
            <h4 className="mb-0 text-white">${calculateUpdatedDeposit().toFixed(2)}</h4>
          </div>
        </div>
      </div>

      {!viewOnly && (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Base Deposit Amount</label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={deposit.base_amount}
              onChange={(e) => setDeposit({ ...deposit, base_amount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Current Portfolio Value</label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={deposit.current_portfolio_value}
              onChange={(e) => setDeposit({ ...deposit, current_portfolio_value: parseFloat(e.target.value) || 0 })}
              required
            />
            <small className="text-muted">
              Enter the current value if deposit is invested (e.g., in stocks, bonds, savings account)
            </small>
          </div>

          <div className="mb-3">
            <label className="form-label d-flex align-items-center">
              <Calendar size={16} className="me-2" />
              Last Adjustment Date
            </label>
            <input
              type="date"
              className="form-control "
              value={deposit.last_adjustment_date}
              onChange={(e) => setDeposit({ ...deposit, last_adjustment_date: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control "
              rows={3}
              value={deposit.notes}
              onChange={(e) => setDeposit({ ...deposit, notes: e.target.value })}
              placeholder="Adjustment history, notes..."
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-gradient flex-grow-1" disabled={loading}>
              {loading ? 'Saving...' : 'Save Deposit Info'}
            </button>
            <button 
              type="button" 
              className="btn btn-glass" 
              onClick={handleAnnualAdjustment}
              disabled={loading}
            >
              Annual Adjustment
            </button>
          </div>

          <small className="text-muted d-block mt-2">
            <strong>How it works:</strong> Earned Value = (Current Portfolio - Base) ÷ 2. 
            Updated Deposit = Base + Earned Value. Use "Annual Adjustment" to roll earned value into base.
          </small>
        </form>
      )}

      {viewOnly && (
        <div className="alert alert-info">
          <strong>Your Current Security Deposit:</strong> ${calculateUpdatedDeposit().toFixed(2)}
          {calculateEarnedValue() > 0 && (
            <div className="mt-2">
              <small>This includes ${calculateEarnedValue().toFixed(2)} in investment earnings (50% split).</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
