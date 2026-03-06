import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Form, Button, Alert, Row, Col, InputGroup, Badge, ListGroup, Card, Table } from 'react-bootstrap';
import { Info, Plus, Trash2, Copy, Send, CheckCircle, Edit2, Check, X, Home } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { copyToClipboard } from '../../utils/clipboard';
import { PageHeader } from '../common/PageHeader';
import { TabNavigation } from '../common/TabNavigation';
import BonusPoolManager from './BonusPoolManager';
import PaymentInfoForm from './PaymentInfoForm';
import type { Property, Invite, Unit, PropertyCost } from '../../App';

type PropertyFormTabbedProps = {
  property?: Property;
  invites: Invite[];
  units: Unit[];
  propertyTab?: string;
  onSubmit: (property: Omit<Property, 'id'>) => void;
  onCancel: () => void;
  onAddUnit: (unit: Omit<Unit, 'id'>) => void;
  onUpdateUnit: (id: string, unit: Partial<Unit>) => void;
  onDeleteUnit: (id: string) => void;
  onSendInvite: (unitId: string, email?: string) => void;
  onDeleteInvite: (id: string) => void;
};

const PREDEFINED_CATEGORIES = [
  'Mortgage',
  'Electric',
  'Gas',
  'Heat',
  'Water',
  'Internet',
  'Insurance',
  'Property Tax',
  'HOA',
  'Maintenance',
  'Landscaping',
];

