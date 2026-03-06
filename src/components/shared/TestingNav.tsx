import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import { TestTube, ChevronDown, ChevronUp } from 'lucide-react';

type DropdownProps = {
  title: string;
  items: Array<{ label: string; onClick: () => void }>;
};

function CustomDropdown({ title, items }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="position-relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`text-white small fw-semibold px-3 py-2 rounded-2 border-0 cursor-pointer transition-all d-flex align-items-center gap-2 ${
          isOpen ? 'bg-white bg-opacity-25' : 'bg-transparent'
        }`}
      >
        {title}
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className="position-absolute start-0 pt-2 pb-1" style={{ top: 'calc(100% - 4px)', zIndex: 10000 }}>
          <div className="bg-white rounded-3 shadow border border-light overflow-hidden" style={{ minWidth: '220px' }}>
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-100 text-start px-4 py-2 small border-0 bg-white cursor-pointer text-dark fw-medium transition-all ${
                  index < items.length - 1 ? 'border-bottom border-light' : ''
                }`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#334155';
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TestingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tenants = [
    { id: 'tenant-1', name: 'Marcus Thompson', portalToken: 'tenant-1-portal', invoiceToken: 'share-inv-1-11' },
    { id: 'tenant-2', name: 'Sarah Chen', portalToken: 'tenant-2-portal', invoiceToken: 'share-inv-2-11' },
    { id: 'tenant-3', name: 'James Rodriguez', portalToken: 'tenant-3-portal', invoiceToken: 'share-inv-3-11' },
    { id: 'tenant-4', name: 'Emily Watson', portalToken: 'tenant-4-portal', invoiceToken: 'share-inv-4-11' },
    { id: 'tenant-5', name: 'Michael Chang', portalToken: 'tenant-5-portal', invoiceToken: 'share-inv-5-11' },
    { id: 'tenant-6', name: 'Jessica Martinez', portalToken: 'tenant-6-portal', invoiceToken: 'share-inv-6-11' },
    { id: 'tenant-7', name: 'David Kim', portalToken: 'tenant-7-portal', invoiceToken: 'share-inv-7-11' },
    { id: 'tenant-8', name: 'Ashley Johnson', portalToken: 'tenant-8-portal', invoiceToken: 'share-inv-8-11' },
    { id: 'tenant-9', name: 'Robert Davis', portalToken: 'tenant-9-portal', invoiceToken: 'share-inv-9-11' },
  ];

  const applications = [
    { token: 'demo-apply-123', unit: '3A - Sunset Manor (Demo)' }
  ];

  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        className="position-fixed top-0 start-0 end-0 btn-gradient px-4 py-2 cursor-pointer d-flex align-items-center justify-content-center gap-2 shadow"
        style={{ zIndex: 9999 }}
      >
        <TestTube size={16} color="white" />
        <span className="text-white small fw-semibold">
          TESTING NAV (Click to expand)
        </span>
        <ChevronDown size={16} color="white" />
      </div>
    );
  }

  return (
    <div className="position-sticky top-0" style={{ zIndex: 9999 }}>
      <div className="bg-gradient-primary shadow testing-nav-border">
        <div className="container px-4 py-3">
          <div className="d-flex align-items-center gap-3 flex-wrap justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <TestTube size={20} color="white" />
              <span className="text-white small fw-bold text-uppercase ls-1">
                Testing Navigation
              </span>
              <Badge
                bg="warning"
                text="dark"
                className="small px-2 py-1"
              >
                DEV ONLY
              </Badge>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/')}
            className={`small fw-semibold px-3 py-2 rounded-2 border-0 cursor-pointer transition-all ${
              location.pathname === '/' ? 'bg-white bg-opacity-25 text-warning' : 'bg-transparent text-white'
            }`}
          >
            🏠 Home / Dev Page
          </button>

          <button
            onClick={() => navigate('/homeowner/dashboard')}
            className={`small fw-semibold px-3 py-2 rounded-2 border-0 cursor-pointer transition-all ${
              location.pathname === '/homeowner/dashboard' ? 'bg-white bg-opacity-25 text-warning' : 'bg-transparent text-white'
            }`}
          >
            👨‍💼 Owner Dashboard
          </button>

          <button
            onClick={() => navigate('/design-system')}
            className={`small fw-semibold px-3 py-2 rounded-2 border-0 cursor-pointer transition-all ${
              location.pathname === '/design-system' ? 'bg-white bg-opacity-25 text-warning' : 'bg-transparent text-white'
            }`}
          >
            🎨 Design System
          </button>

          <CustomDropdown
            title="👤 Resident Portals"
            items={tenants.map(tenant => ({
              label: tenant.name,
              onClick: () => navigate(`/portal/${tenant.portalToken}`)
            }))}
          />

          <CustomDropdown
            title="📄 Shared Invoices"
            items={tenants.map(tenant => ({
              label: `${tenant.name} - Nov 2025`,
              onClick: () => navigate(`/share/${tenant.invoiceToken}`)
            }))}
          />

          <CustomDropdown
            title="📝 Applications"
            items={applications.map(app => ({
              label: app.unit,
              onClick: () => navigate(`/apply/${app.token}`)
            }))}
          />

              <button
                onClick={() => setIsCollapsed(true)}
                className="text-white small fw-semibold px-3 py-2 rounded-2 cursor-pointer bg-white bg-opacity-10 border-0 d-flex align-items-center gap-1 transition-all ms-2"
              >
                <ChevronUp size={14} />
                Collapse
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}