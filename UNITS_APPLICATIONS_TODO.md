# Units & Applications Integration Plan

## Overview

The Units & Applications system requires careful type mapping and integration planning due to significant differences between frontend and API data structures.

## Current State

### Frontend Types (App.tsx:117-180)

```typescript
export type Unit = {
  id: string;
  propertyId: string;
  name: string; // e.g., "Unit 2B", "Apt 3A"
  address?: string; // Optional override address
  rentAmount: number;
  status: 'vacant' | 'occupied' | 'pending';
  currentTenantId?: string;
  requirements?: {
    payStubsWeeks: number;
    bankStatementsMonths: number;
  };
};

export type UnitInvite = {
  id: string;
  unitId: string;
  inviteToken: string;
  email?: string;
  status: 'pending' | 'completed' | 'expired';
  sentDate: string;
  expiresDate?: string;
};

export type TenantApplication = {
  id: string;
  inviteToken: string;
  unitId: string;
  status: 'pending' | 'approved' | 'rejected';
  // ... many more fields
};
```

### API Types (api-types.ts:345-443)

```typescript
export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;  // ← Different from frontend "name"
  unitAddress?: string;  // ← Different from frontend "address"
  rentAmount: number;
  status: 'available' | 'occupied' | 'maintenance';  // ← Different values
  requirements?: {
    payStubsWeeks?: number;
    bankStatementsMonths?: number;
    minimumCreditScore?: number;  // ← Additional field
    minimumIncome?: number;  // ← Additional field
  };
}

export interface UnitInvite {
  id: string;
  unitId: string;
  inviteToken: string;
  email?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';  // ← Different values
  expiresAt?: string;  // ← Different from frontend "expiresDate"
  createdAt?: string;  // ← Additional field
  updatedAt?: string;  // ← Additional field
}
```

### Current Handlers (App.tsx:1312-1384)

All handlers currently use **local state only**:
- `addUnit()` - Creates units with Math.random() IDs
- `updateUnit()` - Updates local state array
- `deleteUnit()` - Filters local state array
- `sendInvite()` - Creates invites locally, copies to clipboard
- `deleteInvite()` - Filters local invites array
- `submitApplication()` - Creates applications locally
- `approveApplication()` - Updates local application status
- `rejectApplication()` - Updates local application status

## Type Mapping Strategy

### Decision: Maintain Frontend Types, Transform at Service Boundary

**Rationale**: The frontend types are already deeply integrated into components. Rather than refactoring all components, we'll transform data at the service boundary.

### Transformation Functions Needed

#### 1. Unit Transformations

```typescript
// API → Frontend
function apiUnitToFrontend(apiUnit: ApiUnit): Unit {
  return {
    id: apiUnit.id,
    propertyId: apiUnit.propertyId,
    name: apiUnit.unitNumber,  // unitNumber → name
    address: apiUnit.unitAddress,  // unitAddress → address
    rentAmount: apiUnit.rentAmount,
    status: mapApiStatusToFrontend(apiUnit.status),
    currentTenantId: undefined, // Not provided by API
    requirements: apiUnit.requirements ? {
      payStubsWeeks: apiUnit.requirements.payStubsWeeks || 4,
      bankStatementsMonths: apiUnit.requirements.bankStatementsMonths || 3,
      // Note: minimumCreditScore and minimumIncome are dropped
    } : undefined,
  };
}

// Frontend → API
function frontendUnitToApi(unit: Partial<Unit>): UnitCreateRequest | UnitUpdateRequest {
  return {
    propertyId: unit.propertyId,
    unitNumber: unit.name!,  // name → unitNumber
    unitAddress: unit.address,  // address → unitAddress
    rentAmount: unit.rentAmount!,
    status: mapFrontendStatusToApi(unit.status),
    requirements: unit.requirements ? {
      payStubsWeeks: unit.requirements.payStubsWeeks,
      bankStatementsMonths: unit.requirements.bankStatementsMonths,
    } : undefined,
  };
}

// Status mapping
function mapApiStatusToFrontend(apiStatus: 'available' | 'occupied' | 'maintenance'): 'vacant' | 'occupied' | 'pending' {
  switch (apiStatus) {
    case 'available': return 'vacant';
    case 'occupied': return 'occupied';
    case 'maintenance': return 'pending';
  }
}

function mapFrontendStatusToApi(frontendStatus?: 'vacant' | 'occupied' | 'pending'): 'available' | 'occupied' | 'maintenance' {
  switch (frontendStatus) {
    case 'vacant': return 'available';
    case 'occupied': return 'occupied';
    case 'pending': return 'maintenance';
    default: return 'available';
  }
}
```

