# API Integration Summary

Complete service layer connecting the Rental Invoicing App frontend to the Fastify + Appwrite backend.

## 🔗 Connection Overview

```
Frontend (React + TypeScript)
    ↓
Service Layer (src/services/)
    ↓
API Client (fetch with JWT auth)
    ↓
Backend API (Fastify on :3000)
    ↓
Appwrite Database + Storage
```

## 📦 Files Created

### Core Services

| File | Purpose | Key Methods |
|------|---------|-------------|
| **[property.service.ts](src/services/property.service.ts)** | Property management + financial features | `listProperties()`, `createProperty()`, `getPaymentInfo()`, `saveUtilities()`, `saveBonusPool()`, `getReminders()` |
| **[renter.service.ts](src/services/renter.service.ts)** | Renter CRUD + deposits + leases | `createRenter()`, `getDeposit()`, `uploadLease()`, `downloadLease()`, `getLeaseSignedUrl()` |
| **[invoice.service.ts](src/services/invoice.service.ts)** | Invoice management + receipts | `createInvoice()`, `markInvoicePaid()`, `getReceipts()`, `createReceipt()`, `generateShareToken()` |
| **[unit.service.ts](src/services/unit.service.ts)** | Unit management + applications | `listUnits()`, `createUnitInvite()`, `sendInviteEmail()`, `submitApplication()` |
| **[portal.service.ts](src/services/portal.service.ts)** | Public tenant portal + invoice sharing | `getTenantPortal()`, `getPublicInvoice()` |
| **[upload.service.ts](src/services/upload.service.ts)** | File uploads for snapshots | `uploadElectricMeterSnapshot()`, `downloadElectricMeterSnapshot()`, `getSnapshotSignedUrl()` |
| **[index.ts](src/services/index.ts)** | Central export for all services | - |

### Existing Files (Pre-existing)

| File | Purpose |
|------|---------|
| **[api.ts](src/services/api.ts)** | Base API client with auth headers & error handling |
| **[auth.service.ts](src/services/auth.service.ts)** | Login, logout, session management |
| **[api-types.ts](src/services/api-types.ts)** | TypeScript types matching backend |

## 🔐 Authentication Flow

```typescript
// 1. Login
import { authService } from '@/services';
const { token, user } = await authService.login('landlord@example.com', 'password');
// → JWT stored in localStorage automatically

// 2. All API calls include auth header
const properties = await propertyService.listProperties();
// → Request includes: Authorization: Bearer <jwt>

// 3. Logout
authService.logout();
// → Clears token from localStorage
```

## 📡 Complete API Endpoint Mapping

### Authentication
- `POST /auth/login` → `authService.login(email, password)`
- `POST /auth/logout` → `authService.logout()`

### Properties
- `GET /properties` → `propertyService.listProperties()`
- `POST /properties` → `propertyService.createProperty(data)`
- `PUT /properties/:id` → `propertyService.updateProperty(id, data)`
- `DELETE /properties/:id` → `propertyService.deleteProperty(id)`
- `GET /properties/:id/renters` → `propertyService.listPropertyRenters(id)`

### Financial Features (Properties)
- `GET /properties/:id/payment-info` → `propertyService.getPaymentInfo(id)`
- `PUT /properties/:id/payment-info` → `propertyService.savePaymentInfo(id, data)`
- `GET /properties/:id/utilities?month=X&year=Y` → `propertyService.getUtilities(id, month, year)`
- `PUT /properties/:id/utilities` → `propertyService.saveUtilities(id, data)`
- `GET /properties/:id/bonus-pool?month=X&year=Y` → `propertyService.getBonusPool(id, month, year)`
- `PUT /properties/:id/bonus-pool` → `propertyService.saveBonusPool(id, data)`
- `GET /properties/:id/reminders` → `propertyService.getReminders(id)`
- `PUT /properties/:id/reminders` → `propertyService.saveReminders(id, reminders)`

### Renters
- `POST /renters` → `renterService.createRenter(data)`
- `PUT /renters/:id` → `renterService.updateRenter(id, data)`
- `DELETE /renters/:id` → `renterService.deleteRenter(id)`
- `GET /renters/:id/deposit` → `renterService.getDeposit(id)`
- `PUT /renters/:id/deposit` → `renterService.saveDeposit(id, data)`
- `GET /renters/:id/invoices` → `renterService.getRenterInvoices(id)`
- `GET /renters/:id/leases` → `renterService.getLeases(id)`

### Leases (File Uploads)
- `POST /renters/:id/leases` → `renterService.uploadLease(renterId, propertyId, file, metadata)`
- `GET /leases/:id/download` → `renterService.downloadLease(leaseId)`
- `POST /leases/:id/signed-url` → `renterService.getLeaseSignedUrl(leaseId, ttlMs)`
- `DELETE /leases/:id` → `renterService.deleteLease(leaseId)`

