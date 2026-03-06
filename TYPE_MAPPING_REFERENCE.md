# Type Mapping Reference: Frontend ↔ API

This document provides a complete field-by-field mapping between frontend types ([App.tsx](src/App.tsx#L117-L180)) and API types ([api-types.ts](src/services/api-types.ts#L345-L443)).

---

## Unit Type Mapping

### Frontend → API Field Mapping

| Frontend Field (`App.tsx:117-129`) | API Field (`api-types.ts:345-360`) | Transformation |
|-------------------------------------|-------------------------------------|----------------|
| `name: string` | `unitNumber: string` | Direct rename |
| `address?: string` | `unitAddress?: string` | Direct rename |
| `status: 'vacant'` | `status: 'available'` | Value mapping |
| `status: 'occupied'` | `status: 'occupied'` | No change |
| `status: 'pending'` | `status: 'maintenance'` | Value mapping |
| `currentTenantId?: string` | **Not in API** | Drop field (always undefined) |
| `requirements.payStubsWeeks: number` | `requirements.payStubsWeeks?: number` | Make optional |
| `requirements.bankStatementsMonths: number` | `requirements.bankStatementsMonths?: number` | Make optional |
| **Not in frontend** | `requirements.minimumCreditScore?: number` | Ignore (future enhancement) |
| **Not in frontend** | `requirements.minimumIncome?: number` | Ignore (future enhancement) |
| **Not in frontend** | `createdAt?: string` | Ignore |
| **Not in frontend** | `updatedAt?: string` | Ignore |

### Status Enum Mapping

```typescript
// Frontend → API
'vacant' → 'available'
'occupied' → 'occupied'
'pending' → 'maintenance'

// API → Frontend
'available' → 'vacant'
'occupied' → 'occupied'
'maintenance' → 'pending'
```

---

## UnitInvite Type Mapping

### Frontend → API Field Mapping

| Frontend Field (`App.tsx:131-139`) | API Field (`api-types.ts:376-385`) | Transformation |
|-------------------------------------|-------------------------------------|----------------|
| `status: 'pending'` | `status: 'pending'` | No change |
| `status: 'completed'` | `status: 'accepted'` | Value mapping |
| `status: 'expired'` | `status: 'expired'` | No change |
| **Not in frontend** | `status: 'revoked'` | Map to 'expired' |
| `sentDate: string` | `createdAt?: string` | Use createdAt as sentDate |
| `expiresDate?: string` | `expiresAt?: string` | Direct rename |
| **Not in frontend** | `updatedAt?: string` | Ignore |

### Status Enum Mapping

```typescript
// Frontend → API
'pending' → 'pending'
'completed' → 'accepted'
'expired' → 'expired'

// API → Frontend
'pending' → 'pending'
'accepted' → 'completed'
'expired' → 'expired'
'revoked' → 'expired' (treat as expired)
```

---

## TenantApplication Type Mapping

### Frontend → API Field Mapping

| Frontend Field (`App.tsx:150-180`) | API Field (`api-types.ts:396-430`) | Transformation |
|-------------------------------------|-------------------------------------|----------------|
| `status: 'draft'` | **Not in API** | Frontend-only state |
| `status: 'submitted'` | `status: 'submitted'` | No change |
| **Not in frontend** | `status: 'under_review'` | Add to frontend? |
| `status: 'approved'` | `status: 'approved'` | No change |
| `status: 'rejected'` | `status: 'rejected'` | No change |
| `submittedDate?: string` | `submittedAt?: string` | Direct rename |
| `applicantInfo.firstName` | `firstName: string` | Flatten structure |
| `applicantInfo.lastName` | `lastName: string` | Flatten structure |
| `applicantInfo.email` | `email: string` | Flatten structure |
| `applicantInfo.phone` | `phone: string` | Flatten structure |
| **Not in frontend** | `currentAddress: string` | Missing field |
| **Not in frontend** | `employer?: string` | Missing field |
| **Not in frontend** | `position?: string` | Missing field |
| **Not in frontend** | `monthlyIncome?: number` | Missing field |
| `payStubs: UploadedDocument[]` | `payStubs?: string[]` | Structure change (URLs only in API) |
| `bankStatements: UploadedDocument[]` | `bankStatements?: string[]` | Structure change (URLs only in API) |
| `creditReport?: UploadedDocument` | `creditReport?: string` | Structure change (URL only in API) |
| **Not in frontend** | `otherDocuments?: string[]` | Missing field |
| `currentLandlord?` | `previousLandlord?` | Field name difference |
| `calculatedSavings?: number` | **Not in API** | Frontend-only calculation |
| `meetsRequirements?: boolean` | **Not in API** | Frontend-only calculation |
| **Not in frontend** | `incomeToRentRatio?: number` | Add to frontend? |
| **Not in frontend** | `reviewedAt?: string` | Missing field |
| **Not in frontend** | `createdAt?: string` | Ignore |
| **Not in frontend** | `updatedAt?: string` | Ignore |

### Major Structural Differences

#### 1. **applicantInfo Nesting**
- **Frontend**: Nested object `applicantInfo: { firstName, lastName, email, phone }`
- **API**: Flat structure with `firstName, lastName, email, phone` at root level

#### 2. **Document Storage**
- **Frontend**: Full `UploadedDocument` objects with metadata
  ```typescript
  {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadDate: string;
    tag?: 'income' | 'rent' | 'savings';
  }
  ```
- **API**: Simple string arrays (URLs only)
  ```typescript
  payStubs?: string[];
  bankStatements?: string[];
  creditReport?: string; // Single URL
  ```

#### 3. **Landlord Reference Field Name**
- **Frontend**: `currentLandlord`
- **API**: `previousLandlord`

#### 4. **Status Values**
- **Frontend**: Has 'draft' status (not submitted yet)
- **API**: No 'draft', has 'under_review' (not in frontend)

---

## Transformation Functions Required

### Unit Transformations

```typescript
// API → Frontend
function apiUnitToFrontend(apiUnit: ApiUnit): Unit {
  return {
    id: apiUnit.id,
    propertyId: apiUnit.propertyId,
    name: apiUnit.unitNumber,  // RENAME
    address: apiUnit.unitAddress,  // RENAME
    rentAmount: apiUnit.rentAmount,
    status: mapApiUnitStatusToFrontend(apiUnit.status),  // MAP
    currentTenantId: undefined,  // NOT IN API
    requirements: apiUnit.requirements ? {
      payStubsWeeks: apiUnit.requirements.payStubsWeeks || 12,  // DEFAULT
      bankStatementsMonths: apiUnit.requirements.bankStatementsMonths || 3,  // DEFAULT
    } : {
      payStubsWeeks: 12,
      bankStatementsMonths: 3,
    },
  };
}

// Frontend → API
function frontendUnitToApiCreate(unit: Omit<Unit, 'id'>): UnitCreateRequest {
  return {
    propertyId: unit.propertyId,
    unitNumber: unit.name,  // RENAME
    unitAddress: unit.address,  // RENAME
    rentAmount: unit.rentAmount,
    status: mapFrontendUnitStatusToApi(unit.status),  // MAP
    requirements: unit.requirements ? {
      payStubsWeeks: unit.requirements.payStubsWeeks,
      bankStatementsMonths: unit.requirements.bankStatementsMonths,
    } : undefined,
  };
}

function frontendUnitToApiUpdate(updates: Partial<Unit>): UnitUpdateRequest {
  const apiUpdate: UnitUpdateRequest = {};

  if (updates.name !== undefined) apiUpdate.unitNumber = updates.name;  // RENAME
  if (updates.address !== undefined) apiUpdate.unitAddress = updates.address;  // RENAME
  if (updates.rentAmount !== undefined) apiUpdate.rentAmount = updates.rentAmount;
  if (updates.status !== undefined) {
    apiUpdate.status = mapFrontendUnitStatusToApi(updates.status);  // MAP
  }
  if (updates.requirements !== undefined) {
    apiUpdate.requirements = updates.requirements;
  }

  return apiUpdate;
}

function mapApiUnitStatusToFrontend(apiStatus: 'available' | 'occupied' | 'maintenance'): 'vacant' | 'occupied' | 'pending' {
  switch (apiStatus) {
    case 'available': return 'vacant';
    case 'occupied': return 'occupied';
    case 'maintenance': return 'pending';
  }
}

function mapFrontendUnitStatusToApi(frontendStatus: 'vacant' | 'occupied' | 'pending'): 'available' | 'occupied' | 'maintenance' {
  switch (frontendStatus) {
    case 'vacant': return 'available';
    case 'occupied': return 'occupied';
    case 'pending': return 'maintenance';
  }
}
```

### UnitInvite Transformations

```typescript
// API → Frontend
function apiInviteToFrontend(apiInvite: ApiUnitInvite): UnitInvite {
  return {
    id: apiInvite.id,
    unitId: apiInvite.unitId,
    inviteToken: apiInvite.inviteToken,
    email: apiInvite.email,
    status: mapApiInviteStatusToFrontend(apiInvite.status),  // MAP
    sentDate: apiInvite.createdAt || new Date().toISOString(),  // RENAME
    expiresDate: apiInvite.expiresAt,  // RENAME
  };
}

// Frontend → API (for create)
function frontendInviteToApiCreate(
  unitId: string,
  email?: string,
  expiresDate?: string
): UnitInviteCreateRequest {
  return {
    unitId,
    email,
    expiresAt: expiresDate,  // RENAME
  };
}

function mapApiInviteStatusToFrontend(
  apiStatus: 'pending' | 'accepted' | 'expired' | 'revoked'
): 'pending' | 'completed' | 'expired' {
  switch (apiStatus) {
    case 'pending': return 'pending';
    case 'accepted': return 'completed';
    case 'expired': return 'expired';
    case 'revoked': return 'expired';  // TREAT AS EXPIRED
  }
}
```

### TenantApplication Transformations

```typescript
// API → Frontend
function apiApplicationToFrontend(apiApp: ApiTenantApplication): TenantApplication {
  return {
    id: apiApp.id,
    unitId: apiApp.unitId,
    inviteToken: apiApp.inviteToken,
    status: mapApiApplicationStatusToFrontend(apiApp.status),  // MAP
    submittedDate: apiApp.submittedAt,  // RENAME

    // FLATTEN applicantInfo
    applicantInfo: {
      firstName: apiApp.firstName,
      lastName: apiApp.lastName,
      email: apiApp.email,
      phone: apiApp.phone,
    },

    // TRANSFORM document arrays to UploadedDocument objects
    payStubs: (apiApp.payStubs || []).map(url => ({
      id: generateId(),
      fileName: extractFileName(url),
      fileUrl: url,
      fileType: 'application/pdf',  // Assume PDF
      uploadDate: apiApp.createdAt || new Date().toISOString(),
    })),

    bankStatements: (apiApp.bankStatements || []).map(url => ({
      id: generateId(),
      fileName: extractFileName(url),
      fileUrl: url,
      fileType: 'application/pdf',
      uploadDate: apiApp.createdAt || new Date().toISOString(),
    })),

    creditReport: apiApp.creditReport ? {
      id: generateId(),
      fileName: extractFileName(apiApp.creditReport),
      fileUrl: apiApp.creditReport,
      fileType: 'application/pdf',
      uploadDate: apiApp.createdAt || new Date().toISOString(),
    } : undefined,

    // RENAME previousLandlord → currentLandlord
    currentLandlord: apiApp.previousLandlord,

    // Frontend-only calculations (not from API)
    calculatedSavings: undefined,
    meetsRequirements: undefined,
  };
}

// Frontend → API (for submit)
function frontendApplicationToApiSubmit(
  app: Partial<TenantApplication>
): Partial<TenantApplicationSubmitRequest> {
  if (!app.applicantInfo) return {};

  return {
    inviteToken: app.inviteToken!,
    firstName: app.applicantInfo.firstName,  // FLATTEN
    lastName: app.applicantInfo.lastName,
    email: app.applicantInfo.email,
    phone: app.applicantInfo.phone,
    // Note: currentAddress, employer, position, monthlyIncome need to be added
    previousLandlord: app.currentLandlord,  // RENAME
    // Documents are uploaded separately via uploadApplicationDocument()
  };
}

function mapApiApplicationStatusToFrontend(
  apiStatus: 'submitted' | 'under_review' | 'approved' | 'rejected'
): 'draft' | 'submitted' | 'approved' | 'rejected' {
  // Note: 'draft' only exists in frontend, 'under_review' maps to 'submitted'
  switch (apiStatus) {
    case 'submitted': return 'submitted';
    case 'under_review': return 'submitted';  // MAP TO SUBMITTED
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
  }
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function extractFileName(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] || 'document.pdf';
}
```

---

## Critical Issues to Address

### 1. TenantApplication Structure Mismatch

**Problem**: Frontend has complex `UploadedDocument` objects, API only stores URLs.

**Solution Options**:
- **A) Use API structure** - Simplify frontend to only store URLs
  - **Pros**: Matches API, simpler
  - **Cons**: Lose file metadata (fileName, fileType, uploadDate, tag)
- **B) Keep frontend structure** - Transform URLs to objects on load
  - **Pros**: Preserve existing UI/UX
  - **Cons**: Metadata is fabricated/guessed