#### 2. UnitInvite Transformations

```typescript
// API → Frontend
function apiInviteToFrontend(apiInvite: ApiUnitInvite): UnitInvite {
  return {
    id: apiInvite.id,
    unitId: apiInvite.unitId,
    inviteToken: apiInvite.inviteToken,
    email: apiInvite.email,
    status: mapApiInviteStatusToFrontend(apiInvite.status),
    sentDate: apiInvite.createdAt || new Date().toISOString(),
    expiresDate: apiInvite.expiresAt,  // expiresAt → expiresDate
  };
}

// Status mapping
function mapApiInviteStatusToFrontend(apiStatus: 'pending' | 'accepted' | 'expired' | 'revoked'): 'pending' | 'completed' | 'expired' {
  switch (apiStatus) {
    case 'pending': return 'pending';
    case 'accepted': return 'completed';
    case 'expired': return 'expired';
    case 'revoked': return 'expired'; // Treat revoked as expired
  }
}
```

#### 3. TenantApplication Transformations

TenantApplication types appear to be more aligned, but need verification during implementation.

## Data Loading Strategy

### 1. Units Loading (Add to loadProperties)

```typescript
const loadProperties = async () => {
  try {
    setLoading(true);

    // Existing property loading
    const fetchedProperties = await propertyService.listProperties();

    // NEW: Load units for all properties
    const unitsPromises = fetchedProperties.map(p =>
      unitService.listUnits(p.id).catch(err => {
        console.error(`Failed to load units for property ${p.id}:`, err);
        return [];
      })
    );
    const unitsArrays = await Promise.all(unitsPromises);
    const allUnits = unitsArrays.flat().map(apiUnitToFrontend);
    setUnits(allUnits);

    // Existing renter/invoice loading...
  } catch (error) {
    // ...
  }
};
```

### 2. Invites Loading Strategy

**Decision**: Load invites per-unit on demand, not globally.

**Rationale**:
- Invites are typically viewed in context of a specific unit
- Loading all invites upfront may be inefficient
- API endpoint is `/units/:id/invites` (per-unit, not global)

**Implementation**: Add invite loading to property/unit detail views.

### 3. Applications Loading Strategy

**Challenge**: The API has public endpoints for application submission, but unclear how landlords view all applications.

**Options**:
1. Load applications per-unit (if endpoint exists)
2. Load applications per-invite (if endpoint exists)
3. Keep applications as local state until API clarification

**Recommendation**: Defer applications loading until API endpoint is clarified. Focus on units and invites first.

## Integration Priority & Phases

### Phase 1: Unit CRUD (Highest Priority)

