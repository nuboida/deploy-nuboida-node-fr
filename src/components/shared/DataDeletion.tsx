import { Container } from 'react-bootstrap';
import { Trash2, Lock, AlertTriangle, FileText, Mail, Settings } from 'lucide-react';

export function DataDeletion() {
  return (
    <div className="bg-page min-vh-100">
      <Container className="py-5">
        <div className="card shadow-lg border-0 mb-4">
          <div className="card-body p-5">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-flex justify-content-center mb-3">
                <div className="stat-icon-brand d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                  <Trash2 size={40} color="white" />
                </div>
              </div>
              <h1 className="display-4 fw-bold mb-3">Request to Delete Your Data</h1>
              <p className="lead text-muted">
                At <strong>Live the Cozy One</strong>, your privacy matters. If you'd like to delete your account and all associated personal data, you're in the right place.
              </p>
            </div>

            <hr className="my-5" />

            {/* Section 1: What Happens When You Delete Your Data */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <Lock size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">What happens when you delete your data?</h2>
              </div>

              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>Your account and profile (including your name, email, and any contact details) will be <strong>permanently removed</strong></span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>Any files you uploaded (such as paystubs, bank statements, leases, receipts) will be <strong>deleted from our servers</strong></span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>You'll no longer have access to any invoices, applications, or messages</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-danger me-3 mt-1">!</span>
                  <span><strong>This action cannot be undone</strong></span>
                </li>
              </ul>

              <div className="alert alert-warning mt-4">
                <div className="d-flex align-items-start">
                  <AlertTriangle className="me-3 flex-shrink-0" size={24} />
                  <div>
                    <p className="mb-2"><strong>If you're a resident:</strong> make sure your property manager has saved or acknowledged any files they need before you proceed.</p>
                    <p className="mb-0"><strong>If you're a homeowner:</strong> deleting your data will remove access to all properties, units, invoices, and resident records under your account.</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 2: What We Keep */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <FileText size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">What we keep (if required by law)</h2>
              </div>

              <p className="mb-3">We may retain limited records only as required by legal, financial, or security obligations. For example:</p>

              <div className="card bg-light border-0">
                <div className="card-body">
                  <ul className="mb-0">
                    <li className="mb-2">Tax-related invoice records for owners (if applicable)</li>
                    <li>Fraud prevention logs for a limited period</li>
                  </ul>
                </div>
              </div>

              <p className="mt-3 text-muted">These are handled securely and automatically expire.</p>
            </section>

            <hr className="my-5" />

            {/* Section 3: How to Request Deletion */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-success me-3" style={{ width: '48px', height: '48px' }}>
                  <Trash2 size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">How to request deletion</h2>
              </div>

              <p className="mb-4">You can delete your account and data in two ways:</p>

              <div className="row g-4">
                <div className="col-md-6">
                  <div className="card h-100 border-primary">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <Settings className="text-primary me-2" size={28} />
                        <h3 className="h5 mb-0">From your dashboard</h3>
                      </div>
                      <ol className="mb-0">
                        <li className="mb-2">Go to <strong>Settings</strong></li>
                        <li className="mb-2">Click on <strong>"Delete My Account"</strong></li>
                        <li>Confirm the request</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card h-100 border-primary">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <Mail className="text-primary me-2" size={28} />
                        <h3 className="h5 mb-0">Or contact us directly</h3>
                      </div>
                      <p className="mb-2">Email us at <a href="mailto:support@livethecozyone.com">support@livethecozyone.com</a> with the subject line:</p>
                      <div className="alert alert-info mb-2">
                        <strong>"Request to Delete My Data"</strong>
                      </div>
                      <p className="small text-muted mb-0">Be sure to email from the address associated with your account.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Contact Section */}
            <section className="mb-0">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-brand me-3" style={{ width: '48px', height: '48px' }}>
                  <Mail size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">Need help or changed your mind?</h2>
              </div>

              <p className="mb-4">We're here to help. Reach out to us if you have any questions before deleting your account.</p>

              <div className="card bg-light border-0">
                <div className="card-body">
                  <p className="mb-2"><strong>Live the Cozy One Support</strong></p>
                  <p className="mb-0">
                    <strong>Email:</strong> <a href="mailto:support@livethecozyone.com">support@livethecozyone.com</a>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <a href="/#/" className="btn btn-outline-secondary">
            ← Back to Home
          </a>
        </div>
      </Container>
    </div>
  );
}
