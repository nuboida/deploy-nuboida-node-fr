import React, { useState, useEffect } from 'react';
import { Gift, Users, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface BonusPoolManagerProps {
  propertyId: string;
  viewOnly?: boolean;
  renterId?: string;
}

interface BonusPool {
  id?: string;
  property_id: string;
  month: number;
  year: number;
  total_amount: number;
  tenant_shares: TenantShare[];
  notes: string;
}

interface TenantShare {
  renter_id: string;
  renter_name: string;
  share_amount: number;
  percentage: number;
}

interface Resident {
  id: string;
  name: string;
}

/**
 * BonusPoolManager - Manages bonus pool distribution for property tenants
 *
 * NOTE: This feature requires backend API implementation.
 * The Supabase integration has been removed. This component now shows a
 * placeholder until the bonus pool API endpoints are implemented.
 */
export default function BonusPoolManager({ propertyId, viewOnly = false, renterId }: BonusPoolManagerProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [bonusPool, setBonusPool] = useState<BonusPool>({
    property_id: propertyId,
    month: selectedMonth,
    year: selectedYear,
    total_amount: 0,
    tenant_shares: [],
    notes: ''
  });

  const [renters, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // TODO: Implement API calls when bonus pool endpoints are available
  // For now, this component shows a placeholder
  useEffect(() => {
    // loadRenters();
    // loadBonusPool();
  }, [propertyId, selectedMonth, selectedYear]);

  const loadRenters = async () => {
    // TODO: Replace with API call
    // Example: const data = await bonusPoolService.getRenters(propertyId);
    console.log('[BonusPoolManager] loadRenters - API not yet implemented');
    setResidents([]);
  };

  const loadBonusPool = async () => {
    // TODO: Replace with API call
    // Example: const data = await bonusPoolService.getBonusPool(propertyId, selectedMonth, selectedYear);
    console.log('[BonusPoolManager] loadBonusPool - API not yet implemented');
  };

  const calculateShareAmounts = (totalAmount: number) => {
    return bonusPool.tenant_shares.map(share => ({
      ...share,
      share_amount: (totalAmount * share.percentage) / 100
    }));
  };

  const updateTotalAmount = (amount: number) => {
    const updatedShares = calculateShareAmounts(amount);
    setBonusPool({
      ...bonusPool,
      total_amount: amount,
      tenant_shares: updatedShares
    });
  };

  const updatePercentage = (renterId: string, percentage: number) => {
    const updatedShares = bonusPool.tenant_shares.map(share =>
      share.renter_id === renterId
        ? { ...share, percentage, share_amount: (bonusPool.total_amount * percentage) / 100 }
        : share
    );

    setBonusPool({
      ...bonusPool,
      tenant_shares: updatedShares
    });
  };

  const distributeEvenly = () => {
    if (bonusPool.tenant_shares.length === 0) return;

    const equalPercentage = 100 / bonusPool.tenant_shares.length;
    const updatedShares = bonusPool.tenant_shares.map(share => ({
      ...share,
      percentage: equalPercentage,
      share_amount: (bonusPool.total_amount * equalPercentage) / 100
    }));

    setBonusPool({
      ...bonusPool,
      tenant_shares: updatedShares
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate percentages add up to 100
    const totalPercentage = bonusPool.tenant_shares.reduce((sum, share) => sum + share.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01 && bonusPool.tenant_shares.length > 0) {
      setMessage('Error: Percentages must add up to 100%');
      setLoading(false);
      return;
    }

    try {
      // TODO: Replace with API call
      // Example: await bonusPoolService.saveBonusPool(bonusPool);
      console.log('[BonusPoolManager] handleSubmit - API not yet implemented');
      setMessage('Bonus pool feature is not yet available. API implementation pending.');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTenantShare = () => {
    if (!renterId) return null;
    return bonusPool.tenant_shares.find(share => share.renter_id === renterId);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i);

  // View-only mode for tenants
  if (viewOnly && renterId) {
    const tenantShare = getTenantShare();

    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="mb-1">House Bonus Pool</h3>
            <p className="text-muted mb-0">Your share of the bonus pool</p>
          </div>
        </div>

        {tenantShare ? (
          <div className="card p-3 bg-primary text-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <small>Your Share ({tenantShare.percentage.toFixed(1)}%)</small>
              <Gift size={20} />
            </div>
            <h3 className="mb-0">${tenantShare.share_amount.toFixed(2)}</h3>
            <small className="opacity-75">
              From ${bonusPool.total_amount.toFixed(2)} total pool
            </small>
          </div>
        ) : (
          <div className="alert alert-info">
            No bonus pool allocated for this period.
          </div>
        )}

        {bonusPool.notes && (
          <div className="mt-3">
            <small className="text-muted d-block mb-1">Notes:</small>
            <p className="mb-0">{bonusPool.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // Owner management view - Show coming soon placeholder
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">House Bonus Pool</h3>
          <p className="text-muted mb-0">Distribute bonuses among tenants</p>
        </div>

        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>

          <select
            className="form-select form-select-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="alert alert-warning d-flex align-items-start gap-3 mb-4">
        <AlertCircle size={24} className="flex-shrink-0 mt-1" />
        <div>
          <h6 className="alert-heading mb-1">Feature Coming Soon</h6>
          <p className="mb-0 small">
            The Bonus Pool Manager allows you to distribute bonuses among tenants based on custom percentages.
            This feature is currently under development and will be available in a future update.
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-info'} mb-3`}>
          {message}
        </div>
      )}

      {/* Total Pool Amount - Preview */}
      <div className="card p-3 mb-4 bg-primary text-white">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <small>Total Bonus Pool</small>
            <h3 className="mb-0">${bonusPool.total_amount.toFixed(2)}</h3>
          </div>
          <DollarSign size={32} className="opacity-50" />
        </div>
      </div>

      {/* Using div instead of form to avoid nested form issues when rendered inside PropertyForm */}
      <div>
        <div className="mb-3">
          <label className="form-label">Total Bonus Pool Amount</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            value={bonusPool.total_amount}
            onChange={(e) => updateTotalAmount(parseFloat(e.target.value) || 0)}
            disabled
          />
          <small className="text-muted">Feature not yet available</small>
        </div>

        {/* Tenant Shares - Preview */}
        {bonusPool.tenant_shares.length > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <label className="form-label mb-0 d-flex align-items-center">
                <Users size={16} className="me-2" />
                Tenant Shares
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={distributeEvenly}
                disabled
              >
                Distribute Evenly
              </button>
            </div>

            {bonusPool.tenant_shares.map((share) => (
              <div key={share.renter_id} className="card p-3 mb-2">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <strong>{share.renter_name}</strong>
                  </div>
                  <div className="col-md-4">
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={share.percentage}
                        onChange={(e) => updatePercentage(share.renter_id, parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        disabled
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-end">
                      <strong className="text-primary">${share.share_amount.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <small className="text-muted">
              Total: {bonusPool.tenant_shares.reduce((sum, s) => sum + s.percentage, 0).toFixed(1)}%
              (must equal 100%)
            </small>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Notes</label>
          <textarea
            className="form-control"
            rows={2}
            value={bonusPool.notes}
            onChange={(e) => setBonusPool({ ...bonusPool, notes: e.target.value })}
            placeholder="Bonus pool details, criteria, etc."
            disabled
          />
        </div>

        <button type="button" className="btn btn-primary w-100" disabled>
          Save Bonus Pool (Coming Soon)
        </button>
      </div>
    </div>
  );
}
