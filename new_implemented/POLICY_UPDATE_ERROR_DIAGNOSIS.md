# ABAC Policy Update Error Diagnosis

## Issue Summary
When attempting to update an existing ABAC policy (e.g., 'testremog'), the system returns:
```
Failed to save policy: ABAC policy with name 'testremog' already exists
```

This error occurs on a **PUT** request to `/api/v1/abac-policies/{policyId}`.

## Root Cause Analysis

### Frontend Flow (✅ Correct)
1. User clicks "Edit" on policy 'testremog'
2. Modal opens with policy data pre-filled:
   - `policy.id` = unique policy identifier
   - `policy.name` = 'testremog'
   - Other fields populated
3. User modifies form or just clicks Save
4. Modal calls: `api.updateAbacPolicy(policy.id, updatedFormData)`
5. Frontend sends: `PUT /api/v1/abac-policies/{policy.id}` with data containing `name: 'testremog'`

### Backend Validation (❌ Issue)
The backend is returning a **409 Conflict** error with:
```json
{
  "detail": "ABAC policy with name 'testremog' already exists",
  "error_code": "POLICY_NAME_CONFLICT"
}
```

**The Problem:** Backend validation checks if a policy with that name exists, but **does not exclude the current policy being updated** from the check.

## What's Happening
```
PUT /api/v1/abac-policies/uuid-123
Body: { name: "testremog", ... }

Backend Query (Pseudo-code):
  SELECT * FROM abac_policies WHERE name='testremog'
  
Result: Finds the same policy (uuid-123) with name 'testremog'
Error: "Policy already exists" ❌
```

## What Should Happen
```
PUT /api/v1/abac-policies/uuid-123
Body: { name: "testremog", ... }

Backend Query (Correct - what should be checked):
  SELECT * FROM abac_policies WHERE name='testremog' AND id != 'uuid-123'
  
Result: No other policy with that name
Success: Policy updated ✅
```

## Current Implementation Status

### Enhanced Logging Added ✅
To help diagnose: **Commits made to track request details**

**File 1:** `src/components/modals/ABACPolicyModal.jsx`
- Added console logs when submitting update vs create
- Shows: policyId, policyName, and full request data
- Improved error message extraction

**File 2:** `src/api/PyGatewayAPI.js`
- Added detailed request logging
- Logs: policyId, data keys, and body preview

## Next Steps to Debug

### Option 1: Test Update (Immediate)
1. ✅ Dev server is running on `http://localhost:5173/`
2. Open browser console (F12)
3. Navigate to ABAC Policies tab
4. Click Edit on 'testremog' policy
5. Change any field (e.g., description)
6. Click Save
7. **Check browser console for logs:**
   - `🔄 Updating policy: { policyId: ... }`
   - `🏗️  updateAbacPolicy - Full request body: ...`
   - Error response details

### Option 2: Check Backend Validation Logic
Need to check backend code where policy name validation happens on UPDATE:
- **Endpoint:** `PUT /api/v1/abac-policies/{policyId}`
- **Issue:** Name uniqueness check doesn't exclude current policy
- **Fix needed:** Add `AND id != policyId` to the WHERE clause

## Files Modified
1. ✅ [src/components/modals/ABACPolicyModal.jsx](src/components/modals/ABACPolicyModal.jsx#L201) - Enhanced logging
2. ✅ [src/api/PyGatewayAPI.js](src/api/PyGatewayAPI.js#L1088) - Request logging

## Environment
- React Dev Server: `http://localhost:5173/`
- Backend API: Expected at `localhost:8001`
- API Proxy: Configured in `vite.config.js` for `/api/v1/*`

## Questions for User
1. **Are you seeing different policy IDs?** Check if `policy.id` is correct
2. **Is the name actually changing?** Or keeping it the same?
3. **What fields are you modifying?** Just description or everything?
4. **What does the backend response look like?** Check Network tab in DevTools

---

**Status:** Issue identified as backend validation bug. Awaiting test run to confirm logs show correct policy ID is being sent.
