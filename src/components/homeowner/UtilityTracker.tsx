import React, { useState, useEffect } from 'react';
import { Zap, Droplet, Flame, Home, Shield, DollarSign, Plus, Trash2 } from 'lucide-react';

interface UtilityTrackerProps {
  propertyId: string;
}

interface UtilityRecord {
  id?: string;
  property_id: string;
  month: number;
  year: number;
  mortgage: number;
  gas: number;
  electric: number;
  water: number;
  heat: number;
  insurance: number;
  custom_costs: CustomCost[];
}

interface CustomCost {
  name: string;
  amount: number;
}

export default function UtilityTracker({ propertyId }: UtilityTrackerProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [utilityRecord, setUtilityRecord] = useState<UtilityRecord>({
    property_id: propertyId,
    month: selectedMonth,
    year: selectedYear,
    mortgage: 0,
    gas: 0,
    electric: 0,
    water: 0,
    heat: 0,
    insurance: 0,
    custom_costs: []
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUtilityRecord();
  }, [propertyId, selectedMonth, selectedYear]);

  const loadUtilityRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('utilities')
        .select('*')
        .eq('property_id', propertyId)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setUtilityRecord(data);
      } else {
        setUtilityRecord({
          property_id: propertyId,
          month: selectedMonth,
          year: selectedYear,
          mortgage: 0,
          gas: 0,
          electric: 0,
          water: 0,
          heat: 0,
          insurance: 0,
          custom_costs: []
        });
      }
    } catch (error) {
      console.error('Error loading utility record:', error);
    }
  };

  const calculateTotalCosts = () => {
    const fixedCosts = 
      utilityRecord.mortgage +
      utilityRecord.gas +
      utilityRecord.electric +
      utilityRecord.water +
      utilityRecord.heat +
      utilityRecord.insurance;

    const customTotal = utilityRecord.custom_costs.reduce((sum, cost) => sum + cost.amount, 0);
    
    return fixedCosts + customTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (utilityRecord.id) {
        const { error } = await supabase
          .from('utilities')
          .update(utilityRecord)
          .eq('id', utilityRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('utilities')
          .insert([utilityRecord]);

        if (error) throw error;
      }

      setMessage('Utility costs saved successfully!');
      await loadUtilityRecord();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCustomCost = () => {
    setUtilityRecord({
      ...utilityRecord,
      custom_costs: [...utilityRecord.custom_costs, { name: '', amount: 0 }]
    });
  };

  const removeCustomCost = (index: number) => {
    const newCustomCosts = utilityRecord.custom_costs.filter((_, i) => i !== index);
    setUtilityRecord({ ...utilityRecord, custom_costs: newCustomCosts });
  };

  const updateCustomCost = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newCustomCosts = [...utilityRecord.custom_costs];
    newCustomCosts[index] = { ...newCustomCosts[index], [field]: value };
    setUtilityRecord({ ...utilityRecord, custom_costs: newCustomCosts });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i);

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <Home className="me-2 text-primary" size={24} />
          <h3 className="mb-0">Operating Costs Tracker</h3>
        </div>
        
        <div className="d-flex gap-2">
          <select
            className="form-select  w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>

          <select
            className="form-select  w-auto"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} mb-3`}>
          {message}
        </div>
      )}

      {/* Total Costs Summary */}
      <div className="glass-card p-3 mb-4 bg-gradient-primary">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <small className="text-white">Total Operating Costs</small>
            <h3 className="mb-0 text-white">${calculateTotalCosts().toFixed(2)}</h3>
          </div>
          <DollarSign size={32} className="text-white opacity-50" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Mortgage */}
          <div className="col-md-6">
            <label className="form-label d-flex align-items-center">
              <Home size={16} className="me-2" />
              Mortgage/Rent
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={utilityRecord.mortgage}
              onChange={(e) => setUtilityRecord({ ...utilityRecord, mortgage: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Gas */}
          <div className="col-md-6">
            <label className="form-label d-flex align-items-center">
              <Flame size={16} className="me-2" />
              Gas
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={utilityRecord.gas}
              onChange={(e) => setUtilityRecord({ ...utilityRecord, gas: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Electric */}
          <div className="col-md-6">
            <label className="form-label d-flex align-items-center">
              <Zap size={16} className="me-2" />
              Electric
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={utilityRecord.electric}
              onChange={(e) => setUtilityRecord({ ...utilityRecord, electric: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Water */}
          <div className="col-md-6">
            <label className="form-label d-flex align-items-center">
              <Droplet size={16} className="me-2" />
              Water
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={utilityRecord.water}
              onChange={(e) => setUtilityRecord({ ...utilityRecord, water: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Heat */}
          <div className="col-md-6">
            <label className="form-label d-flex align-items-center">
              <Flame size={16} className="me-2" />
              Heat
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={utilityRecord.heat}
              onChange={(e) => setUtilityRecord({ ...utilityRecord, heat: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Insurance */}
          <div className="col-md-6">
            <label className="form-label d-flex align-items-center">
              <Shield size={16} className="me-2" />
              Insurance
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control "
              value={utilityRecord.insurance}
              onChange={(e) => setUtilityRecord({ ...utilityRecord, insurance: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Custom Costs */}
        <div className="mt-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5>Custom Costs</h5>
            <button type="button" className="btn-secondary btn-sm" onClick={addCustomCost}>
              <Plus size={16} className="me-1" />
              Add Custom
            </button>
          </div>

          {utilityRecord.custom_costs.map((cost, index) => (
            <div key={index} className="row g-2 mb-2">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control "
                  placeholder="Cost name (e.g., HOA, Maintenance)"
                  value={cost.name}
                  onChange={(e) => updateCustomCost(index, 'name', e.target.value)}
                />
              </div>
              <div className="col-md-5">
                <input
                  type="number"
                  step="0.01"
                  className="form-control "
                  placeholder="Amount"
                  value={cost.amount}
                  onChange={(e) => updateCustomCost(index, 'amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-md-1">
                <button
                  type="button"
                  className="btn-secondary w-100"
                  onClick={() => removeCustomCost(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary w-100 mt-4" disabled={loading}>
          {loading ? 'Saving...' : 'Save Operating Costs'}
        </button>
      </form>
    </div>
  );
}
