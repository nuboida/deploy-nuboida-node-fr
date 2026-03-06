# Financial Features Integration - Architecture Mismatch

## Current State (Frontend)

The frontend currently has a simplified `PropertyCost` model:

```typescript
export type PropertyCost = {
  id: string;
  name: string; // Display name (can be combined like "Electricity and Gas")
  amount: number;
  categories: string[]; // Array of category names (predefined or custom)
};
```

Properties have a `costs: PropertyCost[]` array, and there are three simple handler functions:
- `addCost(propertyId, cost)` - Adds a cost to the property
- `updateCost(propertyId, costId, updatedCost)` - Updates an existing cost
- `deleteCost(propertyId, costId)` - Deletes a cost

## API Structure

The API has a more comprehensive financial system with separate endpoints:

### 1. **Utilities/Operating Costs** (`UtilityRecord`)
- **Endpoint**: GET/PUT `/properties/:id/utilities?month=X&year=Y`
- **Structure**: Month/year-based records with predefined fields
  ```typescript
  interface UtilityRecord {
    id: string;
    propertyId: string;
    month: number;        // 1-12
    year: number;
    mortgage?: number;
    gas?: number;
    electric?: number;
    water?: number;
    heat?: number;
    insurance?: number;
    customCosts?: Array<{ name: string; amount: number }>;
  }
  ```

### 2. **Payment Info** (`PaymentInfo`)
- **Endpoint**: GET/PUT `/properties/:id/payment-info`
- **Structure**: Zelle and payment instructions
  ```typescript
  interface PaymentInfo {
    id: string;
    propertyId: string;
    zelleEmail?: string;
    zellePhone?: string;
    otherInstructions?: string;
  }
  ```

### 3. **Deposits** (`Deposit`)
- **Endpoint**: GET/PUT `/renters/:id/deposit`
- **Structure**: Per-renter deposit tracking
  ```typescript
  interface Deposit {
    id: string;
    renterId: string;
    baseAmount: number;
    currentValue: number;
    lastAdjustmentDate?: string;
    notes?: string;
  }
  ```

### 4. **Bonus Pools** (`BonusPool`)
- **Endpoint**: GET/PUT `/properties/:id/bonus-pool?month=X&year=Y`
- **Structure**: Monthly bonus distributions
  ```typescript
  interface BonusPool {
    id: string;
    propertyId: string;
    month: number;
    year: number;
    totalAmount: number;
    tenantShares: Array<{
      renterId: string;
      renterName: string;
      percentage: number;
      shareAmount: number;
    }>;
    notes?: string;
  }
  ```

### 5. **Reminders** (`Reminder`)
- **Endpoint**: GET/PUT `/properties/:id/reminders`
- **Structure**: Automated reminder settings
  ```typescript
  interface Reminder {
    id: string;
    propertyId: string;
    type: 'electric_meter' | 'invoice_due' | 'late_fee';
    daysBefore: number;
    enabled: boolean;
    customMessage?: string;
  }
  ```

## Architecture Mismatch

The current frontend `PropertyCost` model doesn't align with any single API endpoint. Instead, the API separates financial features into distinct categories with different data structures and time-based tracking.

## Recommended Refactor

To properly integrate financial features, the frontend needs to be refactored:

### Option 1: Map to Utilities API (Simplest)
Transform the current `PropertyCost` system to work with the `UtilityRecord` API:
- Keep month/year context for utility records
- Map predefined categories (mortgage, gas, electric, etc.) to UtilityRecord fields
- Map custom categories to `customCosts` array
- Update UI to show utilities by month/year

### Option 2: Multi-System Approach (Most Comprehensive)
Separate the financial features into distinct UI sections:
1. **Utilities Tab**: Month/year based operating costs (UtilityRecord API)
2. **Payment Settings**: Zelle and payment instructions (PaymentInfo API)
3. **Deposits**: Per-tenant deposit tracking (Deposit API)
4. **Bonus Pools**: Monthly bonus distribution (BonusPool API)
5. **Reminders**: Automated notifications (Reminders API)

### Option 3: Hybrid Approach (Balanced)
- Use UtilityRecord API for monthly costs (replaces current PropertyCost)
- Add separate UI sections for Payment Info, Deposits, Bonus Pools
- Defer Reminders to a later phase

## Files to Modify

1. **src/App.tsx** (lines 1265-1309)
   - Replace `addCost`, `updateCost`, `deleteCost` with utilities integration
   - Add handlers for payment info, deposits, bonus pools

2. **src/components/UtilityTracker.tsx**
   - Already exists - refactor to use UtilityRecord API

3. **src/components/PropertyForm.tsx** / **PropertyFormTabbed.tsx**
   - Update cost management sections to match API structure

4. **src/components/Dashboard.tsx**
   - Update financial display sections

## Integration Priority

Given the scope of changes required:

1. **Skip for now**: Financial features require significant UI/UX refactoring
2. **Prioritize**: Complete other API integrations (units, applications)
3. **Revisit**: After core integration is complete, refactor financial features with proper architecture

## Current Status

**Decision**: Documenting the architecture mismatch and deferring financial features integration until after units/applications are complete. This will allow us to:
- Complete core functionality first
- Design a better UX for financial features
- Avoid mixing refactoring with integration work
