import { useState } from 'react';
import { Home, FileText, File, LogOut, Download, CheckCircle, XCircle, User, MapPin, Layout } from 'lucide-react';
import type { Property, Resident, Invoice, LeaseDocument } from '../../App';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { PageHeader } from '../common/PageHeader';
import { TabNavigation } from '../common/TabNavigation';
import { getLeaseEndDisplay } from '../../utils/date';

type TenantPortalProps = {
  resident: Resident;
  property: Property;
  onLogout: () => void;
};

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

export function ResidentPortal({ resident, property, onLogout }: TenantPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'personal' | 'address' | 'invoices' | 'leases'>('dashboard');

  const calculateInvoiceTotal = (invoice: Invoice) => {
    const lateFees = invoice.daysLate * invoice.lateFeeDailyRate;
    const electricCharges = invoice.previousMonthElectricUsageKwh * invoice.electricRate;
    return invoice.lastMonthBalance + invoice.currentRent + lateFees + electricCharges;
  };

  const latestInvoice = resident.invoices[0];
  const totalDue = latestInvoice ? calculateInvoiceTotal(latestInvoice) : 0;

  // Helper to parse name from legacy data
  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  // Get occupants array (use new field or parse from legacy)
  const occupants = resident.occupants && resident.occupants.length > 0 
    ? resident.occupants 
    : [{
        id: 'occupant-1',
        ...parseName(resident.name),
        email: resident.email,
        phone: resident.phone,
      }];

  const primaryOccupant = occupants[0];

  // Format occupants names for display (e.g., "John Smith and Jane Doe" or "John Smith, Jane Doe and Bob Johnson")
  const formatOccupantsNames = (occupants: any[]) => {
    const names = occupants.map(occ => `${occ.firstName} ${occ.lastName}`.trim()).filter(name => name);
    
    if (names.length === 0) return 'Tenant';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    
    // 3 or more: "John Smith, Jane Doe and Bob Johnson"
    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast} and ${names[names.length - 1]}`;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layout },
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'leases', label: 'Leases', icon: File },
  ];

  return (
    <div className="bg-page">
      <PageHeader
        title="Resident Portal"
        subtitle={property.name}
        icon={<Home size={26} color="white" />}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main id="main-content" className="container-xl px-4 py-4">
        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as any)}
        />

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="glass-card p-4 mb-4">
              <div className={`d-grid gap-5 align-items-center ${latestInvoice ? '' : ''}`} style={{ gridTemplateColumns: latestInvoice ? '1fr auto' : '1fr' }}>
                <div>
                  <h2 className="h3 fw-bold text-dark mb-3">
                    Welcome back, {formatOccupantsNames(occupants)}
                  </h2>
                  <p className="mb-2 text-muted">
                    <strong className="text-dark">Unit:</strong> {resident.streetAddress}, Apt {resident.aptNumber}
                  </p>
                  <p className="mb-0 small text-muted">
                    {resident.city}, {resident.state} {resident.zipCode}
                  </p>
                </div>
                {latestInvoice && (
                  <div className={`p-4 rounded-4 text-center shadow ${
                    latestInvoice.isPaid ? 'btn-gradient-success' : 'bg-danger'
                  }`} style={{ minWidth: '200px' }}>
                    <p className="small text-white text-opacity-75 mb-2 fw-semibold">
                      Current Balance
                    </p>
                    <h3 className="display-4 fw-bold text-white mb-3">
                      ${totalDue.toFixed(2)}
                    </h3>
                    <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-white bg-opacity-25 rounded-pill small fw-semibold text-white">
                      {latestInvoice.isPaid ? (
                        <><CheckCircle size={16} /> Paid</>
                      ) : (
                        <><XCircle size={16} /> Unpaid</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Stats - Configurable */}
            {(resident.dashboardPreferences?.showLateFees ||
              resident.dashboardPreferences?.showElectricCollected ||
              resident.dashboardPreferences?.showElectricUsage) && (
              <div className="d-grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {/* Late Fees Card */}
                {resident.dashboardPreferences?.showLateFees && (() => {
                  const totalLateFees = resident.invoices.reduce((sum, inv) => 
                    sum + (inv.daysLate * inv.lateFeeDailyRate), 0
                  );
                  return (
                    <div className="glass-card p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <p className="small fw-semibold text-muted mb-0 ls-1">
                            Total Late Fees
                          </p>
                          <h3 className="h3 fw-bold text-dark mt-1 mb-0">
                            ${totalLateFees.toFixed(2)}
                          </h3>
                        </div>
                        <div className="brand-icon bg-warning">
                          <XCircle size={24} color="white" />
                        </div>
                      </div>
                      <p className="small text-muted mb-0">
                        All-time late fees incurred
                      </p>
                    </div>
                  );
                })()}

                {/* Electric Collected Card */}
                {resident.dashboardPreferences?.showElectricCollected && (() => {
                  const totalElectric = resident.invoices.reduce((sum, inv) => 
                    sum + (inv.previousMonthElectricUsageKwh * inv.electricRate), 0
                  );
                  return (
                    <div className="glass-card p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <p className="small fw-semibold text-muted mb-0 ls-1">
                            Electric Collected
                          </p>
                          <h3 className="h3 fw-bold text-dark mt-1 mb-0">
                            ${totalElectric.toFixed(2)}
                          </h3>
                        </div>
                        <div className="brand-icon bg-primary">
                          <CheckCircle size={24} color="white" />
                        </div>
                      </div>
                      <p className="small text-muted mb-0">
                        Total electric charges
                      </p>
                    </div>
                  );
                })()}

                {/* Electric Usage Card */}
                {resident.dashboardPreferences?.showElectricUsage && (() => {
                  const totalKwh = resident.invoices.reduce((sum, inv) => 
                    sum + inv.previousMonthElectricUsageKwh, 0
                  );
                  return (
                    <div className="glass-card p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <p className="small fw-semibold text-muted mb-0 ls-1">
                            Electric Usage
                          </p>
                          <h3 className="h3 fw-bold text-dark mt-1 mb-0">
                            {totalKwh.toFixed(0)} kWh
                          </h3>
                        </div>
                        <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                          <CheckCircle size={24} color="white" />
                        </div>
                      </div>
                      <p className="small text-muted mb-0">
                        Total electricity consumed
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="glass-card p-5 rounded-4 shadow">
            <h3 className="h4 fw-bold text-dark mb-4">
              Personal Information
            </h3>

            {/* All Occupants */}
            {occupants.map((occupant, index) => (
              <div key={occupant.id} className={index < occupants.length - 1 ? 'mb-5' : ''}>
                <h4 className="h6 fw-semibold text-secondary mb-4">
                  {index === 0 ? 'Primary Occupant' : `Occupant ${index + 1}`}
                </h4>
                <div className="row g-4">
                  <div className="col-md-6">
                    <p className="small text-muted mb-1 fw-semibold">First Name</p>
                    <p className="small text-dark mb-0">{occupant.firstName || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="small text-muted mb-1 fw-semibold">Last Name</p>
                    <p className="small text-dark mb-0">{occupant.lastName || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="small text-muted mb-1 fw-semibold">Email</p>
                    <p className="small text-dark mb-0">{occupant.email || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="small text-muted mb-1 fw-semibold">Phone</p>
                    <p className="small text-dark mb-0">{occupant.phone || '—'}</p>
                  </div>
                </div>
                {index < occupants.length - 1 && (
                  <hr className="my-4 border-light" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="glass-card p-5 rounded-4 shadow">
            <h3 className="h4 fw-bold text-dark mb-4">
              Address
            </h3>

            {/* Row 1: Street Address (2 cols) + Unit (1 col) */}
            <div className="row g-4 mb-4">
              <div className="col-md-8">
                <p className="small text-muted mb-1 fw-semibold">Street Address</p>
                <p className="small text-dark mb-0">{resident.streetAddress}</p>
              </div>
              <div className="col-md-4">
                <p className="small text-muted mb-1 fw-semibold">Unit/Apt</p>
                <p className="small text-dark mb-0">{resident.aptNumber}</p>
              </div>
            </div>

            {/* Row 2: City, State, Zip (1 col each) */}
            <div className="row g-4">
              <div className="col-md-4">
                <p className="small text-muted mb-1 fw-semibold">City</p>
                <p className="small text-dark mb-0">{resident.city}</p>
              </div>
              <div className="col-md-4">
                <p className="small text-muted mb-1 fw-semibold">State</p>
                <p className="small text-dark mb-0">{resident.state}</p>
              </div>
              <div className="col-md-4">
                <p className="small text-muted mb-1 fw-semibold">ZIP Code</p>
                <p className="small text-dark mb-0">{resident.zipCode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="d-grid gap-4">
            {resident.invoices.map((invoice, index) => {
              const total = calculateInvoiceTotal(invoice);
              const lateFees = invoice.daysLate * invoice.lateFeeDailyRate;
              const electricCharges = invoice.previousMonthElectricUsageKwh * invoice.electricRate;
              const isLatest = index === 0;

              return (
                <div
                  key={invoice.id}
                  className="glass-card rounded-4 shadow overflow-hidden"
                >
                  {/* Invoice Header */}
                  <div className={`p-4 ${isLatest ? 'btn-gradient' : 'bg-light'}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h3 className={`h5 fw-bold mb-1 ${isLatest ? 'text-white' : 'text-dark'}`}>
                          {invoice.month}
                          {isLatest && (
                            <span className="ms-3 small fw-semibold px-3 py-1 bg-white bg-opacity-25 rounded-3">
                              Latest
                            </span>
                          )}
                        </h3>
                        <p className={`small mb-0 ${isLatest ? 'text-white text-opacity-75' : 'text-muted'}`}>
                          Invoice Date: {new Date(invoice.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-3 small fw-semibold text-white d-flex align-items-center gap-2 ${invoice.isPaid ? 'bg-success' : 'bg-danger'}`}>
                        {invoice.isPaid ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {invoice.isPaid ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="p-4">
                    <div className="d-grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div className="p-4 bg-light rounded-3">
                        <p className="small text-muted mb-2 fw-semibold">
                          Monthly Rent
                        </p>
                        <p className="h5 fw-bold text-dark mb-0">
                          ${invoice.currentRent.toFixed(2)}
                        </p>
                      </div>
                      <div className={`p-4 rounded-3 ${invoice.lastMonthBalance > 0 ? 'bg-danger bg-opacity-10' : 'bg-light'}`}>
                        <p className="small text-muted mb-2 fw-semibold">
                          Previous Balance
                        </p>
                        <p className={`h5 fw-bold mb-0 ${invoice.lastMonthBalance > 0 ? 'text-danger' : 'text-dark'}`}>
                          ${invoice.lastMonthBalance.toFixed(2)}
                        </p>
                      </div>
                      <div className={`p-4 rounded-3 ${invoice.daysLate > 0 ? 'bg-danger bg-opacity-10' : 'bg-light'}`}>
                        <p className="small text-muted mb-2 fw-semibold">
                          Late Fees
                        </p>
                        <p className={`h5 fw-bold mb-0 ${invoice.daysLate > 0 ? 'text-danger' : 'text-dark'}`}>
                          ${lateFees.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-light rounded-3">
                        <p className="small text-muted mb-2 fw-semibold">
                          Electric ({invoice.previousMonthElectricUsageKwh} kWh)
                        </p>
                        <p className="h5 fw-bold text-dark mb-0">
                          ${electricCharges.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {invoice.electricMeterSnapshot && (
                      <div className="mb-4">
                        <p className="small fw-semibold text-secondary mb-3">
                          Electric Meter Reading
                        </p>
                        <ImageWithFallback
                          src={invoice.electricMeterSnapshot}
                          alt="Electric meter reading"
                          className="w-100 h-auto rounded-4 shadow"
                          style={{ maxWidth: '400px' }}
                        />
                      </div>
                    )}

                    <div className="p-4 btn-gradient rounded-4 d-flex justify-content-between align-items-center">
                      <span className="h5 fw-semibold text-white mb-0">
                        Total Amount Due
                      </span>
                      <span className="display-5 fw-bold text-white">
                        ${total.toFixed(2)}
                      </span>
                    </div>

                    {invoice.isPaid && invoice.paidDate && (
                      <div className="mt-4 p-3 bg-success bg-opacity-10 rounded-3 small text-success fw-semibold text-center">
                        ✓ Paid on {new Date(invoice.paidDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {resident.invoices.length === 0 && (
              <div className="glass-card py-5 px-4 text-center rounded-4">
                <FileText size={48} className="text-muted mb-4" />
                <h3 className="h5 fw-bold text-dark mb-2">
                  No invoices yet
                </h3>
                <p className="small text-muted mb-0">
                  Your invoices will appear here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Leases Tab */}
        {activeTab === 'leases' && (
          <div className="d-grid gap-4">
            {[...resident.leases]
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map((lease) => {
                const startYear = new Date(lease.startDate).getFullYear();
                const leaseTitle = `${startYear} ${lease.documentType === 'original' ? 'Original' : 'Renewal'} Lease`;

                return (
                  <div
                    key={lease.id}
                    className="glass-card p-4 rounded-4 shadow"
                  >
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h4 className="h5 fw-bold text-dark mb-1">
                          {leaseTitle}
                        </h4>
                        <p className="small text-muted mb-0">
                          {lease.leaseType === 'yearly' ? 'Yearly Lease' : 'Month-to-Month'}
                        </p>
                      </div>
                    </div>

                    <div className="row g-4 mb-4">
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">Start Date</p>
                        <p className="small text-dark mb-0">
                          {new Date(lease.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">End Date</p>
                        <p className="small text-dark mb-0">
                          {getLeaseEndDisplay(lease.leaseType, lease.endDate, lease.startDate)}
                        </p>
                      </div>
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">Monthly Rent</p>
                        <p className="small text-dark mb-0 fw-bold">
                          ${(lease.monthlyRent || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">Security Deposit</p>
                        <p className="small text-dark mb-0 fw-bold">
                          ${(lease.securityDeposit || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">Late Start Day</p>
                        <p className="small text-dark mb-0">
                          Day {lease.lateStartDay || 5}
                        </p>
                      </div>
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">Daily Late Rate</p>
                        <p className="small text-dark mb-0">
                          ${(lease.lateFeeDailyRate || 5.00).toFixed(2)}/day
                        </p>
                      </div>
                      <div className="col-md-2">
                        <p className="small text-muted mb-1 fw-semibold">Electric Rate</p>
                        <p className="small text-dark mb-0">
                          ${(lease.electricRate || 0.12).toFixed(2)}/kWh
                        </p>
                      </div>
                    </div>

                    {lease.notes && (
                      <div className="mb-4">
                        <p className="small text-muted mb-1 fw-semibold">Notes</p>
                        <p className="small text-dark mb-0 p-3 bg-light rounded-2">{lease.notes}</p>
                      </div>
                    )}

                    {lease.fileUrl ? (
                      <a
                        href={lease.fileUrl}
                        download={`Lease_${resident.name}_${lease.startDate}.pdf`}
                        className="btn btn-gradient text-white d-flex align-items-center justify-content-center gap-2 text-decoration-none small fw-semibold"
                      >
                        <Download size={16} />
                        Download PDF
                      </a>
                    ) : (
                      <div className="text-muted small text-center py-2">
                        <FileText size={16} className="me-1" />
                        No PDF attached
                      </div>
                    )}
                  </div>
                );
              })}

            {resident.leases.length === 0 && (
              <div className="glass-card py-5 px-4 text-center rounded-4">
                <File size={48} className="text-muted mb-4" />
                <h3 className="h5 fw-bold text-dark mb-2">
                  No lease documents
                </h3>
                <p className="small text-muted mb-0">
                  Your lease documents will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Debug Footer - Version Indicator */}
      <div className="text-center p-4 text-white text-opacity-50" style={{ fontSize: '11px' }}>
        Portal v2.2 - Updated {new Date().toLocaleString()} - Grid minWidth Removed
      </div>
    </div>
  );
}
