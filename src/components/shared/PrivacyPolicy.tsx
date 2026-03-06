import { Container } from 'react-bootstrap';
import { Shield, Lock, Users, FileText, Settings, Mail, Globe, RefreshCw } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="bg-page min-vh-100">
      <Container className="py-5">
        <div className="card shadow-lg border-0 mb-4">
          <div className="card-body p-5">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-flex justify-content-center mb-3">
                <div className="stat-icon-brand d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                  <Shield size={40} color="white" />
                </div>
              </div>
              <h1 className="display-4 fw-bold mb-3">Privacy Policy</h1>
              <div className="text-muted">
                <p className="mb-1"><strong>Effective Date:</strong> January 15, 2025</p>
                <p className="mb-0"><strong>Last Updated:</strong> January 15, 2025</p>
              </div>
            </div>

            {/* Introduction */}
            <div className="mb-5">
              <p className="lead">
                At <strong>Rental Invoicing App</strong>, we care about your privacy. This Privacy Policy explains what personal information we collect, how we use it, and your rights.
              </p>
              <p className="text-muted">
                By using our app or submitting information, you agree to the terms of this policy.
              </p>
            </div>

            <hr className="my-5" />

            {/* Section 1: What Information We Collect */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <FileText size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">1. What Information We Collect</h2>
              </div>

              <p className="mb-4">We collect the following types of information:</p>

              <div className="card bg-light border-0 mb-4">
                <div className="card-body">
                  <h3 className="h5 mb-3">a. Information You Provide</h3>
                  <ul className="mb-0">
                    <li className="mb-2"><strong>Personal Details:</strong> Name, email address, phone number</li>
                    <li className="mb-2"><strong>Application Documents:</strong> Pay stubs, bank statements, credit reports, and current owner contact information</li>
                    <li><strong>Profile Info:</strong> If you sign in using Google, Apple, or Facebook, we may receive your name, profile photo, and email</li>
                  </ul>
                </div>
              </div>

              <div className="card bg-light border-0">
                <div className="card-body">
                  <h3 className="h5 mb-3">b. Automatically Collected Data</h3>
                  <ul className="mb-0">
                    <li className="mb-2">Device type, browser, IP address, and usage activity (e.g., page views, login time)</li>
                    <li>We may use cookies or similar technologies to improve your experience</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 2: How We Use Your Information */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-success me-3" style={{ width: '48px', height: '48px' }}>
                  <Settings size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">2. How We Use Your Information</h2>
              </div>

              <p className="mb-3">We use your data to:</p>
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>Let owners evaluate rental applications</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>Allow tenants to manage their documents</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>Send you notifications related to your account or application</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="badge bg-primary me-3 mt-1">✓</span>
                  <span>Improve app functionality and protect against fraud</span>
                </li>
              </ul>

              <div className="alert alert-info d-flex align-items-center" role="alert">
                <Shield className="me-3" size={24} />
                <strong>We never sell your personal data.</strong>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 3: Who Can See Your Information */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <Users size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">3. Who Can See Your Information</h2>
              </div>

              <p className="mb-3">Your data may be shared with:</p>
              <div className="card border-warning mb-3">
                <div className="card-body">
                  <ul className="mb-0">
                    <li className="mb-2"><strong>Owners you've applied to</strong> (for review purposes)</li>
                    <li className="mb-2"><strong>Service providers</strong> that help us deliver the app (e.g., secure storage, email systems)</li>
                    <li><strong>Legal authorities</strong> if required by law or to protect our rights</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 4: Social Logins */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <Users size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">4. Social Logins</h2>
              </div>

              <p>If you sign in with:</p>
              <div className="card bg-light border-0">
                <div className="card-body">
                  <p className="mb-2"><strong>Google, Apple, or Facebook:</strong></p>
                  <ul className="mb-0">
                    <li className="mb-2">We only request basic profile information (email, name)</li>
                    <li className="mb-2">We do not post to your account</li>
                    <li>We do not access your private contacts or messages</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 5: Document Security */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-success me-3" style={{ width: '48px', height: '48px' }}>
                  <Lock size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">5. Document Security</h2>
              </div>

              <p className="mb-4">We take protecting your sensitive documents seriously:</p>

              <div className="row g-3">
                <div className="col-md-4">
                  <div className="card h-100 border-success">
                    <div className="card-body text-center">
                      <Lock className="text-success mb-3" size={32} />
                      <h4 className="h6 mb-2">Encrypted Storage</h4>
                      <p className="small text-muted mb-0">All uploads are encrypted during upload and storage</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card h-100 border-success">
                    <div className="card-body text-center">
                      <Shield className="text-success mb-3" size={32} />
                      <h4 className="h6 mb-2">Restricted Access</h4>
                      <p className="small text-muted mb-0">Only the owner you applied to can view your documents</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card h-100 border-success">
                    <div className="card-body text-center">
                      <FileText className="text-success mb-3" size={32} />
                      <h4 className="h6 mb-2">Your Control</h4>
                      <p className="small text-muted mb-0">Delete your documents anytime before submission</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 6: Your Rights */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-brand me-3" style={{ width: '48px', height: '48px' }}>
                  <Settings size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">6. Your Rights</h2>
              </div>

              <p className="mb-3">You have the right to:</p>
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-start">
                  <span className="text-primary fw-bold me-3">→</span>
                  <span>View, edit, or delete your personal data</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="text-primary fw-bold me-3">→</span>
                  <span>Request that we stop processing your information</span>
                </li>
                <li className="mb-3 d-flex align-items-start">
                  <span className="text-primary fw-bold me-3">→</span>
                  <span>Contact us with any privacy concerns</span>
                </li>
              </ul>

              <div className="alert alert-primary">
                <strong>To request changes or data deletion:</strong> Email us at <a href="mailto:privacy@rentalinvoicingapp.com" className="alert-link">privacy@rentalinvoicingapp.com</a>
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 7: Children's Privacy */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-warning me-3" style={{ width: '48px', height: '48px' }}>
                  <Shield size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">7. Children's Privacy</h2>
              </div>

              <div className="alert alert-warning mb-0">
                This app is intended for users <strong>18 years or older</strong>. We do not knowingly collect data from children under 13.
              </div>
            </section>

            <hr className="my-5" />

            {/* Section 8: Data Storage */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-info me-3" style={{ width: '48px', height: '48px' }}>
                  <Globe size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">8. Data Storage</h2>
              </div>

              <p className="mb-3">We store your data in secure servers located in <strong>the United States</strong>.</p>
              <p className="text-muted">
                If you're located in a different region, you acknowledge that your data may be transferred and stored abroad.
              </p>
            </section>

            <hr className="my-5" />

            {/* Section 9: Updates to This Policy */}
            <section className="mb-5">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-success me-3" style={{ width: '48px', height: '48px' }}>
                  <RefreshCw size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">9. Updates to This Policy</h2>
              </div>

              <p className="mb-0">
                We may update this policy from time to time. When we do, we'll update the "Last Updated" date at the top.
                We recommend checking this page periodically for changes.
              </p>
            </section>

            <hr className="my-5" />

            {/* Contact Section */}
            <section className="mb-0">
              <div className="d-flex align-items-center mb-4">
                <div className="stat-icon-brand me-3" style={{ width: '48px', height: '48px' }}>
                  <Mail size={24} color="white" />
                </div>
                <h2 className="h3 mb-0">Contact Us</h2>
              </div>

              <p className="mb-4">Have questions? Reach out any time:</p>

              <div className="card bg-light border-0">
                <div className="card-body">
                  <p className="mb-2"><strong>Rental Invoicing App</strong></p>
                  <p className="mb-2">
                    <strong>Email:</strong> <a href="mailto:privacy@rentalinvoicingapp.com">privacy@rentalinvoicingapp.com</a>
                  </p>
                  <p className="mb-0 text-muted small">
                    For general support: <a href="mailto:support@rentalinvoicingapp.com">support@rentalinvoicingapp.com</a>
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
