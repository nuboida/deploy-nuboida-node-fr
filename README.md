# Rental Invoicing App

**A comprehensive property management and invoicing system for landlords with integrated tenant portals.**

Built with React, TypeScript, Bootstrap 5, and custom SCSS design system. Connects to a Fastify + Appwrite backend for complete property, tenant, and financial management.

**Original Design:** [Figma Project](https://www.figma.com/design/VJ0bos6sqh9AP9r9i2l17C/Rental-Invoicing-App)

---

## 🎯 Overview

This application provides landlords with a complete property management solution including:

- **Multi-property management** with financial tracking
- **Tenant/renter management** with lease documents and occupant tracking
- **Invoice generation and payment tracking** with receipts
- **Operating costs and utilities tracking** per property/period
- **Bonus pool allocation** for tenants
- **Deposit tracking** with annual adjustments
- **Unit inventory management** with application workflow
- **Tenant self-service portal** with read-only dashboard access
- **Public invoice sharing** via secure tokens
- **Interactive analytics** with profit/loss tracking

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set VITE_API_URL=http://localhost:3000

# Start development server
npm run dev
# → App runs on http://localhost:5173
```

### Backend Setup (Required)

The app requires the backend API to be running:

```bash
# Navigate to API directory
cd "../Rental Invoicing API-chatgpt"

# Install and setup
npm install
cp .env.example .env
# Edit .env with your Appwrite credentials

# Setup Appwrite collections
npm run setup:appwrite

# Start API server
npm run dev
# → API runs on http://localhost:3000
```

See **[API_INTEGRATION_SUMMARY.md](API_INTEGRATION_SUMMARY.md)** for complete backend setup.

---

## ✨ Key Features

### For Homeowners

#### 🏢 Property Management
- Create and manage multiple properties
- Track addresses, costs, and financial data
- View property-level analytics
- Configure payment instructions (Zelle, etc.)

#### 👥 Tenant Management
- Add renters with contact info and occupants
- Manage rent amounts, late fees, electric rates
- Generate unique portal access tokens
- Upload and manage lease documents (PDFs)

#### 💰 Invoice & Payments
- Generate monthly invoices with:
  - Rent + previous balance
  - Auto-calculated late fees
  - Electric usage charges
  - Meter snapshot uploads
- Track payment receipts
- Mark invoices paid/unpaid
- Generate public share links

#### 📊 Financial Tools
- **Utility Tracker**: Record monthly operating costs (mortgage, utilities, insurance, custom costs)
- **Bonus Pool Manager**: Allocate bonuses to tenants by percentage
- **Deposit Tracker**: Track security deposits with portfolio values
- **Profit Dashboard**: View income vs. expenses with charts

#### 🏘️ Unit Management
- Create unit inventory with requirements
- Generate application invite tokens
- Send invite emails via SMTP
- Review tenant applications with uploaded documents

### For Tenants

#### 🔐 Self-Service Portal (No Login Required)
- Access via unique portal token
- View latest invoice and payment status
- Download payment receipts
- Access lease documents
- View deposit information
- See bonus pool allocations
- Get payment instructions

#### 📝 Application Portal
- Submit applications via invite token
- Upload required documents (pay stubs, bank statements, credit reports)
- Provide landlord references
- Auto-calculated income ratios

---

## 🛠 Tech Stack

- **React 18** + **TypeScript** - Modern UI with type safety
- **Vite** - Lightning-fast dev server and build tool
- **React Router** - Client-side routing (HashRouter)
- **Bootstrap 5** - Responsive CSS framework
- **Custom SCSS** - Purple gradient design system with glass morphism
- **Recharts** - Interactive data visualizations
- **Lucide React** - Modern icon library
- **Radix UI** - Accessible component primitives (shadcn/ui)
- **Fastify + Appwrite** - Backend API (separate repository)

---

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── common/          # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── Dashboard.tsx    # Main landlord interface
│   ├── TenantPortal.tsx # Tenant self-service portal
│   ├── InvoiceView.tsx  # Invoice display & printing
│   ├── PropertyForm.tsx # Property CRUD
│   ├── RenterForm.tsx   # Renter CRUD
│   ├── HomeownerSettings.tsx    # Settings modal
│   ├── PaymentInfoForm.tsx     # Payment config
│   ├── DepositTracker.tsx      # Security deposits
│   ├── UtilityTracker.tsx      # Operating costs
│   ├── BonusPoolManager.tsx    # Bonus allocation
│   ├── UnitManagement.tsx      # Unit inventory
│   └── TenantApplication.tsx   # Public application form
├── services/            # API service layer
│   ├── api.ts          # Base API client with JWT auth
│   ├── auth.service.ts # Login/logout
│   ├── property.service.ts  # Properties API
│   ├── renter.service.ts    # Renters API
│   ├── invoice.service.ts   # Invoices API
│   ├── unit.service.ts      # Units & applications API
│   ├── portal.service.ts    # Public portal API
│   ├── upload.service.ts    # File uploads
│   └── api-types.ts    # TypeScript types
├── styles/              # SCSS design system
│   ├── _custom-variables.scss  # Bootstrap overrides
│   ├── _custom-mixins.scss     # Reusable mixins
│   ├── _custom.scss            # Component styles
│   └── index.scss              # Main entry
├── App.tsx              # Root component with routing
└── main.tsx             # React entry point
```

---

## 🗺️ Routes

```
/#/                          → LoginPage
/#/dashboard                 → Dashboard (landlord view)
  ├─ /overview              → Overview tab
  ├─ /tenants               → Tenants tab
  ├─ /units                 → Units tab
  └─ /edit-properties       → Edit Properties tab
/#/tenant-portal/:token      → TenantPortal (public, no auth)
/#/application/:inviteToken  → TenantApplication (public, no auth)
/#/invoice/:shareToken       → InvoiceView (public, no auth)
/#/design-system             → DesignSystem showcase
```

---

## 🔌 API Integration

Complete TypeScript service layer for backend communication:

```typescript
import { propertyService, renterService, invoiceService } from '@/services';

// Fetch properties
const properties = await propertyService.listProperties();

// Create renter
const renter = await renterService.createRenter({
  propertyId: 'prop123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  monthlyRent: 1500,
});

// Generate invoice
const invoice = await invoiceService.createInvoice({
  renterId: renter.id,
  propertyId: 'prop123',
  month: 11,
  year: 2025,
  date: new Date().toISOString(),
  currentRent: 1500,
});
```

### Available Services

- **authService** - Login, logout, session management
- **propertyService** - Properties, payment info, utilities, bonus pools, reminders
- **renterService** - Renters, deposits, leases (upload/download)
- **invoiceService** - Invoices, receipts, payments, share tokens
- **unitService** - Units, invites, applications, email sending
- **portalService** - Public tenant portal & invoice sharing (no auth)
- **uploadService** - File uploads (meter snapshots, documents)

**Documentation:** See [API_INTEGRATION_SUMMARY.md](API_INTEGRATION_SUMMARY.md) and [src/services/README.md](src/services/README.md)

---

## 🎨 Design System

### Purple Gradient Theme
- Primary: `#667eea` → `#764ba2`
- Glass morphism effects with backdrop blur
- Bootstrap 5 base with custom SCSS overrides

### Key Visual Elements
- **Gradient backgrounds** on headers and buttons
- **Glass cards** with transparency and blur
- **Smooth shadows** for depth
- **Hover lift effects** on interactive elements
- **Purple accent colors** throughout

### Custom Components
- StatCard - Dashboard metric cards
- TenantCard - Tenant list items
- PageHeader - Page title sections
- TabNavigation - Bootstrap tab styling
- SearchBox - Filtered search input

---

## 💻 Development

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Development Tips

1. **State Management**
   - Uses React state (useState, useEffect)
   - Consider Context API for complex state

2. **API Calls**
   - Always use service layer
   - Handle errors with try/catch
   - Show loading states

3. **Styling**
   - Prefer Bootstrap utilities
   - Use SCSS for custom components
   - Follow existing naming conventions

---

## 🏗️ Build & Deploy

### Production Build

```bash
npm run build
# → Outputs to build/ directory
```

### Deploy To

- **Netlify** - Drag & drop build folder
- **Vercel** - Connect GitHub repo
- **AWS S3 + CloudFront** - Upload build folder
- **Any static hosting** - Upload build folder

### Environment Variables

Production `.env`:
```bash
VITE_API_URL=https://api.yourapp.com
```

---

## 📚 Documentation

- **[API Integration Guide](API_INTEGRATION_SUMMARY.md)** - Complete API documentation with all endpoints
- **[Service Layer README](src/services/README.md)** - Service method documentation with examples
- **[Backend API README](../Rental%20Invoicing%20API-chatgpt/README.md)** - Backend setup and routes

---

## 📝 Current Status

- ✅ Complete UI implementation with 20+ components
- ✅ Bootstrap 5 + custom SCSS design system
- ✅ Full TypeScript service layer (7 services)
- ✅ API integration ready (40+ endpoints)
- ✅ Responsive design with mobile support
- ✅ Print-ready invoice layouts
- 🔲 Mock data in some components (needs API replacement)
- 🔲 Loading states needed
- 🔲 Error boundaries needed

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

Private project. All rights reserved.

---

**Built with ❤️ for landlords who need powerful property management tools.**