**Recommendation**: Option B with caveats - accept that metadata is inferred.

### 2. Missing API Fields in Frontend TenantApplication

The frontend is missing these API fields:
- `currentAddress: string` (required)
- `employer?: string`
- `position?: string`
- `monthlyIncome?: number`

**Action Required**: Add these fields to frontend `TenantApplication` type and update TenantApplication.tsx component to collect this data.

### 3. Status 'draft' vs 'under_review'

**Frontend**: Has 'draft' status (application not submitted)
**API**: No 'draft', but has 'under_review' (application submitted and being reviewed)

**Recommendation**:
- Keep 'draft' as frontend-only (before submission)
- Map API 'under_review' → Frontend 'submitted'
- Update UI to show 'under review' label when status is 'submitted'

### 4. currentLandlord vs previousLandlord

Semantic difference - are they asking about current or previous landlord?

**API says**: `previousLandlord`
**Frontend says**: `currentLandlord`

**Recommendation**: Follow API naming - update frontend to use `previousLandlord`.

---

## Summary of Required Changes

### Immediate Changes for Unit Integration

1. **Create** `src/utils/unitTransforms.ts` with:
   - `apiUnitToFrontend()`
   - `frontendUnitToApiCreate()`
   - `frontendUnitToApiUpdate()`
   - Status mapping functions

