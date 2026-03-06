import { Container } from 'react-bootstrap';
import { FileText, Users, Shield, AlertTriangle, CreditCard, XCircle, Info, Mail } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="bg-page min-vh-100">
      <Container className="py-5">
        <div className="card shadow-lg border-0 mb-4">
          <div className="card-body p-5">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-flex justify-content-center mb-3">
                <div className="stat-icon-brand d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                  <FileText size={40} color="white" />
                </div>
              </div>
              <h1 className="display-4 fw-bold mb-3">Terms of Service</h1>
              <div className="text-muted">
                <p className="mb-0"><strong>Effective Date:</strong> January 15, 2025</p>
              </div>
            </div>

            {/* Introduction */}
            <div className="mb-5">
              <p className="lead">
                Welcome to <strong>Live the Cozy One</strong>! These Terms of Service ("Terms") govern your use of our platform, services, and tools ("Services"). By signing up or using our platform, you agree to these Terms.
              </p>
            </div>

            <hr className="my-5" />

            {/* Section 1: Who We Are */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <Info size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">1. Who We Are</h2>
              </div>

              <p className="mb-0">
                Live the Cozy One is a U.S.-based platform that helps owners manage rental units and invite tenants to apply, upload documents, and track payments. We make it easier for both parties to handle leases, applications, and communication online.
              </p>
            </section>

            <hr className="my-5" />

            {/* Section 2: Who Can Use the Platform */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-success me-3" style={{ width: '48px', height: '48px' }}>
                  <Users size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">2. Who Can Use the Platform</h2>
              </div>

              <p className="mb-3">You may use the Services if you:</p>

              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-success me-3 mt-1">✓</span>
                  <span>Are at least <strong>18 years old</strong></span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-success me-3 mt-1">✓</span>
                  <span>Live in the <strong>United States</strong></span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-success me-3 mt-1">✓</span>
                  <span>Agree to follow these Terms</span>
                </li>
              </ul>

              <p className="text-muted mb-0">
                By creating an account, you confirm that all information you provide is accurate.
              </p>
            </section>

            <hr className="my-5" />

            {/* Section 3: Account Responsibilities */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <Shield size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">3. Account Responsibilities</h2>
              </div>

              <p className="mb-3">You are responsible for:</p>

              <div className="card bg-light border-0 mb-3">
                <div className="card-body">
                  <ul className="mb-0">
                    <li className="mb-2">Keeping your login credentials private</li>
                    <li className="mb-2">All activity that occurs under your account</li>
                    <li>Ensuring uploaded documents do not violate privacy or copyright laws</li>
                  </ul>
                </div>
              </div>

              <div className="alert alert-warning">
                If you think your account has been compromised, please contact <a href="mailto:support@livethecozyone.com" className="alert-link">support@livethecozyone.com</a> immediately.
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 4: Acceptable Use */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <AlertTriangle size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">4. Acceptable Use</h2>
              </div>

              <p className="mb-3">You agree <strong>not to</strong>:</p>

              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-danger me-3 mt-1">✗</span>
                  <span>Upload false or misleading information</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-danger me-3 mt-1">✗</span>
                  <span>Use someone else's documents or data without permission</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-danger me-3 mt-1">✗</span>
                  <span>Interfere with the system or other users' experience</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-danger me-3 mt-1">✗</span>
                  <span>Attempt to reverse-engineer or exploit any part of the platform</span>
                </li>
              </ul>

              <div className="alert alert-danger">
                <strong>We reserve the right to suspend or terminate accounts that violate these rules.</strong>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 5: Document and Data Handling */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <FileText size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">5. Document and Data Handling</h2>
              </div>

              <p className="mb-3">Owners and tenants may upload documents such as:</p>

              <div className="card bg-light border-0 mb-4">
                <div className="card-body">
                  <ul className="mb-0">
                    <li className="mb-2">Pay stubs</li>
                    <li className="mb-2">Bank statements</li>
                    <li className="mb-2">Lease agreements</li>
                    <li>Utility or rent payment receipts</li>
                  </ul>
                </div>
              </div>

              <div className="alert alert-info mb-3">
                <strong>We do not verify these documents automatically.</strong> It is your responsibility to ensure they are complete and accurate.
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card h-100 border-primary">
                    <div className="card-body">
                      <h4 className="h6 mb-3"><strong>Tenants:</strong></h4>
                      <p className="mb-0">Only owners who invite you can view your submitted documents.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card h-100 border-primary">
                    <div className="card-body">
                      <h4 className="h6 mb-3"><strong>Owners:</strong></h4>
                      <p className="mb-0">Please respect your resident's privacy and use shared information only for rental purposes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 6: Payments and Invoicing */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-success me-3" style={{ width: '48px', height: '48px' }}>
                  <CreditCard size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">6. Payments and Invoicing</h2>
              </div>

              <p className="mb-3">
                While Live the Cozy One helps organize invoices and payment tracking, <strong>we do not process payments directly</strong>. Owners may share their preferred payment method (e.g., Zelle) through the platform.
              </p>

              <div className="alert alert-warning">
                <strong>We are not responsible for failed payments or disputes between owners and tenants.</strong>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 7: Termination */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <XCircle size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">7. Termination</h2>
              </div>

              <p className="mb-3">You may delete your account at any time.</p>

              <p className="mb-3">We reserve the right to suspend or terminate your access if:</p>

              <div className="card bg-light border-0 mb-3">
                <div className="card-body">
                  <ul className="mb-0">
                    <li className="mb-2">You violate these Terms</li>
                    <li className="mb-2">We believe your account poses a risk to others</li>
                    <li>Required by law or security concerns</li>
                  </ul>
                </div>
              </div>

              <p className="text-muted mb-0">
                Once deleted, your data is removed from our systems, except where required by law.
              </p>
            </section>

            <hr className="my-5" />

            {/* Section 8: Disclaimer of Warranties */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <AlertTriangle size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">8. Disclaimer of Warranties</h2>
              </div>

              <p className="mb-0">
                We provide the platform <strong>"as is"</strong> and without warranties of any kind. We do not guarantee that the platform will always be secure, error-free, or uninterrupted.
              </p>
            </section>

            <hr className="my-5" />

            {/* Section 9: Limitation of Liability */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <Shield size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">9. Limitation of Liability</h2>
              </div>

              <p className="mb-3">To the fullest extent allowed by law, Live the Cozy One is not liable for any damages resulting from:</p>

              <div className="card bg-light border-0">
                <div className="card-body">
                  <ul className="mb-0">
                    <li className="mb-2">Misuse of the platform</li>
                    <li className="mb-2">Third-party issues (e.g., payment apps)</li>
                    <li>Loss of data or service interruptions</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 10: Updates to These Terms */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <Info size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">10. Updates to These Terms</h2>
              </div>

              <p className="mb-0">
                We may update these Terms from time to time. We'll notify you of major changes, and your continued use of the platform means you accept the updated Terms.
              </p>
            </section>

            <hr className="my-5" />

            {/* Contact Section */}
            <section className="mb-0">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-brand me-3" style={{ width: '48px', height: '48px' }}>
                  <Mail size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">11. Contact Us</h2>
              </div>

              <p className="mb-4">For questions or concerns, reach out anytime:</p>

              <div className="card bg-light border-0">
                <div className="card-body">
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
