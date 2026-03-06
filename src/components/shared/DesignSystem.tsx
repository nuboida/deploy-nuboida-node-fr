import { useState } from 'react';
import { Row, Col, Card, Alert, Table, Form, Modal, Button, Dropdown, ProgressBar, Badge } from 'react-bootstrap';
import {
  Building2, Users, DollarSign, FileText, CheckCircle, XCircle,
  Clock, Eye, Mail, ArrowLeft, Search, Calendar, Filter, TrendingUp, MoreVertical, ExternalLink
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { TenantCard } from '../common/TenantCard';
import { TabNavigation } from '../common/TabNavigation';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper component for "Where this is used" sections
const WhereUsed = ({ links }: { links: Array<{ href: string; label: string }> }) => (
  <div className="mt-4 p-3 bg-light rounded">
    <h6 className="mb-2 small text-muted fw-semibold">Where this is used</h6>
    <div className="d-flex flex-wrap gap-2">
      {links.map((link, index) => (
        <span key={index}>
          <a href={link.href} className="text-decoration-none">
            {link.label}
          </a>
          {index < links.length - 1 && <span className="text-muted mx-1">•</span>}
        </span>
      ))}
    </div>
  </div>
);

// Helper component for anchor links (Table of Contents)
const AnchorLink = ({ targetId, children }: { targetId: string; children: React.ReactNode }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      // Get the element's position
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px offset for header

      // Scroll to position
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update URL hash without triggering navigation
      window.history.pushState(null, '', `#/design-system#${targetId}`);
    }
  };

  return (
    <a href={`#${targetId}`} onClick={handleClick} className="cursor-pointer">
      {children}
    </a>
  );
};