2. **Create** `src/utils/inviteTransforms.ts` with:
   - `apiInviteToFrontend()`
   - `frontendInviteToApiCreate()`
   - Status mapping functions

### Deferred Changes for Application Integration

1. **Update** `App.tsx:150-180` TenantApplication type:
   - Add `currentAddress: string`
   - Add `employer?: string`
   - Add `position?: string`
   - Add `monthlyIncome?: number`
   - Rename `currentLandlord` → `previousLandlord`

2. **Update** `src/components/TenantApplication.tsx`:
   - Add form fields for missing data
   - Update document handling for URL-based storage
   - Handle status mapping

3. **Create** `src/utils/applicationTransforms.ts`:
   - `apiApplicationToFrontend()`
   - `frontendApplicationToApiSubmit()`
   - Document URL ↔ UploadedDocument transformations

---

## Testing Checklist

### Unit Transformations
- [ ] Create unit: name → unitNumber works
- [ ] Create unit: address → unitAddress works
- [ ] Create unit: 'vacant' → 'available' mapping works
- [ ] Update unit: all field mappings work
- [ ] Load units: unitNumber → name works
- [ ] Load units: 'available' → 'vacant' mapping works
- [ ] Requirements with defaults work

### Invite Transformations
- [ ] Create invite: expiresDate → expiresAt works
- [ ] Load invites: createdAt → sentDate works
- [ ] Load invites: 'accepted' → 'completed' mapping works
- [ ] Load invites: 'revoked' → 'expired' mapping works

### Application Transformations (When Implemented)
- [ ] Flatten applicantInfo on submit
- [ ] Nest firstName/lastName/email/phone on load
- [ ] Document URLs transform to UploadedDocument objects
- [ ] currentLandlord ↔ previousLandlord works
- [ ] Status mappings work correctly
- [ ] Missing fields collected in form
