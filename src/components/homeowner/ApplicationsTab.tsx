import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Modal, Form } from 'react-bootstrap';
import { FileText, CheckCircle, XCircle, Clock, Download, Eye, Phone, Mail, Send, Search } from 'lucide-react';
import type { TenantApplication, Unit, Property } from '../../App';

interface ApplicationsTabProps {
  applications: TenantApplication[];
  units: Unit[];
  properties: Property[];
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onSendInvite: (unitId: string, email?: string) => void;
}

export function ApplicationsTab({
  applications,
  units,
  properties,
  onApprove,
  onReject,
  onSendInvite,
}: ApplicationsTabProps) {
  const navigate = useNavigate();
  const [selectedApplication, setSelectedApplication] = useState<TenantApplication | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'email' | 'link'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabKey, setActiveTabKey] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const getUnit = (unitId: string) => units.find(u => u.id === unitId);

  const getProperty = (unitId: string) => {
    const unit = getUnit(unitId);
    if (!unit) return null;
    return properties.find(p => p.id === unit.propertyId);
  };

  const getStatusBadge = (status: TenantApplication['status']) => {
    const config = {
      draft: { bg: 'secondary', icon: Clock, text: 'DRAFT' },
      submitted: { bg: 'primary', icon: FileText, text: 'SUBMITTED' },
      approved: { bg: 'success', icon: CheckCircle, text: 'APPROVED' },
      rejected: { bg: 'danger', icon: XCircle, text: 'REJECTED' },
    };
    const { bg, icon: Icon, text } = config[status];
    return (
      <Badge bg={bg} className="d-inline-flex align-items-center gap-1">
        <Icon size={12} />
        {text}
      </Badge>
    );
  };

  const handleViewDetails = (application: TenantApplication) => {
    navigate(`/application/${application.id}`);
  };

  const handleDownloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  const handleSendInvite = () => {
    const email = inviteMethod === 'email' ? inviteEmail : undefined;
    onSendInvite(selectedUnitId, email);
    setShowInviteModal(false);
    setInviteEmail('');
    setCopiedLink(false);
  };

  const handleGenerateLink = () => {
    const token = Math.random().toString(36).substring(2, 15);
    setGeneratedToken(token);
    return `${window.location.origin}${window.location.pathname}#/apply/${token}`;
  };

  const handleCopyLink = () => {
    const link = handleGenerateLink();
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    textArea.remove();
  };

  const submittedApplications = (applications || []).filter(app => app.status === 'submitted');
  const approvedApplications = (applications || []).filter(app => app.status === 'approved');
  const rejectedApplications = (applications || []).filter(app => app.status === 'rejected');

  const requiredSavings = (unitId: string) => {
    const unit = getUnit(unitId);
    return unit ? unit.rentAmount * 4 : 0;
  };

  // Get current applications based on active tab
  const getCurrentApplications = () => {
    switch (activeTabKey) {
      case 'pending': return submittedApplications;
      case 'approved': return approvedApplications;
      case 'rejected': return rejectedApplications;
      default: return submittedApplications;
    }
  };

  // Filter applications by search term
  const filteredApplications = getCurrentApplications().filter(app => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${app.applicantInfo?.firstName || ''} ${app.applicantInfo?.lastName || ''}`.toLowerCase();
    const email = (app.applicantInfo?.email || '').toLowerCase();
    const unit = getUnit(app.unitId);
    const unitName = (unit?.name || '').toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower) || unitName.includes(searchLower);
  });

  const getEmptyStateInfo = () => {
    switch (activeTabKey) {
      case 'pending':
        return { icon: Clock, message: 'No pending applications', hint: 'Send an invite to get started' };
      case 'approved':
        return { icon: CheckCircle, message: 'No approved applications yet', hint: 'Approved applications will appear here' };
      case 'rejected':
        return { icon: XCircle, message: 'No rejected applications', hint: 'Rejected applications will appear here' };
      default:
        return { icon: Clock, message: 'No applications', hint: '' };
    }
  };

  const renderApplicationCard = (application: TenantApplication) => {
    const unit = getUnit(application.unitId);
    const property = getProperty(application.unitId);

    return (
      <div key={application.id} className="col-md-6 col-lg-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="p-3">
            {/* Header with name and status */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h6 className="mb-1 fw-semibold">
                  {application.applicantInfo?.firstName} {application.applicantInfo?.lastName}
                </h6>
                <small className="text-muted">
                  {unit?.name} • {property?.name}
                </small>
              </div>
              {getStatusBadge(application.status)}
            </div>

            {/* Contact info */}
            <div className="mb-3">
              <div className="d-flex align-items-center gap-2 mb-1">
                <Mail size={14} className="text-muted" />
                <small className="text-muted">{application.applicantInfo?.email}</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Phone size={14} className="text-muted" />
                <small className="text-muted">{application.applicantInfo?.phone}</small>
              </div>
            </div>

            <hr className="my-3" />

            {/* Documents summary */}
            <div className="mb-3">
              <small className="d-block mb-2 fw-semibold">Documents</small>
              <div className="d-flex flex-column gap-1 small">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Pay Stubs</span>
                  <span className="d-flex align-items-center gap-1">
                    {application.payStubs.length}
                    {application.payStubs.length >= (unit?.requirements?.payStubsWeeks || 12) && (
                      <CheckCircle size={12} className="text-success" />
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Bank Statements</span>
                  <span className="d-flex align-items-center gap-1">
                    {application.bankStatements.length}
                    {application.bankStatements.length >= (unit?.requirements?.bankStatementsMonths || 3) && (
                      <CheckCircle size={12} className="text-success" />
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Credit Report</span>
                  <span className="d-flex align-items-center gap-1">
                    {application.creditReport ? 'Yes' : 'No'}
                    {application.creditReport && (
                      <CheckCircle size={12} className="text-success" />
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Savings */}
            <div className="mb-3">
              <small className="d-block mb-2 fw-semibold">Savings</small>
              <div className="d-flex justify-content-between align-items-center small">
                <span>${application.calculatedSavings?.toLocaleString() || 0}</span>
                <span className={application.meetsRequirements ? 'text-success' : 'text-danger'}>
                  Required: ${requiredSavings(application.unitId).toLocaleString()}
                  {application.meetsRequirements && (
                    <CheckCircle size={12} className="ms-1" />
                  )}
                </span>
              </div>
            </div>

            {/* Requirements badge */}
            {application.meetsRequirements ? (
              <Badge bg="success" className="w-100 mb-3 py-2">
                All Requirements Met ✓
              </Badge>
            ) : (
              <Badge bg="warning" text="dark" className="w-100 mb-3 py-2">
                Some Requirements Not Met
              </Badge>
            )}

            {/* Action buttons */}
            <div className="d-flex flex-column gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleViewDetails(application)}
                className="w-100"
              >
                <Eye size={14} className="me-1" />
                View Application
              </Button>
              {application.status === 'submitted' && (
                <div className="d-flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-fill"
                    onClick={() => {
                      if (window.confirm('Approve this application?')) {
                        onApprove(application.id);
                      }
                    }}
                  >
                    <CheckCircle size={14} className="me-1" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-fill"
                    onClick={() => {
                      if (window.confirm('Reject this application?')) {
                        onReject(application.id);
                      }
                    }}
                  >
                    <XCircle size={14} className="me-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>

            {/* Submitted date */}
            {application.submittedDate && (
              <small className="text-muted d-block mt-3 text-center">
                Submitted: {new Date(application.submittedDate).toLocaleDateString()}
              </small>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  };

  const emptyState = getEmptyStateInfo();
  const EmptyIcon = emptyState.icon;

  return (
    <Card className="border-0 shadow-lg rounded-4">
      <Card.Body className="p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="mb-1">Applications</h3>
            <p className="text-muted mb-0">Review and manage tenant applications</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedUnitId(units.find(u => u.status === 'vacant')?.id || units[0]?.id || '');
              setInviteEmail('');
              setInviteMethod('link');
              setCopiedLink(false);
              setShowInviteModal(true);
            }}
            className="btn-gradient border-0 px-3 py-2"
          >
            <Send size={16} className="me-1" />
            Send Invite
          </Button>
        </div>

        {/* Filter pills for application status */}
        <div className="filter-pills mb-4" role="tablist" aria-label="Filter applications by status">
          <button
            type="button"
            role="tab"
            aria-selected={activeTabKey === 'pending'}
            aria-controls="applications-panel"
            onClick={() => setActiveTabKey('pending')}
            className={`filter-pill ${activeTabKey === 'pending' ? 'active' : ''}`}
            data-status="pending"
          >
            <Clock size={14} aria-hidden="true" />
            Pending ({submittedApplications.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTabKey === 'approved'}
            aria-controls="applications-panel"
            onClick={() => setActiveTabKey('approved')}
            className={`filter-pill ${activeTabKey === 'approved' ? 'active' : ''}`}
            data-status="approved"
          >
            <CheckCircle size={14} aria-hidden="true" />
            Approved ({approvedApplications.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTabKey === 'rejected'}
            aria-controls="applications-panel"
            onClick={() => setActiveTabKey('rejected')}
            className={`filter-pill ${activeTabKey === 'rejected' ? 'active' : ''}`}
            data-status="rejected"
          >
            <XCircle size={14} aria-hidden="true" />
            Rejected ({rejectedApplications.length})
          </button>
        </div>

        {/* Content based on whether there are any applications */}
        <div id="applications-panel" role="tabpanel" aria-label={`${activeTabKey} applications`}>
          {getCurrentApplications().length === 0 ? (
            <div className="text-center py-5 bg-light rounded-3">
              <EmptyIcon size={48} className="text-muted mb-3" aria-hidden="true" />
              <p className="text-muted mb-0">{emptyState.message}</p>
              <small className="text-muted">{emptyState.hint}</small>
            </div>
          ) : (
            <>
              {/* Search Filter */}
              <div className="mb-4" style={{ maxWidth: '400px' }}>
                <div className="position-relative">
                  <Search className="position-absolute top-50 translate-middle-y ms-3 text-muted" size={18} aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Filter by name, email, or unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control ps-5"
                    aria-label="Filter applications"
                  />
                </div>
              </div>

              {/* Applications Grid */}
              {filteredApplications.length > 0 ? (
                <div className="row g-4">
                  {filteredApplications.map(renderApplicationCard)}
                </div>
              ) : (
                <div className="text-center py-5 bg-light rounded-3">
                  <p className="text-muted mb-0">No applications match your search</p>
                  <small className="text-muted">Try a different search term</small>
                </div>
              )}
            </>
          )}
        </div>
      </Card.Body>

      {/* Application Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Application Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <>
              <Card className="mb-3">
                <Card.Header>
                  <strong>Applicant Information</strong>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1">
                        <strong>Name:</strong> {selectedApplication.applicantInfo?.firstName} {selectedApplication.applicantInfo?.lastName}
                      </p>
                      <p className="mb-1">
                        <strong>Email:</strong> {selectedApplication.applicantInfo?.email}
                      </p>
                      <p className="mb-0">
                        <strong>Phone:</strong> {selectedApplication.applicantInfo?.phone}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1">
                        <strong>Unit:</strong> {getUnit(selectedApplication.unitId)?.name}
                      </p>
                      <p className="mb-1">
                        <strong>Property:</strong> {getProperty(selectedApplication.unitId)?.name}
                      </p>
                      <p className="mb-0">
                        <strong>Status:</strong> {getStatusBadge(selectedApplication.status)}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>
                  <strong>Pay Stubs ({selectedApplication.payStubs.length})</strong>
                </Card.Header>
                <Card.Body>
                  {selectedApplication.payStubs.map(doc => (
                    <div key={doc.id} className="d-flex justify-content-between align-items-center mb-2">
                      <span>
                        <FileText size={14} className="me-2" />
                        {doc.fileName}
                      </span>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  ))}
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>
                  <strong>Bank Statements ({selectedApplication.bankStatements.length})</strong>
                </Card.Header>
                <Card.Body>
                  {selectedApplication.bankStatements.map(doc => (
                    <div key={doc.id} className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <FileText size={14} className="me-2" />
                        {doc.fileName}
                        {doc.tag && (
                          <Badge bg="secondary" className="ms-2">
                            {doc.tag === 'income' && 'Income Proof'}
                            {doc.tag === 'rent' && 'Rent Payment'}
                            {doc.tag === 'savings' && 'Savings'}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  ))}
                  <hr />
                  <p className="mb-0">
                    <strong>Calculated Savings:</strong> ${selectedApplication.calculatedSavings?.toLocaleString() || 0}
                    {selectedApplication.calculatedSavings && selectedApplication.calculatedSavings >= requiredSavings(selectedApplication.unitId) && (
                      <Badge bg="success" className="ms-2">Meets Requirement</Badge>
                    )}
                  </p>
                </Card.Body>
              </Card>

              {selectedApplication.creditReport && (
                <Card className="mb-3">
                  <Card.Header>
                    <strong>Credit Report</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>
                        <FileText size={14} className="me-2" />
                        {selectedApplication.creditReport.fileName}
                      </span>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleDownloadDocument(selectedApplication.creditReport)}
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {selectedApplication.currentOwner && (
                <Card className="mb-3">
                  <Card.Header>
                    <strong>Current Owner Reference</strong>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-1">
                      <strong>Name:</strong> {selectedApplication.currentOwner.name}
                    </p>
                    <p className="mb-1">
                      <strong>Phone:</strong> {selectedApplication.currentOwner.phone}
                    </p>
                    {selectedApplication.currentOwner.email && (
                      <p className="mb-0">
                        <strong>Email:</strong> {selectedApplication.currentOwner.email}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {selectedApplication?.status === 'submitted' && (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('Reject this application?')) {
                    onReject(selectedApplication.id);
                    setShowDetailsModal(false);
                  }
                }}
              >
                <XCircle size={16} className="me-2" />
                Reject
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  if (window.confirm('Approve this application?')) {
                    onApprove(selectedApplication.id);
                    setShowDetailsModal(false);
                  }
                }}
              >
                <CheckCircle size={16} className="me-2" />
                Approve
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Send Invite Modal */}
      <Modal show={showInviteModal} onHide={() => setShowInviteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Send Application Invite</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Unit</Form.Label>
              <Form.Select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
              >
                {units.map(unit => {
                  const property = getProperty(unit.id);
                  return (
                    <option key={unit.id} value={unit.id}>
                      {property?.name} - {unit.number} (${unit.rentAmount.toLocaleString()}) - {unit.status.toUpperCase()}
                    </option>
                  );
                })}
              </Form.Select>
              <Form.Text className="text-muted">
                Select which unit this invitation is for
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Invite Method</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  id="invite-method-link"
                  label="Generate shareable link (recommended)"
                  name="inviteMethod"
                  checked={inviteMethod === 'link'}
                  onChange={() => setInviteMethod('link')}
                />
                <Form.Check
                  type="radio"
                  id="invite-method-email"
                  label="Send via email"
                  name="inviteMethod"
                  checked={inviteMethod === 'email'}
                  onChange={() => setInviteMethod('email')}
                />
              </div>
            </Form.Group>

            {inviteMethod === 'email' && (
              <Form.Group className="mb-3">
                <Form.Label>Tenant Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="tenant@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Enter the tenant's email address to send them an application link
                </Form.Text>
              </Form.Group>
            )}

            {inviteMethod === 'link' && (
              <div className="alert alert-info">
                <p className="mb-2">
                  <strong>How it works:</strong>
                </p>
                <ol className="mb-0 ps-3">
                  <li>Click "Send Invite" to generate a unique link</li>
                  <li>Copy the link from the Invites list</li>
                  <li>Share it with your prospective tenant via text, email, or any messaging app</li>
                </ol>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSendInvite}
            disabled={inviteMethod === 'email' && !inviteEmail}
          >
            <Send size={16} className="me-2" />
            Send Invite
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