const CHART_COLORS = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
  'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function PropertyFormTabbed({
  property,
  invites,
  units,
  propertyTab,
  onSubmit,
  onCancel,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onSendInvite,
  onDeleteInvite,
}: PropertyFormTabbedProps) {
  const navigate = useNavigate();

  type TabType = 'info' | 'costs' | 'units' | 'payment' | 'bonus';

  // Map URL parameter to internal tab value
  const getTabFromUrlParam = (param?: string): TabType => {
    if (!param) return 'info';
    switch (param) {
      case 'property-information':
        return 'info';
      case 'monthly-costs':
        return 'costs';
      case 'units':
        return 'units';
      case 'payment-info':
        return 'payment';
      case 'bonus-pool':
        return 'bonus';
      default:
        return 'info';
    }
  };

  // Map internal tab value to URL parameter
  const getUrlParamFromTab = (tab: TabType): string => {
    switch (tab) {
      case 'info':
        return 'property-information';
      case 'costs':
        return 'monthly-costs';
      case 'units':
        return 'units';
      case 'payment':
        return 'payment-info';
      case 'bonus':
        return 'bonus-pool';
    }
  };

  // Derive active tab from URL parameter
  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrlParam(propertyTab));

  // Sync activeTab with URL parameter changes
  useEffect(() => {
    setActiveTab(getTabFromUrlParam(propertyTab));
  }, [propertyTab]);

  // Handle tab change - navigate to new URL
  const handleTabChange = (newTab: TabType) => {
    const urlParam = getUrlParamFromTab(newTab);
    navigate(`/homeowner/properties/${urlParam}`);
  };

  // Property form state
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: property?.address || '',
    address2: property?.address2 || '',
    city: property?.city || '',
    state: property?.state || '',
    zipCode: property?.zipCode || '',
    residents: property?.residents || [],
    costs: property?.costs || [],
  });

  // Costs management state
  const [showCostModal, setShowCostModal] = useState(false);
  const [editingCost, setEditingCost] = useState<PropertyCost | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [costFormData, setCostFormData] = useState({
    selectedCategories: [] as string[],
    displayName: '',
    amount: 0,
  });
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<number>(0);

  // Units management state
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitFormData, setUnitFormData] = useState({
    name: '',
    address: '',
    rentAmount: '',
    status: 'vacant' as 'vacant' | 'occupied' | 'pending',
    payStubsWeeks: '12',
    bankStatementsMonths: '3',
  });

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUnitForInvite, setSelectedUnitForInvite] = useState<Unit | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const allCategories = [...PREDEFINED_CATEGORIES, ...customCategories];
  const usedCategories = formData.costs
    .filter(cost => editingCost ? cost.id !== editingCost.id : true)
    .flatMap(cost => cost.categories);
  const availableCategories = allCategories.filter(cat => !usedCategories.includes(cat));

  // Get units for this property
  const propertyUnits = property ? units.filter(u => u.propertyId === property.id) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================
  // COSTS MANAGEMENT
  // ============================================

  const openAddCostModal = () => {
    setEditingCost(null);
    setCostFormData({ selectedCategories: [], displayName: '', amount: 0 });
    setShowCustomInput(false);
    setShowCostModal(true);
  };

  const openEditCostModal = (cost: PropertyCost) => {
    setEditingCost(cost);
    setCostFormData({
      selectedCategories: cost.categories,
      displayName: cost.name,
      amount: cost.amount,
    });
    setShowCostModal(true);
  };

  const handleToggleCategory = (category: string) => {
    setCostFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category],
    }));
  };

  const handleAddCustomCategory = () => {
    if (newCustomName.trim() && !allCategories.includes(newCustomName.trim())) {
      setCustomCategories([...customCategories, newCustomName.trim()]);
      handleToggleCategory(newCustomName.trim());
      setNewCustomName('');
      setShowCustomInput(false);
    }
  };

  const handleSaveCost = () => {
    if (costFormData.selectedCategories.length === 0 || !costFormData.displayName || costFormData.amount <= 0) {
      alert('Please fill in all fields');
      return;
    }

    const newCost: PropertyCost = {
      id: editingCost?.id || Math.random().toString(36).substr(2, 9),
      name: costFormData.displayName,
      amount: costFormData.amount,
      categories: costFormData.selectedCategories,
    };

    setFormData(prev => ({
      ...prev,
      costs: editingCost
        ? prev.costs.map(c => c.id === editingCost.id ? newCost : c)
        : [...prev.costs, newCost],
    }));

    setShowCostModal(false);
  };

  const handleDeleteCost = (id: string) => {
    if (window.confirm('Are you sure you want to delete this cost?')) {
      setFormData(prev => ({
        ...prev,
        costs: prev.costs.filter(c => c.id !== id),
      }));
    }
  };

  const handleInlineAmountEdit = (id: string, currentAmount: number) => {
    setEditingAmountId(id);
    setTempAmount(currentAmount);
  };

  const handleSaveInlineAmount = (id: string) => {
    setFormData(prev => ({
      ...prev,
      costs: prev.costs.map(c => c.id === id ? { ...c, amount: tempAmount } : c),
    }));
    setEditingAmountId(null);
  };

  const getCostChartData = () => {
    return formData.costs.map(cost => ({
      name: cost.name,
      value: cost.amount,
    }));
  };

  // ============================================
  // UNITS MANAGEMENT
  // ============================================

  const handleOpenUnitModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitFormData({
        name: unit.number,
        address: unit.address || '',
        rentAmount: unit.rentAmount.toString(),
        status: unit.status,
        payStubsWeeks: unit.requirements?.payStubsWeeks.toString() || '12',
        bankStatementsMonths: unit.requirements?.bankStatementsMonths.toString() || '3',
      });
    } else {
      setEditingUnit(null);
      setUnitFormData({
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
    if (!property) return;

    const unitData = {
      propertyId: property.id,
      name: unitFormData.name,
      address: unitFormData.address || undefined,
      rentAmount: parseFloat(unitFormData.rentAmount),
      status: unitFormData.status,
      requirements: {
        payStubsWeeks: parseInt(unitFormData.payStubsWeeks),
        bankStatementsMonths: parseInt(unitFormData.bankStatementsMonths),
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

  const handleSendInviteAction = (viaEmail: boolean) => {
    if (selectedUnitForInvite) {
      onSendInvite(selectedUnitForInvite.id, viaEmail ? inviteEmail : undefined);
      setShowInviteModal(false);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/apply/${token}`;
    copyToClipboard(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
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

  return (
    <div className="bg-page">
      <PageHeader
        title={property ? 'Edit Property' : 'Add Property'}
        subtitle={property ? property.name : 'Create a new property'}
        icon={<Home size={26} color="white" />}
        onBack={onCancel}
      />

      {/* Main Content */}
      <main className="container-xl px-4 py-4">
        <div className="glass-card p-4">
          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-3 mb-4">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {property ? 'Save Changes' : 'Add Property'}
            </Button>
          </div>

          <TabNavigation
            tabs={[
              { id: 'info', label: 'Property Information' },
              { id: 'costs', label: 'Monthly Costs' },
              ...(property ? [{ id: 'units', label: 'Units' }] : []),
              ...(property ? [{ id: 'payment', label: 'Payment Info' }] : []),
              ...(property ? [{ id: 'bonus', label: 'Bonus Pool' }] : [])
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => handleTabChange(tabId as TabType)}
          />

          {activeTab === 'info' && (
            <div className="tab-content-section">
              <Form.Group className="mb-3">
                    <Form.Label>Property Name *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., Riverside Apartments"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Street Address *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="123 Main Street"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Address Line 2 (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      value={formData.address2}
                      onChange={(e) => handleChange('address2', e.target.value)}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>City *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Portland"
                          value={formData.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>State *</Form.Label>
                        <Form.Select
                          value={formData.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          required
                        >
                          <option value="">Select</option>
                          {US_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>ZIP Code *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="97214"
                          value={formData.zipCode}
                          onChange={(e) => handleChange('zipCode', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="tab-content-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Monthly Costs</h5>
              <Button variant="primary" size="sm" onClick={openAddCostModal}>
                <Plus size={16} className="me-1" />
                Add Cost
              </Button>
            </div>

            {formData.costs.length > 0 ? (
              <>
                <Table hover responsive className="mb-4">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Categories</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.costs.map(cost => (
                      <tr key={cost.id}>
                        <td>{cost.name}</td>
                        <td>
                          {cost.categories.map(cat => (
                            <Badge key={cat} bg="secondary" className="me-1">{cat}</Badge>
                          ))}
                        </td>
                        <td>
                          {editingAmountId === cost.id ? (
                            <div className="d-flex gap-2">
                              <Form.Control
                                type="number"
                                size="sm"
                                value={tempAmount}
                                onChange={e => setTempAmount(parseFloat(e.target.value))}
                                style={{ width: '100px' }}
                              />
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleSaveInlineAmount(cost.id)}
                              >
                                <Check size={14} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingAmountId(null)}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          ) : (
                            <span
                              onClick={() => handleInlineAmountEdit(cost.id, cost.amount)}
                              className="cursor-pointer"
                            >
                              ${cost.amount.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openEditCostModal(cost)}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteCost(cost.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total Monthly Costs</strong></td>
                      <td colSpan={2}>
                        <strong>${formData.costs.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </Table>

                {formData.costs.length > 0 && (
                  <div>
                    <h6 className="mb-3">Cost Distribution</h6>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={getCostChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: $${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getCostChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-5">
                <p className="text-muted mb-3">No costs added yet</p>
                <Button variant="primary" onClick={openAddCostModal}>
                  <Plus size={16} className="me-2" />
                  Add Your First Cost
                </Button>
              </div>
            )}
            </div>
          )}

          {activeTab === 'units' && property && (
            <div className="tab-content-section">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Property Units</h5>
                <Button variant="primary" size="sm" onClick={() => handleOpenUnitModal()}>
                  <Plus size={16} className="me-1" />
                  Add Unit
                </Button>
              </div>

              {propertyUnits.length > 0 ? (
                <Row>
                  {propertyUnits.map(unit => {
                    const unitInvites = getUnitInvites(unit.id);
                    
                    return (
                      <Col md={6} key={unit.id} className="mb-3">
                        <Card>
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="mb-0">Unit {unit.number}</h6>
                              {getStatusBadge(unit.status)}
                            </div>

                            {unit.address && (
                              <p className="small text-muted mb-2">{unit.address}</p>
                            )}

                            <p className="mb-2">
                              <strong>Rent:</strong> ${unit.rentAmount.toLocaleString()}/mo
                            </p>

                            <div className="small text-muted mb-3">
                              <div>Requirements:</div>
                              <div>• Pay stubs: {unit.requirements?.payStubsWeeks || 12} weeks</div>
                              <div>• Bank statements: {unit.requirements?.bankStatementsMonths || 3} months</div>
                            </div>

                            <div className="mb-3">
                              <small className="text-muted">
                                Active Invites: <Badge bg="warning">{unitInvites.filter(i => i.status === 'pending').length}</Badge>
                              </small>
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
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('Delete this unit?')) {
                                    onDeleteUnit(unit.id);
                                  }
                                }}
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
                </Row>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">No units added yet</p>
                  <Button variant="primary" onClick={() => handleOpenUnitModal()}>
                    <Plus size={16} className="me-2" />
                    Add Your First Unit
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Cost Modal */}
      <Modal show={showCostModal} onHide={() => setShowCostModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCost ? 'Edit Cost' : 'Add Cost'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Categories *</Form.Label>
            <div className="border rounded p-3 mb-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {availableCategories.map(category => (
                <Form.Check
                  key={category}
                  type="checkbox"
                  id={`category-${category}`}
                  label={category}
                  checked={costFormData.selectedCategories.includes(category)}
                  onChange={() => handleToggleCategory(category)}
                  className="mb-2"
                />
              ))}
            </div>
            
            {!showCustomInput ? (
              <Button variant="outline-secondary" size="sm" onClick={() => setShowCustomInput(true)}>
                <Plus size={14} className="me-1" />
                Add Custom Category
              </Button>
            ) : (
              <div className="d-flex gap-2">
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Custom category name"
                  value={newCustomName}
                  onChange={e => setNewCustomName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddCustomCategory()}
                />
                <Button size="sm" variant="success" onClick={handleAddCustomCategory}>
                  Add
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowCustomInput(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Display Name *</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Utilities, Mortgage Payment"
              value={costFormData.displayName}
              onChange={e => setCostFormData({ ...costFormData, displayName: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Monthly Amount *</Form.Label>
            <InputGroup>
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costFormData.amount || ''}
                onChange={e => setCostFormData({ ...costFormData, amount: parseFloat(e.target.value) || 0 })}
              />
            </InputGroup>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCostModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveCost}>
            {editingCost ? 'Save Changes' : 'Add Cost'}
          </Button>
        </Modal.Footer>
      </Modal>

          {activeTab === 'payment' && property && (
            <div className="tab-content-section">
              <PaymentInfoForm propertyId={property.id} />
            </div>
          )}

          {activeTab === 'bonus' && property && (
            <div className="tab-content-section">
              <BonusPoolManager propertyId={property.id} />
            </div>
          )}

      {/* Unit Modal */}
      <Modal show={showUnitModal} onHide={() => setShowUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingUnit ? 'Edit Unit' : 'Add Unit'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Unit Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Unit 2B, Apt 3A"
                value={unitFormData.name}
                onChange={e => setUnitFormData({ ...unitFormData, name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Unit Address (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Leave blank to use property address"
                value={unitFormData.address}
                onChange={e => setUnitFormData({ ...unitFormData, address: e.target.value })}
              />
              <Form.Text className="text-muted">
                Override property address if needed
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
                      value={unitFormData.rentAmount}
                      onChange={e => setUnitFormData({ ...unitFormData, rentAmount: e.target.value })}
                      required
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    value={unitFormData.status}
                    onChange={e => setUnitFormData({ ...unitFormData, status: e.target.value as any })}
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
                  <Form.Label>Pay Stubs (weeks)</Form.Label>
                  <Form.Control
                    type="number"
                    value={unitFormData.payStubsWeeks}
                    onChange={e => setUnitFormData({ ...unitFormData, payStubsWeeks: e.target.value })}
                    min="1"
                    max="52"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bank Statements (months)</Form.Label>
                  <Form.Control
                    type="number"
                    value={unitFormData.bankStatementsMonths}
                    onChange={e => setUnitFormData({ ...unitFormData, bankStatementsMonths: e.target.value })}
                    min="1"
                    max="12"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUnitModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveUnit}>
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
                <strong>Unit:</strong> {selectedUnitForInvite.name}<br />
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
                  Track this invite by email, or just generate a link
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button variant="outline-primary" onClick={() => handleSendInviteAction(false)}>
            <Copy size={16} className="me-2" />
            Generate Link
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSendInviteAction(true)}
            disabled={!inviteEmail}
          >
            <Send size={16} className="me-2" />
            Send Email
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}