**Files to Modify**:
- [src/App.tsx:1312-1328](src/App.tsx#L1312-L1328) - Unit handlers

**Tasks**:
1. Create transformation utility file: `src/utils/unitTransforms.ts`
2. Update `addUnit()` handler:
   ```typescript
   const addUnit = async (unit: Omit<Unit, 'id'>) => {
     try {
       const apiData = frontendUnitToApi(unit);
       const apiUnit = await unitService.createUnit(apiData);
       const frontendUnit = apiUnitToFrontend(apiUnit);
       setUnits([...units, frontendUnit]);
     } catch (error) {
       console.error('Failed to create unit:', error);
       // TODO: Show error toast
     }
   };
   ```
3. Update `updateUnit()` handler similarly
4. Update `deleteUnit()` handler similarly
5. Add unit loading to `loadProperties()`

**Testing**: Verify unit creation, update, deletion with real API

### Phase 2: Invite Management

**Files to Modify**:
- [src/App.tsx:1330-1357](src/App.tsx#L1330-L1357) - Invite handlers
- Property/Unit detail components (wherever invites are displayed)

**Tasks**:
1. Add invite transformation functions to `src/utils/unitTransforms.ts`
2. Update `sendInvite()` handler:
   ```typescript
   const sendInvite = async (unitId: string, email?: string) => {
     try {
       const { inviteToken, invite } = await unitService.createUnitInvite(unitId, { email });

       // Optionally send email
       if (email) {
         await unitService.sendInviteEmail(invite.id, {
           email,
           inviteBaseUrl: window.location.origin + '/apply',
         });
       }

       const frontendInvite = apiInviteToFrontend(invite);
       setInvites([...invites, frontendInvite]);

       // Copy to clipboard
       const inviteUrl = `${window.location.origin}/apply/${inviteToken}`;
       navigator.clipboard.writeText(inviteUrl);
     } catch (error) {
       console.error('Failed to send invite:', error);
       // TODO: Show error toast
     }
   };
   ```
3. Update `deleteInvite()` handler
4. Add on-demand invite loading to unit detail views

**Testing**: Verify invite creation, email sending, deletion

### Phase 3: Application Viewing (Deferred)

**Blocker**: Need to clarify API endpoint for landlord to view applications.

**Questions for API Documentation**:
- How does landlord view all applications for their properties?
- Is there a `/properties/:id/applications` endpoint?
- Is there a `/units/:id/applications` endpoint?
- How does `approveApplication()` / `rejectApplication()` work?

**Tasks** (pending API clarification):
1. Identify correct API endpoint
2. Add application loading
3. Integrate approve/reject handlers

### Phase 4: Application Submission (Public View)

**Files to Modify**:
- [src/components/TenantApplication.tsx](src/components/TenantApplication.tsx)

**Current State**: Component likely uses demo data or local state.

**Tasks**:
1. Verify TenantApplication component implementation
2. Integrate with `unitService.getApplicationByToken()`
3. Integrate with `unitService.submitApplication()`
4. Integrate with `unitService.uploadApplicationDocument()`

**Note**: This is a public-facing view (no auth required), so it's separate from Phase 3.

## Error Handling & Loading States

### Required Additions

1. **Loading States**:
   - Add `unitsLoading` state
   - Add `invitesLoading` state
   - Show spinners/skeletons during operations

2. **Error Handling**:
   - Catch errors in all API calls
   - Show user-friendly error messages (toast notifications)
   - Graceful degradation if units fail to load

3. **Optimistic Updates** (Optional):
   - Update UI immediately, rollback on error
   - Improves perceived performance

## File Structure

```
src/
├── services/
│   ├── unit.service.ts ✅ (Already exists)
│   └── api-types.ts ✅ (Already exists)
├── utils/
│   └── unitTransforms.ts ⚠️ (Need to create)
├── components/
│   ├── TenantApplication.tsx ⚠️ (Need to verify/update)
│   └── [Property/Unit detail views] ⚠️ (Need to update)
└── App.tsx ⚠️ (Handlers need integration)
```

## Known Issues & Limitations

### 1. currentTenantId Not in API
Frontend `Unit` type has `currentTenantId?: string`, but API doesn't provide this.

**Options**:
- Remove from frontend type (breaking change for components)
- Leave as always undefined (minimal impact)
- Infer from renters/leases (complex)

**Recommendation**: Leave as always undefined for now.

### 2. Additional API Fields Not Used
API provides `minimumCreditScore` and `minimumIncome` in requirements, but frontend doesn't use them.

**Options**:
- Add to frontend type and UI (new feature)
- Ignore for now (data loss on round-trip)

**Recommendation**: Ignore for now, add as enhancement later.

### 3. Status Value Differences
Frontend uses 'vacant'/'pending', API uses 'available'/'maintenance'. Transformation works but semantics may differ.

**Recommendation**: Monitor for any business logic issues with status mappings.

### 4. Invite sentDate vs createdAt
API uses `createdAt`, frontend uses `sentDate`. These are semantically similar but not identical (an invite can be created without being sent).

**Current Mapping**: Use `createdAt` as `sentDate` fallback.

**Recommendation**: Consider adding actual sent timestamp to API or accept slight semantic difference.

## Testing Checklist

### Unit CRUD
- [ ] Create unit for property
- [ ] Update unit details
- [ ] Delete unit
- [ ] Units load on app start
- [ ] Units display correctly in UI
- [ ] Status transformations work correctly

### Invites
- [ ] Create invite with email
- [ ] Create invite without email
- [ ] Invite token copied to clipboard
- [ ] Send invite email
- [ ] Delete invite
- [ ] Invite status displays correctly

### Applications (Pending API Clarification)
- [ ] Public application submission works
- [ ] Document uploads work
- [ ] Homeowner can view applications
- [ ] Approve application
- [ ] Reject application

## Next Steps

1. **Create `src/utils/unitTransforms.ts`** with all transformation functions
2. **Integrate Unit CRUD** (Phase 1)
3. **Add unit loading** to `loadProperties()`
4. **Test unit operations** thoroughly
5. **Move to Invite Management** (Phase 2)
6. **Clarify application viewing API** before Phase 3
7. **Add comprehensive error handling** throughout

## Current Status

**Status**: Planning complete, ready for implementation.

**Recommended Start**: Phase 1 - Unit CRUD integration with transformation layer.