### Invoices
- `POST /invoices` → `invoiceService.createInvoice(data)`
- `PUT /invoices/:id` → `invoiceService.updateInvoice(id, data)`
- `DELETE /invoices/:id` → `invoiceService.deleteInvoice(id)`
- `PUT /invoices/:id/paid` → `invoiceService.markInvoicePaid(id, paidDate)`
- `GET /invoices/:id/receipts` → `invoiceService.getReceipts(id)`
- `POST /invoices/:id/receipts` → `invoiceService.createReceipt(id, data)`
- `DELETE /receipts/:id` → `invoiceService.deleteReceipt(id)`
- `PUT /invoices/:id/share-token` → `invoiceService.generateShareToken(id)`
- `DELETE /invoices/:id/share-token` → `invoiceService.revokeShareToken(id)`

### Electric Meter Snapshots
- `POST /invoices/:id/snapshot` → `uploadService.uploadElectricMeterSnapshot(invoiceId, file)`
- `GET /invoices/:id/snapshot-download` → `uploadService.downloadElectricMeterSnapshot(invoiceId)`
- `POST /invoices/:id/snapshot-signed-url` → `uploadService.getSnapshotSignedUrl(invoiceId, ttlMs)`

### Units
- `GET /properties/:id/units` → `unitService.listUnits(propertyId)`
- `POST /units` → `unitService.createUnit(data)`
- `PUT /units/:id` → `unitService.updateUnit(id, data)`
- `DELETE /units/:id` → `unitService.deleteUnit(id)`

### Unit Invites
- `GET /units/:id/invites` → `unitService.listUnitInvites(unitId)`
- `POST /units/:id/invites` → `unitService.createUnitInvite(unitId, data)`
- `POST /unit-invites/:id/send` → `unitService.sendInviteEmail(inviteId, emailData)`
- `DELETE /unit-invites/:id` → `unitService.deleteUnitInvite(inviteId)`

### Tenant Applications (Public - No Auth)
- `GET /applications/:token` → `unitService.getApplicationByToken(token)`
- `PUT /applications/:token` → `unitService.submitApplication(token, data)`

### Portal & Sharing (Public - No Auth)
- `GET /tenant-portal/:token` → `portalService.getTenantPortal(token)`
- `GET /invoice-share/:token` → `portalService.getPublicInvoice(token)`

## 🚀 Quick Start Guide

### 1. Start the Backend

```bash
cd "../Rental Invoicing API-chatgpt"

# Configure environment (first time only)
cp .env.example .env
# Edit .env with your Appwrite credentials

# Install dependencies
npm install

# Setup Appwrite (creates collections, buckets, etc.)
npm run setup:appwrite

# Start the API server
npm run dev
# → Running on http://localhost:3000
```

### 2. Configure Frontend

The `.env` file is already configured:
```
VITE_API_URL=http://localhost:3000
```

### 3. Use in Your Components

```typescript
import { propertyService, renterService, invoiceService } from '@/services';

// Example: Fetch and display properties
const MyComponent = () => {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await propertyService.listProperties();
        setProperties(data);
      } catch (error) {
        console.error('Failed to load properties:', error);
      }
    };

    loadData();
  }, []);

  return <div>{/* Render properties */}</div>;
};
```

## 📝 Usage Examples

### Property Management

```typescript
import { propertyService } from '@/services';

// List all properties
const properties = await propertyService.listProperties();

// Create new property
const newProperty = await propertyService.createProperty({
  name: 'Sunset Apartments',
  address: '123 Main St',
  city: 'Boston',
  state: 'MA',
  zipCode: '02101',
});

// Update property
await propertyService.updateProperty(propertyId, { name: 'Updated Name' });

// Delete property
await propertyService.deleteProperty(propertyId);
```

### Renter/Tenant Management

```typescript
import { renterService } from '@/services';

// Create renter
const renter = await renterService.createRenter({
  propertyId: 'prop123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  monthlyRent: 1500,
});

// Manage deposit
const deposit = await renterService.getDeposit(renterId);
await renterService.saveDeposit(renterId, {
  baseAmount: 1500,
  currentValue: 1650,
  notes: 'Annual adjustment applied',
});

// Upload lease
await renterService.uploadLease(renterId, propertyId, pdfFile, {
  documentType: 'Residential Lease',
  leaseType: 'Fixed Term',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  monthlyRent: 1500,
});

// Download lease
const blob = await renterService.downloadLease(leaseId);
const url = URL.createObjectURL(blob);
window.open(url);
```

### Invoice Management

```typescript
import { invoiceService } from '@/services';

// Create invoice
const invoice = await invoiceService.createInvoice({
  renterId: 'renter123',
  propertyId: 'prop123',
  month: 11,
  year: 2025,
  date: '2025-11-01',
  currentRent: 1500,
  lastMonthBalance: 0,
});

// Mark as paid
await invoiceService.markInvoicePaid(invoiceId, '2025-11-05');

// Create receipt
await invoiceService.createReceipt(invoiceId, {
  paymentDate: '2025-11-05',
  amountPaid: 1500,
  paymentMethod: 'Zelle',
  referenceNumber: 'ABC123',
});

// Generate public share link
const { shareToken } = await invoiceService.generateShareToken(invoiceId);
const shareUrl = `https://yourapp.com/#/invoice/${shareToken}`;
```

### Financial Features

```typescript
import { propertyService } from '@/services';

