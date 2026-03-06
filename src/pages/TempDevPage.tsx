import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, Home, Building2, Users, FileText, Inbox, BarChart3 } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export default function TempDevPage() {
  const navigate = useNavigate();
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState('property-1');
  const [selectedTenant, setSelectedTenant] = useState('tenant-1');
  const [portalToken, setPortalToken] = useState('tenant-1-portal');
  const [invoiceShareToken, setInvoiceShareToken] = useState('share-inv-1-11');

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopyStatus(`Copied ${label}!`);
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const demoProperties = [
    { id: 'property-1', name: 'Riverside Apartments', units: 4 },
    { id: 'property-2', name: 'Downtown Lofts', units: 3 },
    { id: 'property-3', name: 'Suburban Homes', units: 2 },
  ];

  const demoTenants = [
    { id: 'tenant-1', name: 'John Smith', property: 'Riverside Apartments', unit: '101' },
    { id: 'tenant-2', name: 'Sarah Johnson', property: 'Riverside Apartments', unit: '102' },
    { id: 'tenant-3', name: 'Michael Chen', property: 'Downtown Lofts', unit: '201' },
    { id: 'tenant-4', name: 'Emily Davis', property: 'Downtown Lofts', unit: '202' },
    { id: 'tenant-5', name: 'David Wilson', property: 'Suburban Homes', unit: 'Unit A' },
  ];

  return (
    <Container fluid className="py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-0">🛠️ Development Navigation Page</h1>
              <span className="text-muted">Quick access to all views and routes</span>
            </div>
            <Badge bg="warning" text="dark">TEMP DEV PAGE</Badge>
          </div>
        </Col>
      </Row>

      {copyStatus && (
        <Alert variant="success" dismissible onClose={() => setCopyStatus('')}>
          {copyStatus}
        </Alert>
      )}

      {/* Main Owner Views */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <Home size={20} />
              <strong>Main Owner Views</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/dashboard')}>
                      Dashboard / Home
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Main dashboard view</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/login')}>
                      Login Page
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Authentication view</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/register')}>
                      Register Page
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Sign up view</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Property Management */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <Building2 size={20} />
              <strong>Property Management</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Select Property:</Form.Label>
                <Form.Select 
                  value={selectedProperty} 
                  onChange={(e) => setSelectedProperty(e.target.value)}
                >
                  {demoProperties.map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name} ({prop.units} units)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Row className="g-3">
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/properties')}>
                      All Properties
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Property list & selector</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/property/${selectedProperty}`)}>
                      View Selected Property
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Single property details</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/property/${selectedProperty}/units`)}>
                      Unit Management
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Add/manage units & applications</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tenant Management */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <Users size={20} />
              <strong>Tenant Management</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Select Tenant:</Form.Label>
                <Form.Select 
                  value={selectedTenant} 
                  onChange={(e) => setSelectedTenant(e.target.value)}
                >
                  {demoTenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.property} #{tenant.unit}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Row className="g-3">
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/tenants')}>
                      All Tenants
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Tenant list view</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/tenant/${selectedTenant}`)}>
                      View Selected Tenant
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Single tenant details</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/tenant/${selectedTenant}/dashboard-settings`)}>
                      Tenant Dashboard Settings
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Customize tenant portal visibility</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Invoice & Financial */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <FileText size={20} />
              <strong>Invoices & Financial</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/invoices')}>
                      All Invoices
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Invoice management</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/create-invoice')}>
                      Create Invoice
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Generate new invoice</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/invoice/${selectedTenant}/2024-11`)}>
                      View Sample Invoice
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Invoice detail view</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Lease Documents */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <FileText size={20} />
              <strong>Lease Documents</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/leases')}>
                      All Lease Documents
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Owner view: upload & manage</small>
                </Col>
                <Col md={6}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/tenant/${selectedTenant}/leases`)}>
                      Tenant Lease View
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Tenant view: read-only</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Applications */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <Inbox size={20} />
              <strong>Tenant Applications</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/applications')}>
                      All Applications
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Owner application management</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/apply/unit-1')}>
                      Apply for Unit (Guest)
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Public application form</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/application/app-1')}>
                      View Application Details
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Single application view</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tenant Portal (Public Views) */}
      <Row className="mb-4">
        <Col>
          <Card border="success">
            <Card.Header className="d-flex align-items-center gap-2 bg-success text-white">
              <ExternalLink size={20} />
              <strong>Tenant Portal (Public Views - No Login Required)</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Share Token (for testing):</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control 
                    type="text" 
                    value={portalToken} 
                    onChange={(e) => setPortalToken(e.target.value)}
                    placeholder="Enter share token"
                  />
                  <Button 
                    variant="outline-secondary"
                    onClick={() => handleCopy(portalToken, 'share token')}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </Form.Group>
              <Row className="g-3">
                <Col md={4}>
                  <div className="d-grid">
                    <Button 
                      variant="success" 
                      onClick={() => {
                        console.log('[TempDevPage] Navigating to portal with token:', portalToken);
                        console.log('[TempDevPage] Full path:', `/portal/${portalToken}`);
                        navigate(`/portal/${portalToken}`);
                      }}
                    >
                      Tenant Portal
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Main tenant dashboard</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button 
                      variant="success" 
                      onClick={() => {
                        console.log('[TempDevPage] Navigating to share with token:', invoiceShareToken);
                        console.log('[TempDevPage] Full path:', `/share/${invoiceShareToken}`);
                        navigate(`/share/${invoiceShareToken}`);
                      }}
                    >
                      Shared Invoice
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Single invoice share link</small>
                </Col>
                <Col md={4}>
                  <div className="d-grid">
                    <Button 
                      variant="success" 
                      onClick={() => navigate(`/portal/${portalToken}/history`)}
                    >
                      Invoice History
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Tenant invoice history</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Analytics & Reports */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <BarChart3 size={20} />
              <strong>Analytics & Reports</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate('/analytics')}>
                      Analytics Dashboard
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Financial charts & metrics</small>
                </Col>
                <Col md={6}>
                  <div className="d-grid">
                    <Button variant="primary" onClick={() => navigate(`/tenant/${selectedTenant}/electric-usage`)}>
                      Electric Usage Charts
                    </Button>
                  </div>
                  <small className="text-muted d-block mt-1">Tenant electric usage visualization</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Links Generator */}
      <Row className="mb-4">
        <Col>
          <Card border="info">
            <Card.Header className="bg-info text-white">
              <strong>🔗 Quick Link Generator</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <p className="mb-2"><strong>Share Invoice Link:</strong></p>
                  <div className="d-flex gap-2">
                    <Form.Control 
                      readOnly 
                      value={`${window.location.origin}/#/share/${invoiceShareToken}`}
                      size="sm"
                    />
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleCopy(`${window.location.origin}/#/share/${invoiceShareToken}`, 'share link')}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </Col>
                <Col md={6}>
                  <p className="mb-2"><strong>Tenant Portal Link:</strong></p>
                  <div className="d-flex gap-2">
                    <Form.Control 
                      readOnly 
                      value={`${window.location.origin}/#/portal/${portalToken}`}
                      size="sm"
                    />
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleCopy(`${window.location.origin}/#/portal/${portalToken}`, 'portal link')}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </Col>
                <Col md={12}>
                  <p className="mb-2"><strong>Application Link:</strong></p>
                  <div className="d-flex gap-2">
                    <Form.Control 
                      readOnly 
                      value={`${window.location.origin}/#/apply/unit-1`}
                      size="sm"
                    />
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleCopy(`${window.location.origin}/#/apply/unit-1`, 'application link')}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Development Info */}
      <Row>
        <Col>
          <Card border="warning">
            <Card.Header className="bg-warning">
              <strong>⚠️ Development Information</strong>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6>Router Info:</h6>
                  <ul className="small">
                    <li>Using HashRouter for GitHub Pages compatibility</li>
                    <li>All URLs prefixed with <code>#/</code></li>
                    <li>Demo data: 3 properties, 9 tenants, $17,800 monthly income</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6>Features Implemented:</h6>
                  <ul className="small">
                    <li>✅ Authentication & Property Management</li>
                    <li>✅ Invoice Generation with Auto-calculations</li>
                    <li>✅ Tenant Portal with Share Links</li>
                    <li>✅ Lease Document Management</li>
                    <li>✅ Unit Management & Applications</li>
                    <li>✅ WCAG 2.2 AA Compliance</li>
                    <li>✅ Clipboard Utility with Fallback</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}