export function DesignSystem() {
  const [showModal, setShowModal] = useState(false);
  const sampleTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'components', label: 'Components' },
    { id: 'colors', label: 'Colors' },
  ];

  return (
    <div className="bg-page min-vh-100">
      <PageHeader
        title="Design System Documentation"
        subtitle="Comprehensive guide to UI elements and patterns"
        icon={<FileText size={26} color="white" />}
      />

      <main id="main-content" className="container-xxl px-4 py-4">
        <div className="row">
          {/* Sticky Table of Contents - Left Sidebar */}
          <div className="col-lg-3">
            <div className="design-system-toc">
              <div className="glass-card p-4">
                <h2 className="h5 mb-3">Table of Contents</h2>
                <ul className="list-unstyled">
                  <li className="mb-2"><AnchorLink targetId="colors">1. Color System</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="typography">2. Typography</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="buttons">3. Buttons</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="forms">4. Form Elements</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="badges">5. Badges</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="cards">6. Cards</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="tables">7. Tables</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="alerts">8. Alerts</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="modals">9. Modals</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="dropdowns">10. Dropdowns</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="progress">11. Progress Bars</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="search">12. Search</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="navigation">13. Navigation</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="icons">14. Icons</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="charts">15. Charts</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="invoice">16. Invoice Components</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="spacing">17. Spacing</AnchorLink></li>
                  <li className="mb-2"><AnchorLink targetId="components">18. Custom Components</AnchorLink></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content - Right Side */}
          <div className="col-lg-9">

        {/* 1. Color System */}
        <section id="colors" className="mb-5">
          <h2 className="h3 mb-4">1. Color System</h2>

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Brand Colors</h3>
            <Row className="g-3">
              <Col md={3}>
                <div className="p-4 rounded btn-gradient">
                  <div className="text-white">
                    <strong>Primary Gradient</strong>
                    <div className="small mt-2">#667eea → #764ba2</div>
                  </div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' }
                ]} />
              </Col>
              <Col md={3}>
                <div className="p-4 rounded" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                  <strong>Glass White</strong>
                  <div className="small text-muted mt-2">rgba(255, 255, 255, 0.95)</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
              <Col md={3}>
                <div className="p-4 rounded border" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <strong>Glass Light</strong>
                  <div className="small text-muted mt-2">rgba(255, 255, 255, 0.6)</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
                ]} />
              </Col>
              <Col md={3}>
                <div className="p-4 rounded border">
                  <strong>Background</strong>
                  <div className="small text-muted mt-2">#f3f4f6</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
            </Row>
          </div>

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Semantic Colors</h3>
            <Row className="g-3">
              <Col md={3}>
                <div className="p-3 rounded bg-success text-white">
                  <strong>Success</strong>
                  <div className="small mt-1">Approved, Completed</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Applications' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' }
                ]} />
              </Col>
              <Col md={3}>
                <div className="p-3 rounded bg-danger text-white">
                  <strong>Danger</strong>
                  <div className="small mt-1">Rejected, Errors</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Applications' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' }
                ]} />
              </Col>
              <Col md={3}>
                <div className="p-3 rounded bg-warning text-dark">
                  <strong>Warning</strong>
                  <div className="small mt-1">Incomplete, Alerts</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
              <Col md={3}>
                <div className="p-3 rounded bg-info text-white">
                  <strong>Info</strong>
                  <div className="small mt-1">Information, Notes</div>
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' }
                ]} />
              </Col>
            </Row>
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Text Colors</h3>
            <div className="mb-3">
              <div className="mb-2"><span className="text-dark"><strong>text-dark:</strong> Headings (#111827)</span></div>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <div className="mb-2"><span className="text-body"><strong>text-body:</strong> Body text (#374151)</span></div>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <div className="mb-2"><span className="text-muted"><strong>text-muted:</strong> Secondary text (#6b7280)</span></div>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <div className="mb-2"><span className="text-primary"><strong>text-primary:</strong> Links & accents (#667eea)</span></div>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/design-system', label: 'Design System' }
              ]} />
            </div>
          </div>
        </section>

        {/* 2. Typography */}
        <section id="typography" className="mb-5">
          <h2 className="h3 mb-4">2. Typography</h2>

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Headings</h3>
            <div className="mb-3">
              <h1 className="h2 mb-0">Heading 1 - H1 (2rem / 32px)</h1>
              <span className="text-muted d-block mt-2">Used with .h2 class for consistent styling</span>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/sign-in', label: 'Sign in page' },
                { href: '#/dashboard/invoice', label: 'Invoice View' }
              ]} />
            </div>
            <div className="mb-3">
              <h2 className="mb-2">Heading 2 - H2 (2rem / 32px)</h2>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/design-system', label: 'Design System' }
              ]} />
            </div>
            <div className="mb-3">
              <h3 className="mb-2">Heading 3 - H3 (1.75rem / 28px)</h3>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <h4 className="mb-2">Heading 4 - H4 (1.5rem / 24px)</h4>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
              ]} />
            </div>
            <div className="mb-3">
              <h5 className="mb-2">Heading 5 - H5 (1.25rem / 20px)</h5>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/design-system', label: 'Design System' }
              ]} />
            </div>
            <div className="mb-3">
              <h6 className="mb-2">Heading 6 - H6 (1rem / 16px)</h6>
              <WhereUsed links={[
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Body Text</h3>
            <div className="mb-3">
              <p className="mb-2"><strong>Base font:</strong> System font stack (default 1rem / 16px)</p>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <p className="mb-2 small"><strong>Small text:</strong> 0.875rem / 14px (.small class)</p>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' },
                { href: '#/design-system', label: 'Design System' }
              ]} />
            </div>
            <div className="mb-3">
              <p className="mb-2"><strong className="fw-bold">Bold text:</strong> 600 weight (.fw-bold)</p>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <p className="mb-2"><strong className="fw-semibold">Semi-bold text:</strong> 600 weight (.fw-semibold)</p>
              <WhereUsed links={[
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' },
                { href: '#/design-system', label: 'Design System' }
              ]} />
            </div>
          </div>
        </section>

        {/* 3. Buttons */}
        <section id="buttons" className="mb-5">
          <h2 className="h3 mb-4">3. Buttons</h2>

          

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Button Hierarchy</h3>
            <Alert variant="info" className="mb-4">
              <strong>Design Rule:</strong> Use ONLY ONE primary button per view for the main action.
            </Alert>

            <Row className="g-3 mb-4">
              <Col md={4}>
                <h6>Primary Button</h6>
                <button className="btn-primary mb-2">
                  <CheckCircle size={16} className="me-2" />
                  Primary Action
                </button>
                <div className="small text-muted">
                  <strong>Class:</strong> .btn-primary<br/>
                  <strong>Usage:</strong> Main action (Submit, Save, Approve)<br/>
                  <strong>Style:</strong> Purple gradient, white text, shadow<br/>
                  <strong>Limit:</strong> ONE per view
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>

              <Col md={4}>
                <h6>Secondary Button</h6>
                <button className="btn-secondary mb-2">
                  <Eye size={16} className="me-2" />
                  Secondary Action
                </button>
                <div className="small text-muted">
                  <strong>Class:</strong> .btn-secondary<br/>
                  <strong>Usage:</strong> Supporting actions (Cancel, View, Add)<br/>
                  <strong>Style:</strong> Glass white, border, subtle shadow<br/>
                  <strong>Limit:</strong> Multiple allowed
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>

              <Col md={4}>
                <h6>Tertiary Button</h6>
                <button className="btn-tertiary mb-2">
                  <ArrowLeft size={16} className="me-2" />
                  Tertiary Action
                </button>
                <div className="small text-muted">
                  <strong>Class:</strong> .btn-tertiary<br/>
                  <strong>Usage:</strong> Low priority (Back, Close, Preview)<br/>
                  <strong>Style:</strong> Transparent, minimal<br/>
                  <strong>Limit:</strong> Multiple allowed
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
            </Row>

            <h6 className="mt-4 mb-3">Button Sizes</h6>
            <div className="mb-3">
              <button className="btn-primary mb-2">Default Size</button>
              <WhereUsed links={[
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-primary btn-sm mb-2">Small (.btn-sm)</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-primary btn-lg mb-2">Large (.btn-lg)</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Properties (Modals)' }
              ]} />
            </div>

            <h6 className="mt-4 mb-3">Button States</h6>
            <div className="d-flex gap-2 mb-3">
              <button className="btn-primary">Normal</button>
              <button className="btn-primary" disabled>Disabled</button>
            </div>

            <h6 className="mt-4 mb-3">Additional Button Variants</h6>
            <div className="mb-3">
              <button className="btn-action mb-2">Action Button</button>
              <WhereUsed links={[
                { href: '#/dashboard/tenants', label: 'Tenants' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-action-primary mb-2">Action Primary</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-action-success mb-2">Action Success</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-action-danger mb-2">Action Danger</button>
              <WhereUsed links={[
                { href: '#/dashboard/tenants', label: 'Tenants' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-share mb-2">
                <Mail size={14} className="me-1" />
                Share
              </button>
              <WhereUsed links={[
                { href: '#/dashboard/tenants', label: 'Tenants' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-date-range mb-2">
                <Calendar size={14} className="me-1" />
                Date Range
              </button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-tab mb-2">Tab Button</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-outline mb-2">Outline</button>
              <WhereUsed links={[
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn-outline-secondary mb-2">Outline Secondary</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>

            <h6 className="mt-4 mb-3">Bootstrap Button Variants (Legacy contexts)</h6>
            <div className="mb-3">
              <button className="btn btn-success btn-sm mb-2">Success</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn btn-danger btn-sm mb-2">Danger</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn btn-warning btn-sm mb-2">Warning</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <button className="btn btn-outline-primary btn-sm mb-2">Outline Primary</button>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Accessibility Features</h3>
            <ul>
              <li><strong>Hover:</strong> Transform, shadow, underline text</li>
              <li><strong>Focus:</strong> 3px purple outline, 2px offset, underline text</li>
              <li><strong>Active:</strong> Reset transform for press feedback</li>
              <li><strong>Disabled:</strong> Reduced opacity, no pointer events, dimmed appearance</li>
            </ul>
          </div>
        </section>

        {/* 4. Form Elements */}
        <section id="forms" className="mb-5">
          <h2 className="h3 mb-4">4. Form Elements</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Input Fields</h3>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Text Input (.form-control)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter text"
                  />
                  <Form.Text className="text-muted">
                    Standard Bootstrap form control with custom padding
                  </Form.Text>
                </Form.Group>
                <WhereUsed links={[
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Select Dropdown</Form.Label>
                  <Form.Select>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </Form.Select>
                </Form.Group>
                <WhereUsed links={[
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' }
                ]} />
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Textarea</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter multiple lines"
                  />
                </Form.Group>
                <WhereUsed links={[
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Number Input</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                  />
                </Form.Group>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
                ]} />
              </Col>
            </Row>

            <h6 className="mt-4 mb-3">Checkboxes & Radios</h6>
            <div className="mb-3">
              <Form.Check
                type="checkbox"
                id="check1"
                label="Checkbox option"
                className="mb-2"
              />
              <Form.Check
                type="radio"
                id="radio1"
                name="radioGroup"
                label="Radio option 1"
                className="mb-2"
              />
              <Form.Check
                type="radio"
                id="radio2"
                name="radioGroup"
                label="Radio option 2"
              />
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
              ]} />
            </div>

            <h6 className="mt-4 mb-3">Form Switch</h6>
            <div className="mb-3">
              <Form.Check
                type="switch"
                id="switch1"
                label="Toggle switch"
              />
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
              ]} />
            </div>
          </div>
        </section>

        {/* 5. Badges */}
        <section id="badges" className="mb-5">
          <h2 className="h3 mb-4">5. Badges</h2>

          

          <div className="glass-card p-4">
            <Alert variant="warning" className="mb-3">
              <strong>Design Rule:</strong> NO pill/rounded-pill modifiers. Use standard 12px border-radius.
            </Alert>

            <h3 className="h5 mb-3">Badge Styles</h3>
            <div className="mb-4">
              <h6 className="mb-2">Glass Badge (Default)</h6>
              <span className="badge bg-glass me-2">Glass Badge</span>
              <span className="badge bg-glass me-2">
                <Mail size={12} className="me-1" />
                With Icon
              </span>
              <div className="small text-muted mt-2">
                <strong>Class:</strong> .badge.bg-glass<br/>
                <strong>Usage:</strong> Payment methods, statuses, counts<br/>
                <strong>Padding:</strong> 0.5rem 1rem (8px 16px)
              </div>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard' },
                { href: '#/dashboard/tenants', label: 'Tenants' }
              ]} />
            </div>

            <div className="mb-4">
              <h6 className="mb-2">Semantic Color Badges</h6>
              <div className="mb-3">
                <span className="badge bg-primary me-2">Primary</span>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </div>
              <div className="mb-3">
                <span className="badge bg-secondary me-2">Secondary</span>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </div>
              <div className="mb-3">
                <span className="badge bg-success me-2">
                  <CheckCircle size={12} className="me-1" />
                  Success
                </span>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </div>
              <div className="mb-3">
                <span className="badge bg-danger me-2">
                  <XCircle size={12} className="me-1" />
                  Danger
                </span>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </div>
              <div className="mb-3">
                <span className="badge bg-warning me-2">Warning</span>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </div>
              <div className="mb-3">
                <span className="badge bg-info me-2">Info</span>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' }
                ]} />
              </div>
            </div>

            <div className="mb-4">
              <h6 className="mb-2">Application Status Badges</h6>
              <span className="badge bg-secondary me-2">
                <Clock size={12} className="me-1" />
                DRAFT
              </span>
              <span className="badge bg-primary me-2">
                <FileText size={12} className="me-1" />
                SUBMITTED
              </span>
              <span className="badge bg-success me-2">
                <CheckCircle size={12} className="me-1" />
                APPROVED
              </span>
              <span className="badge bg-danger me-2">
                <XCircle size={12} className="me-1" />
                REJECTED
              </span>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>

            <div>
              <h6 className="mb-2">Badge Sizing</h6>
              <div className="small text-muted mb-2">
                All badges use consistent padding: <code>0.5rem 1rem</code> (8px vertical, 16px horizontal)
              </div>
            </div>
          </div>
        </section>

        {/* 6. Cards */}
        <section id="cards" className="mb-5">
          <h2 className="h3 mb-4">6. Cards</h2>

          

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Glass Card (Primary)</h3>
            <Row>
              <Col md={6}>
                <div className="glass-card p-4">
                  <h6 className="mb-2">Glass Card Example</h6>
                  <p className="mb-0 small text-muted">
                    Semi-transparent background with backdrop blur effect.
                    Used throughout the app for content containers.
                  </p>
                </div>
                <div className="small text-muted mt-2">
                  <strong>Class:</strong> .glass-card<br/>
                  <strong>Style:</strong> Glassmorphism effect, border, shadow<br/>
                  <strong>Usage:</strong> Main content containers
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard' },
                  { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                  { href: '#/dashboard/tenants', label: 'Tenants' },
                  { href: '#/dashboard', label: 'Dashboard - Invoices' },
                  { href: '#/dashboard', label: 'Dashboard - Applications' }
                ]} />
              </Col>
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <h6 className="mb-2">Bootstrap Card</h6>
                    <p className="mb-0 small text-muted">
                      Standard Bootstrap card used in some legacy components.
                      Solid white background.
                    </p>
                  </Card.Body>
                </Card>
                <div className="small text-muted mt-2">
                  <strong>Class:</strong> Bootstrap Card component<br/>
                  <strong>Usage:</strong> Application cards, tenant cards
                </div>
                <WhereUsed links={[
                  { href: '#/dashboard', label: 'Dashboard - Applications' },
                  { href: '#/dashboard', label: 'Dashboard (Tenant Cards)' }
                ]} />
              </Col>
            </Row>
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Card States</h3>
            <Alert variant="info">
              <strong>Design Rule:</strong> Glass cards should NOT have hover states. They are static containers.
            </Alert>
          </div>
        </section>

        {/* 7. Tables */}
        <section id="tables" className="mb-5">
          <h2 className="h3 mb-4">7. Tables</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Standard Table</h3>
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>John Doe</td>
                    <td><span className="badge bg-success">Paid</span></td>
                    <td>$1,200</td>
                    <td>
                      <button className="btn-secondary btn-sm">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Jane Smith</td>
                    <td><span className="badge bg-warning">Pending</span></td>
                    <td>$950</td>
                    <td>
                      <button className="btn-secondary btn-sm">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </div>
            <div className="small text-muted mt-3">
              <strong>Usage:</strong> Receipt lists, payment history<br/>
              <strong>Features:</strong> Responsive wrapper, hover states, striped option
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard - Invoices' },
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/dashboard/tenants', label: 'Tenants' }
            ]} />
          </div>
        </section>

        {/* 8. Alerts */}
        <section id="alerts" className="mb-5">
          <h2 className="h3 mb-4">8. Alerts</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Alert Variants</h3>
            <div className="mb-3">
              <Alert variant="success" className="mb-3">
                <strong>Success!</strong> Operation completed successfully.
              </Alert>
              <WhereUsed links={[
                { href: '#/dashboard', label: 'Dashboard - Applications' },
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' }
              ]} />
            </div>
            <div className="mb-3">
              <Alert variant="danger" className="mb-3">
                <strong>Error!</strong> Something went wrong.
              </Alert>
              <WhereUsed links={[
                { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
                { href: '#/dashboard', label: 'Dashboard - Invoices' }
              ]} />
            </div>
            <div className="mb-3">
              <Alert variant="warning" className="mb-3">
                <strong>Warning!</strong> Please review this information.
              </Alert>
              <WhereUsed links={[
                { href: '#/design-system', label: 'Design System' },
                { href: '#/dashboard', label: 'Dashboard - Applications' }
              ]} />
            </div>
            <div className="mb-3">
              <Alert variant="info" className="mb-3">
                <strong>Info:</strong> Here's some helpful information.
              </Alert>
              <WhereUsed links={[
                { href: '#/design-system', label: 'Design System' },
                { href: '#/dashboard', label: 'Dashboard' }
              ]} />
            </div>
          </div>
        </section>

        {/* 9. Modals */}
        <section id="modals" className="mb-5">
          <h2 className="h3 mb-4">9. Modals</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Modal Dialogs</h3>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Open Example Modal
            </Button>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>Modal Title</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p>This is a standard Bootstrap modal used for forms, confirmations, and detailed views.</p>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Example Input</Form.Label>
                    <Form.Control type="text" placeholder="Enter text" />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setShowModal(false)}>
                  Save Changes
                </Button>
              </Modal.Footer>
            </Modal>

            <div className="small text-muted mt-3">
              <strong>Component:</strong> React Bootstrap Modal<br/>
              <strong>Usage:</strong> Property forms, unit management, confirmations<br/>
              <strong>Sizes:</strong> sm, default, lg, xl<br/>
              <strong>Props:</strong> show, onHide, centered, size
            </div>
            <WhereUsed links={[
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/dashboard/tenants', label: 'Tenants' },
              { href: '#/dashboard', label: 'Dashboard - Invoices' },
              { href: '#/dashboard', label: 'Dashboard' }
            ]} />
          </div>
        </section>

        {/* 10. Dropdowns */}
        <section id="dropdowns" className="mb-5">
          <h2 className="h3 mb-4">10. Dropdowns</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Dropdown Menus</h3>
            <div className="d-flex gap-3 flex-wrap">
              <Dropdown>
                <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                  Actions
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item href="#action1">Edit</Dropdown.Item>
                  <Dropdown.Item href="#action2">View Details</Dropdown.Item>
                  <Dropdown.Item href="#action3">Delete</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-filter">
                  <Filter size={16} className="me-1" />
                  Filter
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item href="#filter1">All Properties</Dropdown.Item>
                  <Dropdown.Item href="#filter2">Active Only</Dropdown.Item>
                  <Dropdown.Item href="#filter3">Vacant Only</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown>
                <Dropdown.Toggle variant="link" className="p-0 text-dark">
                  <MoreVertical size={20} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item href="#more1">Action 1</Dropdown.Item>
                  <Dropdown.Item href="#more2">Action 2</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="small text-muted mt-3">
              <strong>Component:</strong> React Bootstrap Dropdown<br/>
              <strong>Usage:</strong> Action menus, filters, property selection<br/>
              <strong>Variants:</strong> primary, secondary, outline, link<br/>
              <strong>Features:</strong> Keyboard navigation, auto-positioning
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/dashboard/tenants', label: 'Tenants' }
            ]} />
          </div>
        </section>

        {/* 11. Progress Bars */}
        <section id="progress" className="mb-5">
          <h2 className="h3 mb-4">11. Progress Bars</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Progress Indicators</h3>
            <div className="mb-3">
              <div className="small text-muted mb-2">Default Progress (60%)</div>
              <ProgressBar now={60} />
            </div>
            <div className="mb-3">
              <div className="small text-muted mb-2">Success Variant (80%)</div>
              <ProgressBar now={80} variant="success" />
            </div>
            <div className="mb-3">
              <div className="small text-muted mb-2">Warning Variant (40%)</div>
              <ProgressBar now={40} variant="warning" />
            </div>
            <div className="mb-3">
              <div className="small text-muted mb-2">With Label (75%)</div>
              <ProgressBar now={75} label="75%" />
            </div>

            <div className="small text-muted mt-3">
              <strong>Component:</strong> React Bootstrap ProgressBar<br/>
              <strong>Usage:</strong> File uploads, application completion, loading states<br/>
              <strong>Variants:</strong> primary, success, warning, danger, info<br/>
              <strong>Features:</strong> Animated, striped, labeled
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard - Applications' }
            ]} />
          </div>
        </section>

        {/* 12. Search */}
        <section id="search" className="mb-5">
          <h2 className="h3 mb-4">12. Search Components</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Search Input</h3>
            <div className="search-container mb-4">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search tenants, properties, invoices..."
              />
            </div>

            <div className="small text-muted">
              <strong>Classes:</strong> .search-container, .search-input, .search-icon<br/>
              <strong>Usage:</strong> Dashboard tenant search, property filtering<br/>
              <strong>Features:</strong> Glass morphism background, icon positioning, focus states<br/>
              <strong>Structure:</strong> Container div with search icon + input field
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/tenants', label: 'Tenants' }
            ]} />
          </div>
        </section>

        {/* 13. Navigation */}
        <section id="navigation" className="mb-5">
          <h2 className="h3 mb-4">13. Navigation</h2>

          

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Page Header</h3>
            <div className="border rounded p-3 bg-light mb-3">
              <div className="header-main position-relative">
                <div className="container-xxl px-4 py-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div className="brand-icon">
                      <Building2 size={26} color="white" />
                    </div>
                    <div>
                      <h1 className="h2 mb-0">Page Title</h1>
                      <span className="text-muted">Subtitle text</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="small text-muted">
              <strong>Component:</strong> PageHeader<br/>
              <strong>Features:</strong> Sticky, glass blur, brand icon, title/subtitle, optional back/logout buttons
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/dashboard/tenants', label: 'Tenants' },
              { href: '#/dashboard', label: 'Dashboard - Invoices' },
              { href: '#/dashboard', label: 'Dashboard - Applications' }
            ]} />
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Tab Navigation</h3>
            <TabNavigation
              tabs={sampleTabs}
              activeTab="overview"
              onTabChange={() => {}}
            />
            <div className="tab-content-section">
              <p className="text-muted mb-0">Tab content goes here. Use <code>.tab-content-section</code> class for proper spacing.</p>
            </div>
            <div className="small text-muted mt-3">
              <strong>Component:</strong> TabNavigation<br/>
              <strong>Features:</strong> Icons, active state with gradient, glass container<br/>
              <strong>Usage:</strong> Dashboard, tenant portal, property views<br/>
              <strong>Tab Content Class:</strong> <code>.tab-content-section</code> - Adds proper top padding for content below tabs
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/tenants', label: 'Tenants (Tenant Details)' }
            ]} />
          </div>
        </section>

        {/* 14. Icons */}
        <section id="icons" className="mb-5">
          <h2 className="h3 mb-4">14. Icons</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Icon System (Lucide React)</h3>
            <div className="mb-3">
              <strong>Commonly Used Icons:</strong>
            </div>
            <div className="d-flex flex-wrap gap-3 mb-4">
              <div className="text-center">
                <Building2 size={24} className="text-primary" />
                <div className="small mt-1">Building2</div>
              </div>
              <div className="text-center">
                <Users size={24} className="text-primary" />
                <div className="small mt-1">Users</div>
              </div>
              <div className="text-center">
                <DollarSign size={24} className="text-primary" />
                <div className="small mt-1">DollarSign</div>
              </div>
              <div className="text-center">
                <FileText size={24} className="text-primary" />
                <div className="small mt-1">FileText</div>
              </div>
              <div className="text-center">
                <CheckCircle size={24} className="text-success" />
                <div className="small mt-1">CheckCircle</div>
              </div>
              <div className="text-center">
                <XCircle size={24} className="text-danger" />
                <div className="small mt-1">XCircle</div>
              </div>
              <div className="text-center">
                <Clock size={24} className="text-warning" />
                <div className="small mt-1">Clock</div>
              </div>
              <div className="text-center">
                <Eye size={24} className="text-primary" />
                <div className="small mt-1">Eye</div>
              </div>
            </div>

            <div className="mb-3">
              <strong>Icon Sizes:</strong>
            </div>
            <div className="d-flex align-items-center gap-3 mb-3">
              <FileText size={12} /> 12px (badges, inline)
              <FileText size={14} /> 14px (buttons, small)
              <FileText size={16} /> 16px (buttons, labels)
              <FileText size={18} /> 18px (headers)
              <FileText size={24} /> 24px (page headers)
              <FileText size={32} /> 32px (empty states)
            </div>

            <div className="small text-muted">
              <strong>Brand Icon Container:</strong> 48px gradient circle with shadow (.brand-icon)
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/dashboard/tenants', label: 'Tenants' },
              { href: '#/dashboard', label: 'Dashboard - Invoices' },
              { href: '#/dashboard', label: 'Dashboard - Applications' }
            ]} />
          </div>
        </section>

        {/* 15. Charts */}
        <section id="charts" className="mb-5">
          <h2 className="h3 mb-4">15. Charts & Data Visualization</h2>

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Line Chart</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={[
                  { month: 'Jan', revenue: 4200, expenses: 2800 },
                  { month: 'Feb', revenue: 3800, expenses: 2900 },
                  { month: 'Mar', revenue: 5100, expenses: 3200 },
                  { month: 'Apr', revenue: 4800, expenses: 3000 },
                  { month: 'May', revenue: 5400, expenses: 3100 },
                  { month: 'Jun', revenue: 6200, expenses: 3300 }
                ]}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#667eea" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>

            <div className="small text-muted mt-3">
              <strong>Library:</strong> Recharts<br/>
              <strong>Component:</strong> LineChart<br/>
              <strong>Features:</strong> Multiple data series, responsive, interactive tooltips, grid lines<br/>
              <strong>Brand Color:</strong> Use #667eea (purple gradient start) for primary data lines
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard - Net Income Trends' },
              { href: '#/dashboard/resident/1', label: 'Tenant Details - Electric Usage' }
            ]} />
          </div>

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Pie Chart</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Mortgage', value: 2500 },
                    { name: 'Utilities', value: 450 },
                    { name: 'Insurance', value: 300 },
                    { name: 'Maintenance', value: 200 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: $${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Mortgage', value: 2500 },
                    { name: 'Utilities', value: 450 },
                    { name: 'Insurance', value: 300 },
                    { name: 'Maintenance', value: 200 }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#667eea', '#764ba2', '#f59e0b', '#10b981'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="small text-muted mt-3">
              <strong>Library:</strong> Recharts<br/>
              <strong>Component:</strong> PieChart<br/>
              <strong>Features:</strong> Cost distribution, color-coded segments, percentage breakdowns<br/>
              <strong>Colors:</strong> Uses brand purple gradient colors (#667eea, #764ba2) + accent colors
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard - Property Distribution' },
              { href: '#/dashboard/edit-properties/monthly-costs', label: 'Properties - Cost Distribution' }
            ]} />
          </div>
        </section>

        {/* 16. Invoice Components */}
        <section id="invoice" className="mb-5">
          <h2 className="h3 mb-4">16. Invoice-Specific Components</h2>

          

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">Invoice Layout Classes</h3>
            <div className="border rounded p-3 bg-white">
              <div className="invoice-header p-3 mb-3">
                <h5 className="mb-0">Invoice Header</h5>
                <small className="text-muted">Class: .invoice-header</small>
              </div>
              <div className="invoice-section p-3 mb-3">
                <h6>Invoice Section</h6>
                <small className="text-muted">Class: .invoice-section</small>
              </div>
              <div className="invoice-item p-2 mb-2 border-bottom">
                <div className="d-flex justify-content-between">
                  <span>Invoice Item</span>
                  <span>$100.00</span>
                </div>
                <small className="text-muted">Class: .invoice-item</small>
              </div>
              <div className="invoice-total p-3 bg-light">
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>$100.00</span>
                </div>
                <small className="text-muted">Class: .invoice-total</small>
              </div>
            </div>

            <div className="small text-muted mt-3">
              <strong>Usage:</strong> InvoiceView, ReceiptDownload, tenant invoices<br/>
              <strong>Purpose:</strong> Consistent invoice layout and styling<br/>
              <strong>Features:</strong> Print-friendly, structured sections
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard - Invoices' }
            ]} />
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Collection Display</h3>
            <div className="border rounded p-3 bg-white">
              <div className="collection-summary">
                <div className="collection-item">
                  <span className="collection-label">Rent Collected:</span>
                  <span className="collection-value">$12,000.00</span>
                </div>
                <div className="collection-item">
                  <span className="collection-label">Electric Collected:</span>
                  <span className="collection-value">$450.00</span>
                </div>
              </div>
            </div>

            <div className="small text-muted mt-3">
              <strong>Classes:</strong> .collection-summary, .collection-item, .collection-label, .collection-value<br/>
              <strong>Usage:</strong> TenantCard, Dashboard summary statistics<br/>
              <strong>Features:</strong> Aligned labels and values, consistent spacing
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard (Tenant Cards)' },
              { href: '#/dashboard/tenants', label: 'Tenants' }
            ]} />
          </div>
        </section>

        {/* 17. Spacing */}
        <section id="spacing" className="mb-5">
          <h2 className="h3 mb-4">17. Spacing</h2>

          

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">Bootstrap Spacing Scale</h3>
            <Table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Size</th>
                  <th>Usage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>.mb-1, .p-1, etc.</code></td>
                  <td>0.25rem (4px)</td>
                  <td>Minimal spacing</td>
                </tr>
                <tr>
                  <td><code>.mb-2, .p-2, etc.</code></td>
                  <td>0.5rem (8px)</td>
                  <td>Tight spacing</td>
                </tr>
                <tr>
                  <td><code>.mb-3, .p-3, etc.</code></td>
                  <td>1rem (16px)</td>
                  <td>Standard spacing</td>
                </tr>
                <tr>
                  <td><code>.mb-4, .p-4, etc.</code></td>
                  <td>1.5rem (24px)</td>
                  <td>Section spacing</td>
                </tr>
                <tr>
                  <td><code>.mb-5, .p-5, etc.</code></td>
                  <td>3rem (48px)</td>
                  <td>Large sections</td>
                </tr>
              </tbody>
            </Table>

            <h6 className="mt-4 mb-3">Gap Utilities</h6>
            <div className="small">
              <code>.gap-1, .gap-2, .gap-3</code> - Flexbox gaps<br/>
              <code>.g-2, .g-3</code> - Grid gutters
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/edit-properties/property-information', label: 'Properties - Edit' },
              { href: '#/dashboard/tenants', label: 'Tenants' },
              { href: '#/dashboard', label: 'Dashboard - Invoices' },
              { href: '#/dashboard', label: 'Dashboard - Applications' }
            ]} />
          </div>
        </section>

        {/* 18. Custom Components */}
        <section id="components" className="mb-5">
          <h2 className="h3 mb-4">18. Custom Components</h2>

          

          <div className="glass-card p-4 mb-4">
            <h3 className="h5 mb-3">StatCard</h3>
            <Row className="mb-3">
              <Col md={3}>
                <StatCard
                  label="Total Revenue"
                  value="$12,450"
                  icon={<DollarSign size={24} />}
                  description="+12% from last month"
                  iconBgClass="stat-icon-success"
                />
              </Col>
              <Col md={3}>
                <StatCard
                  label="Active Tenants"
                  value="24"
                  icon={<Users size={24} />}
                  iconBgClass="stat-icon-primary"
                />
              </Col>
              <Col md={3}>
                <StatCard
                  label="Vacant Units"
                  value="3"
                  icon={<Building2 size={24} />}
                  description="5 pending applications"
                  iconBgClass="stat-icon-warning"
                />
              </Col>
              <Col md={3}>
                <StatCard
                  label="Notifications"
                  value="7"
                  icon={<TrendingUp size={24} />}
                  iconBgClass="stat-icon-info"
                />
              </Col>
            </Row>
            <div className="small text-muted">
              <strong>Component:</strong> StatCard<br/>
              <strong>Props:</strong> label, value, icon (ReactNode), description, iconBgClass<br/>
              <strong>Icon Classes:</strong> stat-icon-primary, stat-icon-success, stat-icon-warning, stat-icon-danger, stat-icon-info, stat-icon-light<br/>
              <strong>Usage:</strong> Dashboard metrics, summary statistics
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' }
            ]} />
          </div>

          <div className="glass-card p-4">
            <h3 className="h5 mb-3">TenantCard</h3>
            <Row>
              <Col md={6}>
                <TenantCard
                  name="Sarah Johnson"
                  unit="2B"
                  email="sarah.j@email.com"
                  rentCollected={12000}
                  electricCollected={450}
                  latestInvoiceAmount={1200}
                  latestInvoiceMonth="November 2025"
                  isPaid={true}
                  onClick={() => {}}
                  onViewInvoice={() => {}}
                />
              </Col>
              <Col md={6}>
                <TenantCard
                  name="Michael Chen"
                  unit="1A"
                  email="m.chen@email.com"
                  rentCollected={9500}
                  electricCollected={380}
                  latestInvoiceAmount={950}
                  latestInvoiceMonth="November 2025"
                  isPaid={false}
                  onClick={() => {}}
                  onViewInvoice={() => {}}
                />
              </Col>
            </Row>
            <div className="small text-muted mt-3">
              <strong>Component:</strong> TenantCard<br/>
              <strong>Props:</strong> name, unit, email, rentCollected, electricCollected, latestInvoiceAmount, latestInvoiceMonth, isPaid, onClick, onViewInvoice<br/>
              <strong>Features:</strong> Tenant info, collection summary, latest invoice status with paid/unpaid badge
            </div>
            <WhereUsed links={[
              { href: '#/dashboard', label: 'Dashboard' },
              { href: '#/dashboard/tenants', label: 'Tenants' }
            ]} />
          </div>
        </section>

        {/* Summary */}
        <div className="glass-card p-4">
          <h2 className="h4 mb-3">Design System Summary</h2>
          <Row>
            <Col md={6}>
              <h6>Key Principles</h6>
              <ul className="small">
                <li>Glassmorphism aesthetic with backdrop blur</li>
                <li>Purple gradient (#667eea → #764ba2) for brand</li>
                <li>One primary button per view</li>
                <li>No pill badges - use 12px border-radius</li>
                <li>WCAG 2.2 AA compliant</li>
                <li>Consistent spacing and typography</li>
              </ul>
            </Col>
            <Col md={6}>
              <h6>Technology Stack</h6>
              <ul className="small">
                <li>React 18 + TypeScript</li>
                <li>Bootstrap 5 + Custom SCSS</li>
                <li>Lucide React icons</li>
                <li>Responsive grid system</li>
                <li>Custom component library</li>
              </ul>
            </Col>
          </Row>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}
