# API Services Layer

Complete TypeScript service layer for connecting the Rental Invoicing App frontend to the Fastify + Appwrite backend.

## 📁 Structure

```
src/services/
├── api.ts                  # Base API client with auth & error handling
├── api-types.ts            # TypeScript type definitions matching backend
├── auth.service.ts         # Authentication (login, logout, session)
├── property.service.ts     # Property CRUD + nested resources
├── resident.service.ts     # Resident/tenant CRUD + deposits + leases
├── invoice.service.ts      # Invoice CRUD + receipts + payments
├── unit.service.ts         # Unit management + invites + applications
├── portal.service.ts       # Public portal & invoice sharing
├── upload.service.ts       # File uploads (PDFs, images)
└── index.ts               # Central export for all services
```

## 🚀 Getting Started

### 1. Configure Environment

Create or update `.env` file:

```bash
VITE_API_URL=http://localhost:3000
```

### 2. Start the Backend API

Navigate to the API directory and start the server:

```bash
cd "../Rental Invoicing API-chatgpt"
npm run dev
```

The API will run on `http://localhost:3000` by default.

### 3. Use Services in Your Components

```typescript
import { authService, propertyService, residentService } from '@/services';

// Login
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await authService.login(email, password);
    console.log('Logged in:', response.user);
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Fetch properties
const loadProperties = async () => {
  try {
    const properties = await propertyService.listProperties();
    console.log('Properties:', properties);
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
};

// Create a property
const createNewProperty = async () => {
  try {
    const property = await propertyService.createProperty({
      name: 'Sunset Apartments',
      address: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
    });
    console.log('Created property:', property);
  } catch (error) {
    console.error('Failed to create property:', error);
  }
};
```

## 📚 Service Documentation

### Authentication Service

```typescript
import { authService } from '@/services';

// Login
const { token, user } = await authService.login('landlord@example.com', 'password');

// Check if authenticated
const isLoggedIn = authService.isAuthenticated();

// Logout
authService.logout();
```

### Property Service

```typescript
import { propertyService } from '@/services';

// List all properties
const properties = await propertyService.listProperties();

// Get property by ID
const property = await propertyService.getProperty(propertyId);

// Create property
const newProperty = await propertyService.createProperty({
  name: 'Property Name',
  address: '123 Main St',
  city: 'Boston',
  state: 'MA',
  zipCode: '02101',
});

// Update property
await propertyService.updateProperty(propertyId, { name: 'Updated Name' });

// Delete property
await propertyService.deleteProperty(propertyId);

// Get residents for property
const residents = await propertyService.listPropertyResidents(propertyId);

// Payment info
const paymentInfo = await propertyService.getPaymentInfo(propertyId);
await propertyService.savePaymentInfo(propertyId, {
  zelleEmail: 'payments@example.com',
  zellePhone: '555-1234',
});

// Utilities/Operating costs
const utilities = await propertyService.getUtilities(propertyId, 11, 2025);
await propertyService.saveUtilities(propertyId, {
  month: 11,
  year: 2025,
  mortgage: 2500,
  electric: 150,
  water: 80,
});

// Bonus pool
const bonusPool = await propertyService.getBonusPool(propertyId, 11, 2025);
await propertyService.saveBonusPool(propertyId, {
  month: 11,
  year: 2025,
  totalAmount: 1000,
  tenantShares: [
    { residentId: '123', residentName: 'John Doe', percentage: 50, shareAmount: 500 },
  ],
});

// Reminders
const reminders = await propertyService.getReminders(propertyId);
await propertyService.saveReminders(propertyId, [
  { type: 'invoice_due', daysBefore: 5, enabled: true },
]);
```

### Resident Service

```typescript
import { residentService } from '@/services';

// Create resident
const resident = await residentService.createResident({
  propertyId: 'prop123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  monthlyRent: 1500,
});

// Update resident
await residentService.updateResident(residentId, { monthlyRent: 1600 });

// Delete resident
await residentService.deleteResident(residentId);

// Deposit management
const deposit = await residentService.getDeposit(residentId);
await residentService.saveDeposit(residentId, {
  baseAmount: 1500,
  currentValue: 1650,
});

// Invoices
const invoices = await residentService.getResidentInvoices(residentId);

// Leases
const leases = await residentService.getLeases(residentId);
await residentService.uploadLease(residentId, file, {
  documentType: 'Residential Lease',
  leaseType: 'Fixed Term',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  monthlyRent: 1500,
});
await residentService.deleteLease(residentId, leaseId);
```

### Invoice Service

