import { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, ProgressBar, Alert, Modal } from 'react-bootstrap';
import { FileText, CheckCircle, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import type { Unit, TenantApplication, UploadedDocument } from '../../App';

interface TenantApplicationProps {
  inviteToken: string;
  unit: Unit | null;
  propertyName: string;
  onSubmitApplication: (application: Omit<TenantApplication, 'id' | 'inviteToken' | 'unitId'>) => void;
}

type BankStatementsSubStep = 'upload' | 'categorize';

export function ResidentApplication({
  inviteToken,
  unit,
  propertyName,
  onSubmitApplication,
}: TenantApplicationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [submitted, setSubmitted] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [bankStatementsSubStep, setBankStatementsSubStep] = useState<BankStatementsSubStep>('upload');
  const [currentBatchFiles, setCurrentBatchFiles] = useState<UploadedDocument[]>([]);

  // Application state
  const [applicantInfo, setApplicantInfo] = useState({
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '(555) 234-5678',
  });

  const [payStubs, setPayStubs] = useState<UploadedDocument[]>([]);
  const [bankStatements, setBankStatements] = useState<UploadedDocument[]>([]);
  const [currentBatchCategories, setCurrentBatchCategories] = useState({
    income: false,
    rentPayment: false,
    savings: false,
  });
  const [coveredCategories, setCoveredCategories] = useState({
    income: false,
    rentPayment: false,
    savings: false,
  });
  const [creditReport, setCreditReport] = useState<UploadedDocument | null>(null);
  const [currentOwner, setCurrentOwner] = useState({
    name: 'Michael Anderson',
    phone: '(555) 876-5432',
    email: 'michael.anderson@rentals.com',
  });

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return `(${phoneNumber}`;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!unit) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Invalid Application Link</h4>
          <p>This application link is not valid or has expired. Please contact the property manager for assistance.</p>
        </Alert>
      </Container>
    );
  }

  const requiredPayStubsWeeks = unit.requirements?.payStubsWeeks || 12;
  const requiredBankStatementsMonths = unit.requirements?.bankStatementsMonths || 3;
  const requiredSavings = unit.rentAmount * 4;

  const handleFileUpload = async (
    files: FileList | null,
    type: 'payStubs' | 'bankStatements' | 'creditReport'
  ) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const uploadedDocs: UploadedDocument[] = [];

    for (const file of fileArray) {
      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onloadend = () => {
          const doc: UploadedDocument = {
            id: Math.random().toString(36).substr(2, 9),
            fileName: file.name,
            fileUrl: reader.result as string,
            fileType: file.type,
            uploadDate: new Date().toISOString(),
          };
          uploadedDocs.push(doc);
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    if (type === 'payStubs') {
      setPayStubs([...payStubs, ...uploadedDocs]);
    } else if (type === 'bankStatements') {
      setBankStatements([...bankStatements, ...uploadedDocs]);
      setCurrentBatchFiles([...currentBatchFiles, ...uploadedDocs]);
    } else if (type === 'creditReport' && uploadedDocs.length > 0) {
      setCreditReport(uploadedDocs[0]);
    }
  };

  const removeDocument = (type: 'payStubs' | 'bankStatements' | 'creditReport', id: string) => {
    if (type === 'payStubs') {
      setPayStubs(payStubs.filter(doc => doc.id !== id));
    } else if (type === 'bankStatements') {
      const allBankStatements = bankStatements.filter(doc => doc.id !== id);
      const currentBatch = currentBatchFiles.filter(doc => doc.id !== id);
      
      setBankStatements(allBankStatements);
      setCurrentBatchFiles(currentBatch);
    } else if (type === 'creditReport') {
      setCreditReport(null);
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      if (bankStatementsSubStep === 'upload') {
        // Must have files to proceed to categorize
        if (currentBatchFiles.length > 0) {
          setBankStatementsSubStep('categorize');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (bankStatementsSubStep === 'categorize') {
        // Must have selected at least one category
        const hasSelection = currentBatchCategories.income || currentBatchCategories.rentPayment || currentBatchCategories.savings;
        
        if (hasSelection) {
          // Update covered categories by merging
          const newCoveredCategories = {
            income: coveredCategories.income || currentBatchCategories.income,
            rentPayment: coveredCategories.rentPayment || currentBatchCategories.rentPayment,
            savings: coveredCategories.savings || currentBatchCategories.savings,
          };
          setCoveredCategories(newCoveredCategories);
          
          // Clear current batch state
          setCurrentBatchFiles([]);
          setCurrentBatchCategories({ income: false, rentPayment: false, savings: false });
          
          // Check if all categories are covered
          const allCovered = newCoveredCategories.income && newCoveredCategories.rentPayment && newCoveredCategories.savings;
          
          if (allCovered) {
            // All requirements met - move to next main step
            setBankStatementsSubStep('upload');
            setCurrentStep(currentStep + 1);
          } else {
            // Need more files - go back to upload substep
            setBankStatementsSubStep('upload');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep === 3) {
      if (bankStatementsSubStep === 'categorize') {
        // Going back from categorize to upload
        // Keep current batch files so user can modify them
        setBankStatementsSubStep('upload');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (bankStatementsSubStep === 'upload') {
        // On upload substep - can always go back if no current batch files
        const hasCurrentBatchFiles = currentBatchFiles.length > 0;
        
        if (!hasCurrentBatchFiles) {
          // No files in current batch - safe to go back to previous main step
          setCurrentStep(currentStep - 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // If there are files, don't allow back (user must remove them or continue)
      }
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    // Mark all uploaded bank statements with tags based on covered categories
    const taggedStatements = bankStatements.map(doc => ({
      ...doc,
      tag: coveredCategories.savings ? 'savings' as const : 
           coveredCategories.income ? 'income' as const : 
           'rent' as const
    }));

    onSubmitApplication({
      status: 'submitted',
      submittedDate: new Date().toISOString(),
      applicantInfo,
      payStubs,
      bankStatements: taggedStatements,
      creditReport: creditReport || undefined,
      currentOwner: {
        name: currentOwner.name,
        phone: currentOwner.phone,
        email: currentOwner.email || undefined,
      },
      calculatedSavings: coveredCategories.savings ? requiredSavings + 500 : 0,
      meetsRequirements: true,
    });
    setSubmitted(true);
  };

  const getMissingCategories = () => {
    const missing = [];
    if (!coveredCategories.income) missing.push('Proof of Income');
    if (!coveredCategories.rentPayment) missing.push('Rent Payment');
    if (!coveredCategories.savings) missing.push('Savings');
    return missing;
  };

  if (submitted) {
    return (
      <Container className="py-5">
        <Row>
          <Col lg={8} className="mx-auto">
            <Card className="text-center">
              <Card.Body className="py-5">
                <CheckCircle size={64} className="text-success mb-4" />
                <h2 className="mb-3">Application Successfully Submitted!</h2>
                <p className="text-muted mb-4">
                  Your application has been successfully submitted and will be reviewed as soon as possible!
                </p>
                <div className="bg-light p-3 rounded">
                  <p className="mb-1"><strong>Property:</strong> {propertyName}</p>
                  <p className="mb-1"><strong>Unit:</strong> {unit.number}</p>
                  <p className="mb-0"><strong>Applicant:</strong> {applicantInfo.firstName} {applicantInfo.lastName}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <Card.Body>
              <div className="text-center mb-4">
                <Info size={48} className="text-primary mb-3" />
                <h3>Welcome to Your Application</h3>
                <p className="text-muted">
                  You're applying for <strong>{unit.number}</strong> at <strong>{propertyName}</strong>
                </p>
                <h4 className="text-primary">${unit.rentAmount.toLocaleString()}/month</h4>
              </div>

              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={applicantInfo.firstName}
                        onChange={e => setApplicantInfo({ ...applicantInfo, firstName: e.target.value })}
                        placeholder="John"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={applicantInfo.lastName}
                        onChange={e => setApplicantInfo({ ...applicantInfo, lastName: e.target.value })}
                        placeholder="Doe"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={applicantInfo.email}
                        onChange={e => setApplicantInfo({ ...applicantInfo, email: e.target.value })}
                        placeholder="john.doe@email.com"
                        isInvalid={applicantInfo.email.length > 0 && !isValidEmail(applicantInfo.email)}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Please enter a valid email address
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        value={applicantInfo.phone}
                        onChange={e => setApplicantInfo({ ...applicantInfo, phone: formatPhoneNumber(e.target.value) })}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        );

      case 2:
        return (
          <Card>
            <Card.Body>
              <h3 className="mb-4">
                <FileText size={32} className="me-2 text-primary" />
                Upload Your Pay Stubs
              </h3>

              <p className="mb-4">Please upload your paystub file(s)</p>

              <Form.Group className="mb-4">
                <Form.Label>Upload Pay Stubs</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={e => handleFileUpload((e.target as HTMLInputElement).files, 'payStubs')}
                />
              </Form.Group>

              {payStubs.length > 0 && (
                <div>
                  <h6 className="mb-3">Uploaded Pay Stubs ({payStubs.length})</h6>
                  <div className="list-group">
                    {payStubs.map(doc => (
                      <div
                        key={doc.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <FileText size={16} className="me-2" />
                          {doc.fileName}
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeDocument('payStubs', doc.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        );

      case 3:
        if (bankStatementsSubStep === 'upload') {
          const missingCategories = getMissingCategories();
          const hasAnyCoveredCategories = coveredCategories.income || coveredCategories.rentPayment || coveredCategories.savings;
          const isFirstTime = !hasAnyCoveredCategories;
          
          return (
            <Card>
              <Card.Body>
                <h3 className="mb-4">
                  <FileText size={32} className="me-2 text-primary" />
                  {isFirstTime ? 'Upload Your Bank Statements' : 'Upload Additional Statements'}
                </h3>

                {hasAnyCoveredCategories && (
                  <div className="mb-3">
                    {coveredCategories.income && (
                      <div className="d-flex align-items-center mb-2">
                        <CheckCircle size={18} className="text-success me-2" />
                        <span>Proof of Income Uploaded</span>
                      </div>
                    )}
                    {coveredCategories.rentPayment && (
                      <div className="d-flex align-items-center mb-2">
                        <CheckCircle size={18} className="text-success me-2" />
                        <span>Rent Payment Uploaded</span>
                      </div>
                    )}
                    {coveredCategories.savings && (
                      <div className="d-flex align-items-center mb-2">
                        <CheckCircle size={18} className="text-success me-2" />
                        <span>Savings Uploaded</span>
                      </div>
                    )}
                  </div>
                )}

                {isFirstTime ? (
                  <>
                    <p className="mb-3">Please upload your bank statements</p>
                    <Alert variant="info">
                      <strong>Required:</strong>
                      <ul className="mb-0 mt-2">
                        <li>{requiredBankStatementsMonths} months of Proof of Income</li>
                        <li>{requiredBankStatementsMonths} months of Rent Payment</li>
                        <li>{requiredBankStatementsMonths} months of Savings (minimum ${requiredSavings.toLocaleString()})</li>
                      </ul>
                    </Alert>
                  </>
                ) : (
                  <Alert variant="info">
                    <strong>Still needed:</strong> Please upload statements covering:
                    <ul className="mb-0 mt-2">
                      {missingCategories.map((cat, idx) => (
                        <li key={idx}>{requiredBankStatementsMonths} months of {cat}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Form.Group className="mb-4">
                  <Form.Label>{isFirstTime ? 'Upload Bank Statements' : 'Upload Additional Bank Statements'}</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={e => handleFileUpload((e.target as HTMLInputElement).files, 'bankStatements')}
                  />
                </Form.Group>

                {currentBatchFiles.length > 0 && (
                  <div>
                    <h6 className="mb-3">Files to Categorize ({currentBatchFiles.length})</h6>
                    <div className="list-group">
                      {currentBatchFiles.map(doc => (
                        <div
                          key={doc.id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <FileText size={16} className="me-2" />
                            {doc.fileName}
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeDocument('bankStatements', doc.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          );
        } else if (bankStatementsSubStep === 'categorize') {
          return (
            <Card>
              <Card.Body>
                <h3 className="mb-4">
                  <FileText size={32} className="me-2 text-primary" />
                  What do these statements show?
                </h3>

                {currentBatchFiles.length > 0 && (
                  <div className="mb-4">
                    <h6 className="mb-3">Files being categorized:</h6>
                    <div className="list-group mb-4">
                      {currentBatchFiles.map(doc => (
                        <div
                          key={doc.id}
                          className="list-group-item"
                        >
                          <FileText size={16} className="me-2" />
                          {doc.fileName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mb-4">Please select what your uploaded bank statements cover:</p>

                <Card className="bg-light mb-4">
                  <Card.Body>
                    {!coveredCategories.income && (
                      <Form.Check
                        type="checkbox"
                        id="income-check"
                        label={`${requiredBankStatementsMonths} months of Proof of Income`}
                        checked={currentBatchCategories.income}
                        onChange={e => setCurrentBatchCategories({ ...currentBatchCategories, income: e.target.checked })}
                        className="mb-3"
                      />
                    )}
                    {!coveredCategories.rentPayment && (
                      <Form.Check
                        type="checkbox"
                        id="rent-check"
                        label={`${requiredBankStatementsMonths} months of Rent Payment`}
                        checked={currentBatchCategories.rentPayment}
                        onChange={e => setCurrentBatchCategories({ ...currentBatchCategories, rentPayment: e.target.checked })}
                        className="mb-3"
                      />
                    )}
                    {!coveredCategories.savings && (
                      <Form.Check
                        type="checkbox"
                        id="savings-check"
                        label={`${requiredBankStatementsMonths} months of Savings (minimum $${requiredSavings.toLocaleString()})`}
                        checked={currentBatchCategories.savings}
                        onChange={e => setCurrentBatchCategories({ ...currentBatchCategories, savings: e.target.checked })}
                      />
                    )}
                  </Card.Body>
                </Card>

                {!currentBatchCategories.income && !currentBatchCategories.rentPayment && !currentBatchCategories.savings && (
                  <Alert variant="warning">
                    Please select at least one category to continue
                  </Alert>
                )}
              </Card.Body>
            </Card>
          );
        }
        break;

      case 4:
        return (
          <Card>
            <Card.Body>
              <h3 className="mb-4">
                <FileText size={32} className="me-2 text-primary" />
                Upload Your Credit Report
              </h3>

              <p className="mb-3">
                Please upload your credit report from Credit Karma.{' '}
                <Button 
                  variant="link"
                  className="p-0 align-baseline"
                  onClick={() => setShowCreditModal(true)}
                >
                  How to get your credit report
                </Button>
              </p>

              <Form.Group className="mb-4">
                <Form.Label>Upload Credit Report</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf,image/*"
                  onChange={e => handleFileUpload((e.target as HTMLInputElement).files, 'creditReport')}
                />
              </Form.Group>

              {creditReport && (
                <Alert variant="success">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <CheckCircle size={16} className="me-2" />
                      <strong>Credit Report Uploaded:</strong> {creditReport.fileName}
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeDocument('creditReport', creditReport.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </Alert>
              )}

              <Modal show={showCreditModal} onHide={() => setShowCreditModal(false)} size="lg">
                <Modal.Header closeButton>
                  <Modal.Title>How to Get Your Credit Report from Credit Karma</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <ol className="mb-0">
                    <li className="mb-3">
                      <strong>Log in to Credit Karma</strong>
                      <p className="text-muted mb-0">Visit creditkarma.com and sign in to your account</p>
                    </li>
                    <li className="mb-3">
                      <strong>Navigate to your credit report</strong>
                      <p className="text-muted mb-0">Click on "Credit Score" or "Reports" in the main navigation</p>
                    </li>
                    <li className="mb-3">
                      <strong>Download or screenshot your report</strong>
                      <p className="text-muted mb-0">You can either download the full report as a PDF or take screenshots of all pages</p>
                    </li>
                    <li className="mb-0">
                      <strong>Upload here</strong>
                      <p className="text-muted mb-0">Come back to this page and upload your credit report file(s)</p>
                    </li>
                  </ol>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" onClick={() => setShowCreditModal(false)}>
                    Got it
                  </Button>
                </Modal.Footer>
              </Modal>
            </Card.Body>
          </Card>
        );

      case 5:
        return (
          <Card>
            <Card.Body>
              <h3 className="mb-4">Current Owner Reference</h3>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Owner Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={currentOwner.name}
                    onChange={e => setCurrentOwner({ ...currentOwner, name: e.target.value })}
                    placeholder="John Smith"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Owner Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    value={currentOwner.phone}
                    onChange={e => setCurrentOwner({ ...currentOwner, phone: formatPhoneNumber(e.target.value) })}
                    placeholder="(555) 123-4567"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Owner Email (optional)</Form.Label>
                  <Form.Control
                    type="email"
                    value={currentOwner.email}
                    onChange={e => setCurrentOwner({ ...currentOwner, email: e.target.value })}
                    placeholder="owner@email.com"
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        );

      case 6:
        return (
          <Card>
            <Card.Body>
              <h3 className="mb-4">
                <CheckCircle size={32} className="me-2 text-primary" />
                Review Your Application
              </h3>

              <Card className="mb-3">
                <Card.Header>
                  <strong>Applicant Information</strong>
                </Card.Header>
                <Card.Body>
                  <p className="mb-1">
                    <strong>Name:</strong> {applicantInfo.firstName} {applicantInfo.lastName}
                  </p>
                  <p className="mb-1">
                    <strong>Email:</strong> {applicantInfo.email}
                  </p>
                  <p className="mb-0">
                    <strong>Phone:</strong> {applicantInfo.phone}
                  </p>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>
                  <strong>Documents</strong>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Pay Stubs:</span>
                    <span>
                      {payStubs.length} file{payStubs.length !== 1 ? 's' : ''} uploaded
                      {payStubs.length >= 1 && (
                        <CheckCircle size={16} className="ms-2 text-success" />
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Bank Statements:</span>
                    <span>
                      {bankStatements.length} file{bankStatements.length !== 1 ? 's' : ''} uploaded
                      {bankStatements.length >= 1 && (
                        <CheckCircle size={16} className="ms-2 text-success" />
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Credit Report:</span>
                    <span>
                      {creditReport ? 'Uploaded' : 'Not uploaded'}
                      {creditReport && <CheckCircle size={16} className="ms-2 text-success" />}
                    </span>
                  </div>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>
                  <strong>Current Owner Reference</strong>
                </Card.Header>
                <Card.Body>
                  <p className="mb-1">
                    <strong>Name:</strong> {currentOwner.name}
                  </p>
                  <p className="mb-1">
                    <strong>Phone:</strong> {currentOwner.phone}
                  </p>
                  {currentOwner.email && (
                    <p className="mb-0">
                      <strong>Email:</strong> {currentOwner.email}
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        );

      default:
        return null;
    }
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 1:
        return applicantInfo.firstName && 
               applicantInfo.lastName && 
               applicantInfo.email && 
               isValidEmail(applicantInfo.email) &&
               applicantInfo.phone;
      case 2:
        return payStubs.length >= 1;
      case 3:
        if (bankStatementsSubStep === 'upload') {
          return currentBatchFiles.length >= 1;
        } else if (bankStatementsSubStep === 'categorize') {
          return currentBatchCategories.income || currentBatchCategories.rentPayment || currentBatchCategories.savings;
        }
        return false;
      case 4:
        return creditReport !== null;
      case 5:
        return currentOwner.name && currentOwner.phone;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const getBackButtonDisabled = () => {
    if (currentStep === 1) return true;
    
    if (currentStep === 3 && bankStatementsSubStep === 'upload') {
      const hasAnyCoveredCategories = coveredCategories.income || coveredCategories.rentPayment || coveredCategories.savings;
      const hasCurrentBatchFiles = currentBatchFiles.length > 0;
      
      // Disable back if we've already categorized some files (can't go back past bank statements)
      if (hasAnyCoveredCategories || hasCurrentBatchFiles) {
        return false;
      }
    }
    
    return false;
  };

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="h2 mb-0">Rental Application</h1>
              <span className="text-muted">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <div className="text-end">
              <small className="text-muted d-block">{unit.number}</small>
              <small className="text-muted d-block">{propertyName}</small>
            </div>
          </div>
          <ProgressBar
            now={(currentStep / totalSteps) * 100}
            label={`${Math.round((currentStep / totalSteps) * 100)}%`}
          />
        </Col>
      </Row>

      <Row>
        <Col lg={10} className="mx-auto">
          {renderStep()}

          <div className="d-flex justify-content-between mt-4">
            <Button 
              variant="outline-secondary" 
              onClick={handleBack} 
              disabled={getBackButtonDisabled()}
            >
              <ArrowLeft size={16} className="me-2" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!isStepComplete()}
              >
                Continue
                <ArrowRight size={16} className="ms-2" />
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleSubmit}
                disabled={!isStepComplete()}
              >
                <CheckCircle size={16} className="me-2" />
                Submit Application
              </Button>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
}