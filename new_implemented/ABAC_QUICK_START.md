# ABAC OIDC Engine - Quick Start Guide

## What Was Implemented

A complete frontend integration for the ABAC (Attribute-Based Access Control) OIDC Engine API that replaces the legacy policies system. You can now:

- ✅ Create ABAC policies with OIDC authentication
- ✅ Define DSL rules for fine-grained access control
- ✅ Validate policies in real-time
- ✅ Deploy policies to the ABAC engine
- ✅ Monitor engine status and policy deployment
- ✅ Filter policies by service
- ✅ Edit, update, and delete policies

---

## Getting Started

### 1. **Navigate to ABAC Policies**
In the main PyGateway Admin UI:
1. Click "API" in the main navigation
2. Click the "🛡️ ABAC Policies" tab

### 2. **Create Your First Policy**
Click the **"➕ Create Policy"** button

**Fill in:**
1. **Basic Information**
   - Policy Name: `my-api-policy`
   - Service: Select the service to protect
   - Description: (optional)

2. **OIDC Configuration**
   - Issuer URL: `https://login.microsoftonline.com/{tenant}/v2.0` (for Azure AD)
   - Audience: `api://my-api`
   - Role Claim: `roles` (default)
   - Groups Claim: `groups` (default)

3. **Access Control Rules**
   - The form comes with two default rules:
     - "allow-admins": Allow users with "admin" role
     - "deny-all": Deny everything else
   - Edit these or add your own rules

4. **Click "Create Policy"**

### 3. **Deploy the Policy**
After creation, you can deploy immediately:
1. Find your policy in the list
2. Click **"Deploy"** button on the policy card
3. Or use **"🚀 Deploy All"** to deploy all enabled policies

### 4. **Check Engine Status**
At the top of the ABAC Policies tab, you'll see:
- 🟢 Engine is running (if connected)
- Number of loaded policies
- Uptime and cache status

---

## DSL Rule Examples

### Example 1: Role-Based Access
```
Rule ID: allow-editors
Effect: allow
Condition: "editor" IN subject.roles
Description: Allow users with editor role
```

### Example 2: Read-Only Access
```
Rule ID: reader-read-only
Effect: allow
Condition: "reader" IN subject.roles AND action.method == "GET"
Description: Readers can only use GET
```

### Example 3: Business Hours Only
```
Rule ID: business-hours
Effect: deny
Condition: environment.time_hour < 8 OR environment.time_hour > 18
Description: Only allow access during business hours
```

### Example 4: Sensitive Resources
```
Rule ID: no-delete-sensitive
Effect: deny
Condition: action.method == "DELETE" AND resource.sensitivity == "confidential"
Description: Block DELETE on sensitive resources
```

---

## Available DSL Attributes

### Subject (from JWT)
```
subject.sub                  User ID
subject.email               User email
subject.name                Display name
subject.role                Single role
subject.roles               Array of roles
subject.groups              Array of groups
subject.department          Department
subject.iss                 Issuer
```

### Action (from HTTP request)
```
action.method               GET, POST, PUT, DELETE, etc.
action.path                 Request path
```

### Resource (from service metadata)
```
resource.type               Resource type
resource.owner              Resource owner
resource.sensitivity        Sensitivity level
resource.classification     Data classification
```

### Environment (from request context)
```
environment.ip              Client IP
environment.user_agent      User-Agent header
environment.origin          Origin header
environment.timestamp       Request time
environment.time_hour       Current hour (0-23)
```

---

## Common Operations

### Edit a Policy
1. Click **"Edit"** on any policy card
2. Modify the form fields
3. Add or remove rules as needed
4. Click **"Update Policy"**
5. Policy must be re-deployed for changes to take effect

### Delete a Policy
1. Click **"Delete"** on the policy card
2. Confirm the deletion
3. Policy is unloaded from engine automatically

### Deploy to Specific Service
1. Click **"Deploy"** on a policy card
2. That policy is deployed only to its service

### Filter by Service
1. Use the **"Filter by Service"** dropdown at the top
2. Select a service to see only policies for that service
3. Change back to "All Services" to see all policies

---

## Validation & Error Handling

### DSL Validation
The modal performs live validation:
- When you click "Create/Update Policy", the DSL is validated
- Error messages appear in red highlighting what's wrong
- Examples: Invalid attribute names, syntax errors, missing required fields

### Common Errors
```
❌ "Unknown attribute 'subject.roole'. Did you mean 'subject.role'?"
   → Fix: Change 'roole' to 'role'

❌ "Invalid operator 'EQ' in expression"
   → Fix: Use '==' instead of 'EQ'

❌ "Service not found"
   → Fix: Select a valid service from the dropdown
```

### Deployment Errors
```
🔴 ABAC engine is not running
   → Start the ABAC engine container

🔴 Cannot connect to engine
   → Check network configuration and engine address

⚠️ Deployed with errors
   → Check the engine logs for specific policy errors
```

---

## Integration with Your Services

After creating and deploying an ABAC policy:

1. **Attach the ABAC Plugin** to your service:
   ```json
   {
     "name": "abac",
     "service_id": "your-service-id",
     "config": {
       "deny_on_error": true,
       "timeout_ms": 50
     },
     "enabled": true
   }
   ```

2. **Send JWTs** with your requests that include required claims:
   - `roles` - Array of user roles
   - `groups` - Array of user groups
   - Other custom claims as needed

3. **The ABAC engine will**:
   - Validate JWT signature
   - Extract claims
   - Evaluate policy rules
   - Allow or deny the request

---

## Complete Workflow

```
1. Create Service
   └─> Create ABAC Policy for that service
       └─> Validate DSL (automatic)
           └─> Deploy to Engine
               └─> Attach ABAC Plugin to Service
                   └─> Requests are now protected!
```

---

## Troubleshooting

### Problem: "Policy name already exists"
**Solution:** Use a unique policy name. Each policy must have a distinct name.

### Problem: "ABAC engine unavailable"
**Solution:** 
- Ensure ABAC engine is running
- Check engine address in backend configuration
- Verify network connectivity

### Problem: "JWT validation failed"
**Solution:**
- Ensure OIDC issuer URL is correct
- Verify audience claim matches
- Check JWT has required claims (roles, groups, etc.)

### Problem: "All requests are being denied"
**Solution:**
- Check the `deny-all` catch-all rule isn't too restrictive
- Review rule conditions and effects
- Test with a JWT that has the appropriate roles

---

## Next Steps

1. **Set up OIDC Provider**: Configure your OIDC provider (Azure AD, Auth0, etc.)
2. **Create Sample Policies**: Start with simple role-based policies
3. **Deploy to Services**: Attach ABAC plugin to your services
4. **Test with Tokens**: Use real JWTs to test policy enforcement
5. **Monitor**: Use the engine status panel to monitor deployment

---

## Need Help?

- **Full API Documentation**: See `ABAC_OIDC_ENGINE_IMPLEMENTATION.md`
- **Backend API Spec**: See `TODO/abac_oidc_engine_api.md`
- **Code Examples**: Check component files in `src/components/api/ABACPoliciesTab.jsx`

---

**Note:** The ABAC implementation replaces the old role-based policy system. Consumer policies remain available if needed but are separate from ABAC policies.