```typescript
import { invoiceService } from '@/services';

// Create invoice
const invoice = await invoiceService.createInvoice({
  residentId: 'resident123',
  propertyId: 'prop123',
  month: 11,
  year: 2025,
  date: '2025-11-01',
  currentRent: 1500,
  lastMonthBalance: 0,
});

// Update invoice
await invoiceService.updateInvoice(invoiceId, {
  isPaid: true,
  paidDate: '2025-11-05',
});

// Mark as paid/unpaid
await invoiceService.markInvoicePaid(invoiceId);
await invoiceService.markInvoiceUnpaid(invoiceId);

// Receipts
const receipts = await invoiceService.getReceipts(invoiceId);
await invoiceService.createReceipt(invoiceId, {
  paymentDate: '2025-11-05',
  amountPaid: 1500,
  paymentMethod: 'Zelle',
  referenceNumber: 'ABC123',
});
await invoiceService.deleteReceipt(receiptId);

// Share tokens
const { shareToken } = await invoiceService.generateShareToken(invoiceId);
await invoiceService.revokeShareToken(invoiceId);
```

### Unit Service

```typescript
import { unitService } from '@/services';

// Create unit
const unit = await unitService.createUnit({
  propertyId: 'prop123',
  unitNumber: '101',
  rentAmount: 1500,
  status: 'available',
});

// Create invite
const invite = await unitService.createUnitInvite(unitId, {
  email: 'applicant@example.com',
});

// Submit application (public)
const application = await unitService.submitApplication({
  inviteToken: 'token123',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '555-5678',
  currentAddress: '456 Oak St',
  monthlyIncome: 5000,
});
```

### Portal Service (Public - No Auth)

```typescript
import { portalService } from '@/services';

// Get tenant portal data
const portalData = await portalService.getTenantPortal(portalToken);

// Get public invoice
const invoiceData = await portalService.getPublicInvoice(shareToken);
```

### Upload Service

```typescript
import { uploadService } from '@/services';

// Upload electric meter snapshot
const { url, fileId } = await uploadService.uploadElectricMeterSnapshot(file);

// Get signed download URL
const { url } = await uploadService.getSignedDownloadUrl(fileId, 'snapshots');
```

## 🔐 Authentication Flow

1. **Login**: Call `authService.login(email, password)`
2. **Token Storage**: JWT token is automatically stored in `localStorage`
3. **Auto Headers**: All subsequent API calls include `Authorization: Bearer <token>` header
4. **Logout**: Call `authService.logout()` to clear token

## ⚠️ Error Handling

All services throw `ApiError` instances with structured error information:

```typescript
import { ApiError } from '@/services';

try {
  await propertyService.createProperty(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Details:', error.details);

    if (error.status === 401) {
      // Redirect to login
    } else if (error.status === 403) {
      // Show permission error
    }
  }
}
```

## 🔗 Backend API Endpoints

All services map to these backend routes:

- `POST /auth/login` - Login
- `POST /auth/signup` - Create account
- `GET /properties` - List properties
- `POST /properties` - Create property
- `PUT /properties/:id` - Update property
- `DELETE /properties/:id` - Delete property
- `GET /properties/:id/residents` - List residents
- `GET /properties/:id/payment-info` - Get payment info
- `PUT /properties/:id/payment-info` - Save payment info
- `GET /properties/:id/utilities` - Get utilities
- `PUT /properties/:id/utilities` - Save utilities
- `GET /properties/:id/bonus-pool` - Get bonus pool
- `PUT /properties/:id/bonus-pool` - Save bonus pool
- `GET /properties/:id/reminders` - Get reminders
- `PUT /properties/:id/reminders` - Save reminders
- `POST /residents` - Create resident
- `PUT /residents/:id` - Update resident
- `DELETE /residents/:id` - Delete resident
- `GET /residents/:id/deposit` - Get deposit
- `PUT /residents/:id/deposit` - Save deposit
- `GET /residents/:id/invoices` - List invoices
- `GET /residents/:id/leases` - List leases
- `POST /residents/:id/leases` - Upload lease
- `DELETE /residents/:residentId/leases/:leaseId` - Delete lease
- `POST /invoices` - Create invoice
- `PUT /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `PUT /invoices/:id/paid` - Mark paid/unpaid
- `GET /invoices/:id/receipts` - List receipts
- `POST /invoices/:id/receipts` - Create receipt
- `DELETE /receipts/:id` - Delete receipt
- `PUT /invoices/:id/share-token` - Generate share token
- `DELETE /invoices/:id/share-token` - Revoke share token
- `GET /tenant-portal/:token` - Get portal data (public)
- `GET /invoice-share/:token` - Get invoice (public)

## 🧪 Testing the Connection

1. Start the backend API:
   ```bash
   cd "../Rental Invoicing API-chatgpt"
   npm run dev
   ```

2. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

3. In your React app, try fetching data in a component:
   ```typescript
   useEffect(() => {
     propertyService.listProperties()
       .then(props => console.log('Properties:', props))
       .catch(err => console.error('Error:', err));
   }, []);
   ```

## 📝 Notes

- All authenticated endpoints require a valid JWT token (obtained via login)
- Portal and share endpoints are public (no authentication required)
- File uploads use `multipart/form-data` encoding
- Dates should be in ISO 8601 format (`YYYY-MM-DD` or full ISO string)
- The backend uses Appwrite for data storage and authentication
