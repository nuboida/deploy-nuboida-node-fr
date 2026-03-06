import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, Download, User, Phone, Mail, Building2, DollarSign } from 'lucide-react';
import type { TenantApplication, Unit, Property } from '../../App';

interface ApplicationDetailsProps {
  applications: TenantApplication[];
  units: Unit[];
  properties: Property[];
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
}

export function ApplicationDetails({
  applications,
  units,
  properties,
  onApprove,
  onReject,
}: ApplicationDetailsProps) {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  console.log('ApplicationDetails - applicationId:', applicationId);
  console.log('ApplicationDetails - applications:', applications);
  console.log('ApplicationDetails - units:', units);
  console.log('ApplicationDetails - properties:', properties);

  const application = applications.find(app => app.id === applicationId);

  console.log('ApplicationDetails - found application:', application);

  if (!application) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Application Not Found</h4>
          <p>The application you're looking for does not exist.</p>
          <Button variant="primary" onClick={() => navigate('/homeowner/dashboard')}>
            Back to Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  const unit = units.find(u => u.id === application.unitId);
  const property = unit ? properties.find(p => p.id === unit.propertyId) : null;

  const getStatusBadge = (status: TenantApplication['status']) => {
    const config = {
      draft: { bg: 'secondary', icon: Clock, text: 'DRAFT' },
      submitted: { bg: 'primary', icon: FileText, text: 'SUBMITTED' },
      approved: { bg: 'success', icon: CheckCircle, text: 'APPROVED' },
      rejected: { bg: 'danger', icon: XCircle, text: 'REJECTED' },
    };
    const { bg, icon: Icon, text } = config[status];
    return (
      <Badge bg={bg} className="fs-6 px-3 py-2">
        <Icon size={14} className="me-1" />
        {text}
      </Badge>
    );
  };

  const handleDownloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  const handleApprove = () => {
    if (confirm('Are you sure you want to approve this application?')) {
      onApprove(application.id);
      navigate('/homeowner/dashboard');
    }
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this application?')) {
      onReject(application.id);
      navigate('/homeowner/dashboard');
    }
  };

  return (
    <Container className="py-4">
      {/* Header Section */}
      <Row className="mb-3">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/homeowner/dashboard')} className="mb-3">
            <ArrowLeft size={16} className="me-2" />
            Back to Dashboard
          </Button>
        </Col>
      </Row>

      {/* Title and Actions Section */}
      <Row className="mb-4">
        <Col lg={8}>
          <div className="d-flex align-items-start justify-content-between mb-3">
            <div>
              <h2 className="mb-2">
                {application.applicantInfo?.firstName || 'N/A'} {application.applicantInfo?.lastName || ''}
              </h2>
              <p className="text-muted mb-2">
                <Building2 size={16} className="me-1" />
                {property?.name || 'Unknown Property'} - Unit {unit?.name || 'Unknown'}
              </p>
              <p className="text-muted mb-0">
                {application.submittedDate && (
                  <>Submitted: {new Date(application.submittedDate).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <div className="text-end">
              {getStatusBadge(application.status)}
            </div>
          </div>

          {/* Action Buttons - At the top */}
          {application.status === 'submitted' && (
            <div className="d-flex gap-2 mb-4">
              <Button variant="success" size="lg" onClick={handleApprove}>
                <CheckCircle size={18} className="me-2" />
                Approve Application
              </Button>
              <Button variant="danger" size="lg" onClick={handleReject}>
                <XCircle size={18} className="me-2" />
                Reject Application
              </Button>
            </div>
          )}
        </Col>

        <Col lg={4}>
          {/* Quick Summary Card */}
          <Card className="border-primary">
            <Card.Body>
              <h6 className="mb-3">Quick Summary</h6>
              
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Monthly Rent:</span>
                <strong>${unit?.rentAmount?.toLocaleString() || 0}</strong>
              </div>

              {application.calculatedSavings !== undefined && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Calculated Savings:</span>
                  <strong>${application.calculatedSavings.toLocaleString()}</strong>
                </div>
              )}

              {application.meetsRequirements !== undefined && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Meets Requirements:</span>
                  {application.meetsRequirements ? (
                    <Badge bg="success">Yes</Badge>
                  ) : (
                    <Badge bg="danger">No</Badge>
                  )}
                </div>
              )}

              <div className="d-flex justify-content-between">
                <span className="text-muted">Documents:</span>
                <strong>
                  {(application.payStubs?.length || 0) + (application.bankStatements?.length || 0) + (application.creditReport ? 1 : 0)} files
                </strong>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabbed Content */}
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Tabs 
                defaultActiveKey="applicant" 
                id="application-tabs" 
                className="mb-4 border-0"
                variant="pills"
              >
                {/* Applicant Info Tab */}
                <Tab 
                  eventKey="applicant" 
                  title={
                    <span className="d-flex align-items-center gap-2">
                      <User size={16} />
                      <span>Applicant Info</span>
                    </span>
                  }
                >
                  <div className="pt-3">
                    <Row>
                      <Col md={6}>
                        <div className="mb-4">
                          <div className="d-flex align-items-center mb-2">
                            <User size={18} className="me-2 text-primary" />
                            <h6 className="mb-0">Full Name</h6>
                          </div>
                          <p className="ms-4 mb-0">
                            {application.applicantInfo?.firstName || 'N/A'} {application.applicantInfo?.lastName || ''}
                          </p>
                        </div>
                      </Col>

                      <Col md={6}>
                        <div className="mb-4">
                          <div className="d-flex align-items-center mb-2">
                            <Mail size={18} className="me-2 text-primary" />
                            <h6 className="mb-0">Email Address</h6>
                          </div>
                          <p className="ms-4 mb-0">
                            {application.applicantInfo?.email ? (
                              <a href={`mailto:${application.applicantInfo.email}`}>
                                {application.applicantInfo.email}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </p>
                        </div>
                      </Col>

                      <Col md={6}>
                        <div className="mb-4">
                          <div className="d-flex align-items-center mb-2">
                            <Phone size={18} className="me-2 text-primary" />
                            <h6 className="mb-0">Phone Number</h6>
                          </div>
                          <p className="ms-4 mb-0">
                            {application.applicantInfo?.phone ? (
                              <a href={`tel:${application.applicantInfo.phone}`}>
                                {application.applicantInfo.phone}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </p>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Tab>

                {/* Documents Tab */}
                <Tab 
                  eventKey="documents" 
                  title={
                    <span className="d-flex align-items-center gap-2">
                      <FileText size={16} />
                      <span>Documents</span>
                      <span className="badge bg-secondary">
                        {(application.payStubs?.length || 0) + (application.bankStatements?.length || 0) + (application.creditReport ? 1 : 0)}
                      </span>
                    </span>
                  }
                >
                  <div className="pt-3">
                    {/* Pay Stubs */}
                    {application.payStubs && application.payStubs.length > 0 && (
                      <div className="mb-4">
                        <h5 className="mb-3">
                          <FileText size={20} className="me-2" />
                          Pay Stubs ({application.payStubs.length})
                        </h5>
                        <div className="list-group">
                          {application.payStubs.map(doc => (
                            <div
                              key={doc.id}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <FileText size={16} className="me-2 text-muted" />
                                <strong>{doc.fileName}</strong>
                                <div className="text-muted small mt-1">
                                  Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                                </div>
                              </div>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleDownloadDocument(doc)}
                              >
                                <Download size={14} className="me-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bank Statements */}
                    {application.bankStatements && application.bankStatements.length > 0 && (
                      <div className="mb-4">
                        <h5 className="mb-3">
                          <DollarSign size={20} className="me-2" />
                          Bank Statements ({application.bankStatements.length})
                        </h5>
                        <div className="list-group">
                          {application.bankStatements.map(doc => (
                            <div
                              key={doc.id}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <FileText size={16} className="me-2 text-muted" />
                                <strong>{doc.fileName}</strong>
                                {doc.tag && (
                                  <Badge bg="info" className="ms-2">
                                    {doc.tag}
                                  </Badge>
                                )}
                                <div className="text-muted small mt-1">
                                  Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                                </div>
                              </div>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleDownloadDocument(doc)}
                              >
                                <Download size={14} className="me-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Credit Report */}
                    {application.creditReport && (
                      <div className="mb-4">
                        <h5 className="mb-3">
                          <FileText size={20} className="me-2" />
                          Credit Report
                        </h5>
                        <div className="list-group">
                          <div className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <FileText size={16} className="me-2 text-muted" />
                              <strong>{application.creditReport.fileName}</strong>
                              <div className="text-muted small mt-1">
                                Uploaded: {new Date(application.creditReport.uploadDate).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleDownloadDocument(application.creditReport)}
                            >
                              <Download size={14} className="me-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {(!application.payStubs || application.payStubs.length === 0) &&
                     (!application.bankStatements || application.bankStatements.length === 0) &&
                     !application.creditReport && (
                      <Alert variant="info">
                        No documents have been uploaded yet.
                      </Alert>
                    )}
                  </div>
                </Tab>

                {/* Owner Reference Tab */}
                <Tab 
                  eventKey="owner" 
                  title={
                    <span className="d-flex align-items-center gap-2">
                      <Building2 size={16} />
                      <span>Owner Reference</span>
                    </span>
                  }
                  disabled={!application.currentOwner}
                >
                  <div className="pt-3">
                    {application.currentOwner ? (
                      <div>
                        <h5 className="mb-4">Current Owner Information</h5>
                        <Row>
                          <Col md={6}>
                            <div className="mb-4">
                              <div className="d-flex align-items-center mb-2">
                                <User size={18} className="me-2 text-primary" />
                                <h6 className="mb-0">Owner Name</h6>
                              </div>
                              <p className="ms-4 mb-0">{application.currentOwner.name}</p>
                            </div>
                          </Col>

                          <Col md={6}>
                            <div className="mb-4">
                              <div className="d-flex align-items-center mb-2">
                                <Phone size={18} className="me-2 text-primary" />
                                <h6 className="mb-0">Phone Number</h6>
                              </div>
                              <p className="ms-4 mb-0">
                                <a href={`tel:${application.currentOwner.phone}`}>
                                  {application.currentOwner.phone}
                                </a>
                              </p>
                            </div>
                          </Col>

                          {application.currentOwner.email && (
                            <Col md={6}>
                              <div className="mb-4">
                                <div className="d-flex align-items-center mb-2">
                                  <Mail size={18} className="me-2 text-primary" />
                                  <h6 className="mb-0">Email Address</h6>
                                </div>
                                <p className="ms-4 mb-0">
                                  <a href={`mailto:${application.currentOwner.email}`}>
                                    {application.currentOwner.email}
                                  </a>
                                </p>
                              </div>
                            </Col>
                          )}
                        </Row>

                        <Alert variant="info" className="mt-3">
                          <strong>Note:</strong> Contact the current owner to verify rental history and tenant behavior.
                        </Alert>
                      </div>
                    ) : (
                      <Alert variant="info">
                        No current owner reference provided.
                      </Alert>
                    )}
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}