// Payment Info
await propertyService.savePaymentInfo(propertyId, {
  zelleEmail: 'payments@example.com',
  zellePhone: '555-1234',
  otherInstructions: 'Please include unit number',
});

// Operating Costs/Utilities
await propertyService.saveUtilities(propertyId, {
  month: 11,
  year: 2025,
  mortgage: 2500,
  electric: 150,
  water: 80,
  gas: 60,
  insurance: 200,
  customCosts: [
    { name: 'HOA Fees', amount: 150 },
    { name: 'Landscaping', amount: 100 },
  ],
});

// Bonus Pool
await propertyService.saveBonusPool(propertyId, {
  month: 11,
  year: 2025,
  totalAmount: 1000,
  tenantShares: [
    { renterId: 'r1', renterName: 'John Doe', percentage: 50, shareAmount: 500 },
    { renterId: 'r2', renterName: 'Jane Smith', percentage: 50, shareAmount: 500 },
  ],
  notes: 'Year-end bonus distribution',
});

// Reminders
await propertyService.saveReminders(propertyId, [
  { type: 'invoice_due', daysBefore: 5, enabled: true },
  { type: 'electric_meter', daysBefore: 3, enabled: true },
]);
```

### Unit Management & Applications

```typescript
import { unitService } from '@/services';

// Create unit
const unit = await unitService.createUnit({
  propertyId: 'prop123',
  unitNumber: '101',
  rentAmount: 1500,
  status: 'available',
  requirements: {
    payStubsWeeks: 4,
    bankStatementsMonths: 2,
    minimumCreditScore: 650,
    minimumIncome: 4500,
  },
});

// Create invite
const { inviteToken, invite } = await unitService.createUnitInvite(unitId, {
  email: 'applicant@example.com',
});

// Send invite email
await unitService.sendInviteEmail(invite.id, {
  email: 'applicant@example.com',
  inviteBaseUrl: 'https://yourapp.com',
  subject: 'Your rental application link',
});

// Tenant submits application (public - no auth)
await unitService.submitApplication(inviteToken, {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '555-5678',
  currentAddress: '456 Oak St',
  monthlyIncome: 5000,
});
```

### Public Access (No Auth)

```typescript
import { portalService } from '@/services';

// Tenant portal (accessed via portalToken in URL)
const portalData = await portalService.getTenantPortal(portalToken);
// Returns: { renter, property, invoices, latestInvoice, receipts, paymentInfo, deposit, bonusPool }

// Public invoice view (accessed via shareToken in URL)
const invoiceData = await portalService.getPublicInvoice(shareToken);
// Returns: { invoice, renter, property }
```

## ⚠️ Error Handling

All services throw `ApiError` with structured error information:

```typescript
import { ApiError } from '@/services';

try {
  await propertyService.createProperty(data);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/#/login';
    } else if (error.status === 403) {
      // Show permission error
      alert('You do not have permission to perform this action');
    } else {
      // Show generic error
      alert(error.message);
    }
  }
}
```

## 🔧 Environment Configuration

Frontend `.env`:
```bash
VITE_API_URL=http://localhost:3000
```

Backend `.env` (in API directory):
```bash
# Appwrite Configuration
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key

# Database and Buckets
APPWRITE_DATABASE_ID=rental-db
APPWRITE_BUCKET_LEASES=leases
APPWRITE_BUCKET_APPLICATIONS=applications
APPWRITE_BUCKET_SNAPSHOTS=snapshots

# Server
PORT=3000

# SMTP (for invite emails - optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com
SMTP_INVITE_SUBJECT=Your rental application link
```

## 🧪 Testing the Connection

```bash
# 1. Start backend
cd "../Rental Invoicing API-chatgpt"
npm run dev

# 2. Test health endpoint
curl http://localhost:3000/health
# → {"status":"ok"}

# 3. In your React app console:
import { propertyService } from '@/services';
propertyService.listProperties()
  .then(console.log)
  .catch(console.error);
```

## 📚 Additional Documentation

- **[Service Layer README](src/services/README.md)** - Detailed API documentation with examples
- **[Backend API README](../Rental%20Invoicing%20API-chatgpt/README.md)** - Backend architecture and setup
- **[API Types](src/services/api-types.ts)** - Complete TypeScript type definitions

## ✅ Next Steps

1. ✅ Services created and connected to API
2. ✅ Authentication flow configured
3. ✅ Error handling implemented
4. 🔲 Replace mock data in components with real API calls
5. 🔲 Test all CRUD operations
6. 🔲 Implement loading states and error boundaries
7. 🔲 Add optimistic updates for better UX

---

**Ready to start using the API!** 🚀

Just start the backend (`npm run dev` in the API directory) and begin replacing your mock data with real API calls using the service layer.
