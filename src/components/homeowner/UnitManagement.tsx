import { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form } from 'react-bootstrap';
import { Building2, Plus, Edit2, Trash2, Copy, Check, Send, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import type { Unit, Property, Invite, TenantApplication } from '../../App';

interface UnitManagementProps {
  properties: Property[];
  units: Unit[];
  invites: Invite[];
  applications: TenantApplication[];
  onAddUnit: (unit: Omit<Unit, 'id'>) => void;
  onUpdateUnit: (id: string, unit: Partial<Unit>) => void;
  onDeleteUnit: (id: string) => void;
  onSendInvite: (unitId: string, email?: string) => void;
  onDeleteInvite: (id: string) => void;
}

export function UnitManagement({
  properties,
  units,
  invites,
  applications,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onSendInvite,
  onDeleteInvite,
}: UnitManagementProps) {
  const [activeTab, setActiveTab] = useState<'units' | 'invites'>('units');
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUnitForInvite, setSelectedUnitForInvite] = useState<Unit | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Unit form state
  const [unitForm, setUnitForm] = useState({
    propertyId: '',
    name: '',
    address: '',
    rentAmount: '',
    status: 'vacant' as 'vacant' | 'occupied' | 'pending',
    payStubsWeeks: '12',
    bankStatementsMonths: '3',
  });

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');

  const handleOpenUnitModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        propertyId: unit.propertyId,
        name: unit.number,
        address: unit.address || '',
        rentAmount: unit.rentAmount.toString(),
        status: unit.status,
        payStubsWeeks: unit.requirements?.payStubsWeeks.toString() || '12',
        bankStatementsMonths: unit.requirements?.bankStatementsMonths.toString() || '3',
      });
    } else {
      setEditingUnit(null);
      setUnitForm({
        propertyId: properties[0]?.id || '',
        name: '',
        address: '',
        rentAmount: '',
        status: 'vacant',
        payStubsWeeks: '12',
        bankStatementsMonths: '3',
      });
    }
    setShowUnitModal(true);
  };

  const handleSaveUnit = () => {
    const unitData = {
      propertyId: unitForm.propertyId,
      name: unitForm.name,
      address: unitForm.address || undefined,
      rentAmount: parseFloat(unitForm.rentAmount),
      status: unitForm.status,
      requirements: {
        payStubsWeeks: parseInt(unitForm.payStubsWeeks),
        bankStatementsMonths: parseInt(unitForm.bankStatementsMonths),
      },
    };

    if (editingUnit) {
      onUpdateUnit(editingUnit.id, unitData);
    } else {
      onAddUnit(unitData);
    }

    setShowUnitModal(false);
  };

  const handleOpenInviteModal = (unit: Unit) => {
    setSelectedUnitForInvite(unit);
    setInviteEmail('');
    setShowInviteModal(true);
  };

  const handleSendInvite = (viaEmail: boolean) => {
    if (selectedUnitForInvite) {
      onSendInvite(selectedUnitForInvite.id, viaEmail ? inviteEmail : undefined);
      setShowInviteModal(false);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/apply/${token}`;
    copyToClipboard(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const getUnitApplications = (unitId: string) => {
    return applications.filter(app => app.unitId === unitId);
  };

  const getUnitInvites = (unitId: string) => {
    return invites.filter(inv => inv.unitId === unitId);
  };

  const getStatusBadge = (status: Unit['status']) => {
    const variants = {
      vacant: 'success',
      occupied: 'secondary',
      pending: 'warning',
    };
    return <Badge bg={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const getInviteStatusBadge = (status: Invite['status']) => {
    const config = {
      pending: { bg: 'warning', icon: Clock },
      completed: { bg: 'success', icon: CheckCircle },
      expired: { bg: 'danger', icon: XCircle },
    };
    const { bg, icon: Icon } = config[status];
    return (
      <Badge bg={bg}>
        <Icon size={12} className="me-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div>
            <h1 className="h2 mb-0">Unit Management</h1>
            <span className="text-muted">Manage property units and tenant applications</span>
          </div>
        </Col>
      </Row>

      {/* Tabs */}
      <Row className="mb-4">
        <Col>
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${activeTab === 'units' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('units')}
            >
              Units ({units.length})
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'invites' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('invites')}
            >
              Invites ({invites.length})
            </button>
          </div>
        </Col>
      </Row>

      {/* Units Tab */}
      {activeTab === 'units' && (
        <>
          <Row className="mb-3">
            <Col>
              <Button variant="primary" onClick={() => handleOpenUnitModal()}>
                <Plus size={16} className="me-2" />
                Add New Unit
              </Button>
            </Col>
          </Row>

          <Row>
            {units.map(unit => {
              const unitApplications = getUnitApplications(unit.id);
              const unitInvites = getUnitInvites(unit.id);
              
              return (
                <Col md={6} lg={4} key={unit.id} className="mb-4">
                  <Card>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="mb-1">{unit.number}</h5>
                          <small className="text-muted">{getPropertyName(unit.propertyId)}</small>
                        </div>
                        {getStatusBadge(unit.status)}
                      </div>

                      <div className="mb-3">
                        {unit.address && (
                          <p className="mb-1 small">
                            <strong>Address:</strong> {unit.address}
                          </p>
                        )}
                        <p className="mb-1">
                          <strong>Rent:</strong> ${unit.rentAmount.toLocaleString()}/mo
                        </p>
                      </div>

                      <div className="mb-3">
                        <small className="text-muted d-block">Application Requirements:</small>
                        <small className="d-block">
                          • Pay stubs: {unit.requirements?.payStubsWeeks || 12} weeks
                        </small>
                        <small className="d-block">
                          • Bank statements: {unit.requirements?.bankStatementsMonths || 3} months
                        </small>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">Applications:</small>
                          <Badge bg="info">{unitApplications.length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">Active Invites:</small>
                          <Badge bg="warning">
                            {unitInvites.filter(i => i.status === 'pending').length}
                          </Badge>
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleOpenInviteModal(unit)}
                          disabled={unit.status === 'occupied'}
                        >
                          <Send size={14} className="me-1" />
                          Invite
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleOpenUnitModal(unit)}
                        >
                          <Edit2 size={14} className="me-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => onDeleteUnit(unit.id)}
                          disabled={unit.status === 'occupied'}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}

            {units.length === 0 && (
              <Col>
                <Card className="text-center py-5">
                  <Card.Body>
                    <p className="text-muted mb-3">No units created yet</p>
                    <Button variant="primary" onClick={() => handleOpenUnitModal()}>
                      <Plus size={16} className="me-2" />
                      Create Your First Unit
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}

      {/* Invites Tab */}
      {activeTab === 'invites' && (
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Property</th>
                      <th>Sent To</th>
                      <th>Status</th>
                      <th>Sent Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(invite => {
                      const unit = units.find(u => u.id === invite.unitId);
                      return (
                        <tr key={invite.id}>
                          <td>{unit?.name || 'Unknown'}</td>
                          <td>{unit ? getPropertyName(unit.propertyId) : '-'}</td>
                          <td>{invite.email || <em className="text-muted">Link only</em>}</td>
                          <td>{getInviteStatusBadge(invite.status)}</td>
                          <td>{new Date(invite.sentDate).toLocaleDateString()}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleCopyInviteLink(invite.inviteToken)}
                              >
                                {copiedToken === invite.inviteToken ? (
                                  <>
                                    <CheckCircle size={14} className="me-1" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} className="me-1" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                              {invite.status === 'pending' && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => onDeleteInvite(invite.id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>

                {invites.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted">No invites sent yet</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Unit Modal */}
      <Modal show={showUnitModal} onHide={() => setShowUnitModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Property *</Form.Label>
                  <Form.Select
                    value={unitForm.propertyId}
                    onChange={e => setUnitForm({ ...unitForm, propertyId: e.target.value })}
                    required
                  >
                    <option value="">Select Property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Unit Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Unit 2B, Apt 3A"
                    value={unitForm.name}
                    onChange={e => setUnitForm({ ...unitForm, name: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Unit Address (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Leave blank to use property address"
                value={unitForm.address}
                onChange={e => setUnitForm({ ...unitForm, address: e.target.value })}
              />
              <Form.Text className="text-muted">
                Override the property address if this unit has a different address
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Monthly Rent *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      placeholder="1500"
                      value={unitForm.rentAmount}
                      onChange={e => setUnitForm({ ...unitForm, rentAmount: e.target.value })}
                      required
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    value={unitForm.status}
                    onChange={e => setUnitForm({ ...unitForm, status: e.target.value as any })}
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="pending">Pending</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h6>Application Requirements</h6>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Pay Stubs (weeks required)</Form.Label>
                  <Form.Control
                    type="number"
                    value={unitForm.payStubsWeeks}
                    onChange={e => setUnitForm({ ...unitForm, payStubsWeeks: e.target.value })}
                    min="1"
                    max="52"
                  />
                  <Form.Text className="text-muted">Default: 12 weeks</Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bank Statements (months required)</Form.Label>
                  <Form.Control
                    type="number"
                    value={unitForm.bankStatementsMonths}
                    onChange={e =>
                      setUnitForm({ ...unitForm, bankStatementsMonths: e.target.value })
                    }
                    min="1"
                    max="12"
                  />
                  <Form.Text className="text-muted">Default: 3 months</Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUnitModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveUnit}
            disabled={!unitForm.propertyId || !unitForm.name || !unitForm.rentAmount}
          >
            {editingUnit ? 'Save Changes' : 'Add Unit'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Invite Modal */}
      <Modal show={showInviteModal} onHide={() => setShowInviteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Send Application Invite</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUnitForInvite && (
            <>
              <p className="mb-3">
                <strong>Unit:</strong> {selectedUnitForInvite.name}
                <br />
                <strong>Property:</strong> {getPropertyName(selectedUnitForInvite.propertyId)}
                <br />
                <strong>Rent:</strong> ${selectedUnitForInvite.rentAmount.toLocaleString()}/mo
              </p>

              <Form.Group className="mb-3">
                <Form.Label>Applicant Email (Optional)</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="applicant@email.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
                <Form.Text className="text-muted">
                  If provided, we'll track this invite by email
                </Form.Text>
              </Form.Group>

              <div className="alert alert-info">
                <small>
                  <strong>Note:</strong> You can either send the invite to an email address or
                  simply generate a link to share manually.
                </small>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => handleSendInvite(false)}
          >
            <Copy size={16} className="me-2" />
            Generate Link Only
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSendInvite(true)}
            disabled={!inviteEmail}
          >
            <Send size={16} className="me-2" />
            Send Email Invite
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}