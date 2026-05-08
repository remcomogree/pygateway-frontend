# Frontend Policy Implementation Guide

**For Frontend Developers**  
**PyGateway Service & Consumer Policy Management API Integration**

## Overview

This document provides comprehensive guidance for frontend developers to integrate with PyGateway's policy management system. The system supports both **Service Policies** (what roles are required to access a service) and **Consumer Policies** (what roles and permissions a consumer has), enabling fine-grained access control.

## API Base URLs

- **Control Plane API:** `http://localhost:8001/api/v1`

## Architecture Overview

### Service Policies
- Define what **roles are required** to access a specific service
- Each service can have **one policy** with multiple required roles
- Format: `required_roles: ["admin", "moderator"]`

### Consumer Policies  
- Define what **role and permissions** a consumer has
- Each consumer can have **multiple policies** with different roles
- Format: `role: "admin", allowed_methods: ["GET", "POST", "PUT", "DELETE"]`

### Access Control Logic
- Consumer must have a policy where their **role** is in the service's **required_roles**
- Consumer's HTTP method must be in their policy's **allowed_methods**
- If **ANY** consumer policy satisfies both conditions, access is granted

## Service Policy APIs

### 1. Get Service Policy

**Endpoint:** `GET /api/v1/services/{service_id}/policy`

**Response:**
```json
{
  "id": "policy-uuid",
  "service_id": "service-uuid", 
  "required_roles": ["admin", "moderator"],
  "enabled": true,
  "created_at": "2025-09-12T10:00:00Z",
  "updated_at": "2025-09-12T10:00:00Z"
}
```

**Returns `null` if no policy exists.**

**Frontend Implementation:**
```typescript
interface ServicePolicy {
  id: string;
  service_id: string;
  required_roles: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

async function getServicePolicy(serviceId: string): Promise<ServicePolicy | null> {
  const response = await fetch(`/api/v1/services/${serviceId}/policy`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch service policy: ${response.statusText}`);
  }
  
  return response.json();
}
```

### 2. Create Service Policy

**Endpoint:** `POST /api/v1/services/{service_id}/policy`

**Request Body:**
```json
{
  "required_roles": ["admin", "moderator"],
  "enabled": true
}
```

**Response:** 201 Created + policy object

**Frontend Implementation:**
```typescript
interface CreateServicePolicyRequest {
  required_roles: string[];
  enabled: boolean;
}

async function createServicePolicy(
  serviceId: string, 
  policyData: CreateServicePolicyRequest
): Promise<ServicePolicy> {
  const response = await fetch(`/api/v1/services/${serviceId}/policy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(policyData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create service policy');
  }
  
  return response.json();
}
```

### 3. Update Service Policy

**Endpoint:** `PUT /api/v1/services/{service_id}/policy/{policy_id}`

**Request Body:**
```json
{
  "required_roles": ["admin", "user"],
  "enabled": false
}
```

**Frontend Implementation:**
```typescript
interface UpdateServicePolicyRequest {
  required_roles?: string[];
  enabled?: boolean;
}

async function updateServicePolicy(
  serviceId: string,
  policyId: string,
  updates: UpdateServicePolicyRequest
): Promise<ServicePolicy> {
  const response = await fetch(`/api/v1/services/${serviceId}/policy/${policyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error('Failed to update service policy');
  }
  
  return response.json();
}
```

### 4. Delete Service Policy

**Endpoint:** `DELETE /api/v1/services/{service_id}/policy/{policy_id}`

**Response:** 204 No Content

**Frontend Implementation:**
```typescript
async function deleteServicePolicy(serviceId: string, policyId: string): Promise<void> {
  const response = await fetch(`/api/v1/services/${serviceId}/policy/${policyId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete service policy');
  }
}
```

## Consumer Policy APIs

### 1. List All Consumer Policies

**Endpoint:** `GET /api/v1/consumers/{consumer_id}/policies`

**Query Parameters:**
- `offset` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100, max: 1000)

**Response:**
```json
[
  {
    "id": "policy-uuid-1",
    "consumer_id": "consumer-uuid",
    "role": "admin", 
    "allowed_methods": ["GET", "POST", "PUT", "DELETE"],
    "enabled": true,
    "created_at": "2025-09-12T10:00:00Z",
    "updated_at": "2025-09-12T10:00:00Z"
  },
  {
    "id": "policy-uuid-2",
    "consumer_id": "consumer-uuid",
    "role": "moderator",
    "allowed_methods": ["GET", "POST", "PUT"],
    "enabled": true,
    "created_at": "2025-09-12T10:05:00Z", 
    "updated_at": "2025-09-12T10:05:00Z"
  }
]
```

**Frontend Implementation:**
```typescript
interface ConsumerPolicy {
  id: string;
  consumer_id: string;
  role: string;
  allowed_methods: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

async function getConsumerPolicies(
  consumerId: string, 
  offset = 0, 
  limit = 100
): Promise<ConsumerPolicy[]> {
  const response = await fetch(
    `/api/v1/consumers/${consumerId}/policies?offset=${offset}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch consumer policies');
  }
  
  return response.json();
}
```

### 2. Create Consumer Policy

**Endpoint:** `POST /api/v1/consumers/{consumer_id}/policies`

**Request Body:**
```json
{
  "role": "admin",
  "allowed_methods": ["GET", "POST", "PUT", "DELETE"],
  "enabled": true
}
```

**Response:** 201 Created + policy object

**Frontend Implementation:**
```typescript
interface CreateConsumerPolicyRequest {
  role: string;
  allowed_methods: string[];
  enabled: boolean;
}

async function createConsumerPolicy(
  consumerId: string, 
  policyData: CreateConsumerPolicyRequest
): Promise<ConsumerPolicy> {
  const response = await fetch(`/api/v1/consumers/${consumerId}/policies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(policyData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create consumer policy');
  }
  
  return response.json();
}
```

### 3. Get Specific Consumer Policy

**Endpoint:** `GET /api/v1/consumers/{consumer_id}/policy/{policy_id}`

**Frontend Implementation:**
```typescript
async function getConsumerPolicy(
  consumerId: string, 
  policyId: string
): Promise<ConsumerPolicy> {
  const response = await fetch(`/api/v1/consumers/${consumerId}/policy/${policyId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Policy not found');
    }
    throw new Error('Failed to fetch consumer policy');
  }
  
  return response.json();
}
```

### 4. Update Consumer Policy

**Endpoint:** `PUT /api/v1/consumers/{consumer_id}/policy/{policy_id}`

**Request Body:**
```json
{
  "role": "moderator",
  "allowed_methods": ["GET", "POST"],
  "enabled": false
}
```

**Frontend Implementation:**
```typescript
interface UpdateConsumerPolicyRequest {
  role?: string;
  allowed_methods?: string[];
  enabled?: boolean;
}

async function updateConsumerPolicy(
  consumerId: string,
  policyId: string,
  updates: UpdateConsumerPolicyRequest
): Promise<ConsumerPolicy> {
  const response = await fetch(`/api/v1/consumers/${consumerId}/policy/${policyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error('Failed to update consumer policy');
  }
  
  return response.json();
}
```

### 5. Delete Consumer Policy

**Endpoint:** `DELETE /api/v1/consumers/{consumer_id}/policy/{policy_id}`

**Response:** 204 No Content

**Frontend Implementation:**
```typescript
async function deleteConsumerPolicy(
  consumerId: string, 
  policyId: string
): Promise<void> {
  const response = await fetch(`/api/v1/consumers/${consumerId}/policy/${policyId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete consumer policy');
  }
}
```

### 6. Legacy Single Policy Endpoint

**Endpoint:** `GET /api/v1/consumers/{consumer_id}/policy`

Returns the **first policy** for backward compatibility. Returns `null` if no policies exist.

**Frontend Implementation:**
```typescript
async function getConsumerPolicyLegacy(consumerId: string): Promise<ConsumerPolicy | null> {
  const response = await fetch(`/api/v1/consumers/${consumerId}/policy`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch consumer policy');
  }
  
  return response.json();
}
```

## React Component Examples

### 1. Service Policy Manager

```tsx
import React, { useState, useEffect } from 'react';

interface ServicePolicyManagerProps {
  serviceId: string;
}

const ServicePolicyManager: React.FC<ServicePolicyManagerProps> = ({ serviceId }) => {
  const [policy, setPolicy] = useState<ServicePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, [serviceId]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const data = await getServicePolicy(serviceId);
      setPolicy(data);
    } catch (error) {
      console.error('Failed to load service policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (policyData: CreateServicePolicyRequest) => {
    try {
      const newPolicy = await createServicePolicy(serviceId, policyData);
      setPolicy(newPolicy);
      setEditing(false);
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const handleUpdatePolicy = async (updates: UpdateServicePolicyRequest) => {
    if (!policy) return;
    
    try {
      const updatedPolicy = await updateServicePolicy(serviceId, policy.id, updates);
      setPolicy(updatedPolicy);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  const handleDeletePolicy = async () => {
    if (!policy) return;
    
    try {
      await deleteServicePolicy(serviceId, policy.id);
      setPolicy(null);
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  if (loading) return <div>Loading service policy...</div>;

  return (
    <div className="service-policy-manager">
      <h3>Service Access Policy</h3>
      
      {!policy ? (
        <div>
          <p>No policy configured. Service is accessible to all authenticated users.</p>
          <button onClick={() => setEditing(true)}>Create Policy</button>
        </div>
      ) : (
        <div className="policy-details">
          <div className="policy-info">
            <p><strong>Required Roles:</strong> {policy.required_roles.join(', ')}</p>
            <p><strong>Status:</strong> {policy.enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          
          <div className="policy-actions">
            <button onClick={() => setEditing(true)}>Edit</button>
            <button onClick={handleDeletePolicy} className="danger">
              Delete
            </button>
          </div>
        </div>
      )}

      {editing && (
        <ServicePolicyForm
          policy={policy}
          onSubmit={policy ? handleUpdatePolicy : handleCreatePolicy}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
};
```

### 2. Consumer Policy Manager

```tsx
interface ConsumerPolicyManagerProps {
  consumerId: string;
}

const ConsumerPolicyManager: React.FC<ConsumerPolicyManagerProps> = ({ consumerId }) => {
  const [policies, setPolicies] = useState<ConsumerPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, [consumerId]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await getConsumerPolicies(consumerId);
      setPolicies(data);
    } catch (error) {
      console.error('Failed to load consumer policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (policyData: CreateConsumerPolicyRequest) => {
    try {
      const newPolicy = await createConsumerPolicy(consumerId, policyData);
      setPolicies(prev => [...prev, newPolicy]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const handleUpdatePolicy = async (
    policyId: string, 
    updates: UpdateConsumerPolicyRequest
  ) => {
    try {
      const updatedPolicy = await updateConsumerPolicy(consumerId, policyId, updates);
      setPolicies(prev => prev.map(p => p.id === policyId ? updatedPolicy : p));
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    try {
      await deleteConsumerPolicy(consumerId, policyId);
      setPolicies(prev => prev.filter(p => p.id !== policyId));
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  if (loading) return <div>Loading consumer policies...</div>;

  return (
    <div className="consumer-policy-manager">
      <div className="header">
        <h3>Consumer Policies ({policies.length})</h3>
        <button onClick={() => setShowCreateForm(true)}>
          Add Policy
        </button>
      </div>

      {policies.length === 0 ? (
        <p>No policies configured. Consumer has no access.</p>
      ) : (
        <div className="policies-list">
          {policies.map(policy => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onUpdate={(updates) => handleUpdatePolicy(policy.id, updates)}
              onDelete={() => handleDeletePolicy(policy.id)}
            />
          ))}
        </div>
      )}

      {showCreateForm && (
        <ConsumerPolicyForm
          onSubmit={handleCreatePolicy}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};
```

### 3. Policy Card Component

```tsx
interface PolicyCardProps {
  policy: ConsumerPolicy;
  onUpdate: (updates: UpdateConsumerPolicyRequest) => void;
  onDelete: () => void;
}

const PolicyCard: React.FC<PolicyCardProps> = ({ policy, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);

  const toggleStatus = () => {
    onUpdate({ enabled: !policy.enabled });
  };

  return (
    <div className={`policy-card ${policy.enabled ? 'enabled' : 'disabled'}`}>
      <div className="policy-header">
        <div className="policy-role">
          <span className="role-badge">{policy.role}</span>
          <span className={`status-badge ${policy.enabled ? 'enabled' : 'disabled'}`}>
            {policy.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <div className="policy-actions">
          <button onClick={() => setEditing(true)}>Edit</button>
          <button onClick={toggleStatus}>
            {policy.enabled ? 'Disable' : 'Enable'}
          </button>
          <button onClick={onDelete} className="danger">Delete</button>
        </div>
      </div>

      <div className="policy-details">
        <div className="methods">
          <strong>Allowed Methods:</strong>
          <div className="method-tags">
            {policy.allowed_methods.map(method => (
              <span key={method} className="method-tag">{method}</span>
            ))}
          </div>
        </div>
        
        <div className="timestamps">
          <small>Created: {new Date(policy.created_at).toLocaleDateString()}</small>
          <small>Updated: {new Date(policy.updated_at).toLocaleDateString()}</small>
        </div>
      </div>

      {editing && (
        <PolicyEditForm
          policy={policy}
          onSubmit={(updates) => {
            onUpdate(updates);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
};
```

### 4. Policy Form Components

```tsx
interface ConsumerPolicyFormProps {
  policy?: ConsumerPolicy;
  onSubmit: (data: CreateConsumerPolicyRequest | UpdateConsumerPolicyRequest) => void;
  onCancel: () => void;
}

const ConsumerPolicyForm: React.FC<ConsumerPolicyFormProps> = ({ 
  policy, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    role: policy?.role || '',
    allowed_methods: policy?.allowed_methods || ['GET'],
    enabled: policy?.enabled ?? true
  });

  const availableRoles = ['admin', 'moderator', 'user', 'viewer', 'guest'];
  const availableMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleMethod = (method: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_methods: prev.allowed_methods.includes(method)
        ? prev.allowed_methods.filter(m => m !== method)
        : [...prev.allowed_methods, method]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="policy-form">
      <div className="form-group">
        <label htmlFor="role">Role</label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({...formData, role: e.target.value})}
          required
        >
          <option value="">Select a role</option>
          {availableRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Allowed HTTP Methods</label>
        <div className="checkbox-group">
          {availableMethods.map(method => (
            <label key={method} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.allowed_methods.includes(method)}
                onChange={() => toggleMethod(method)}
              />
              {method}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
          />
          Policy Enabled
        </label>
      </div>

      <div className="form-actions">
        <button type="submit">{policy ? 'Update' : 'Create'} Policy</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};
```

## Access Control Visualization

### Policy Access Matrix Component

```tsx
interface PolicyAccessMatrixProps {
  serviceId: string;
  consumers: Array<{ id: string; name: string }>;
}

const PolicyAccessMatrix: React.FC<PolicyAccessMatrixProps> = ({ 
  serviceId, 
  consumers 
}) => {
  const [servicePolicy, setServicePolicy] = useState<ServicePolicy | null>(null);
  const [consumerPolicies, setConsumerPolicies] = useState<Record<string, ConsumerPolicy[]>>({});

  useEffect(() => {
    loadData();
  }, [serviceId, consumers]);

  const loadData = async () => {
    try {
      // Load service policy
      const servicePol = await getServicePolicy(serviceId);
      setServicePolicy(servicePol);

      // Load consumer policies
      const consumerPols: Record<string, ConsumerPolicy[]> = {};
      for (const consumer of consumers) {
        consumerPols[consumer.id] = await getConsumerPolicies(consumer.id);
      }
      setConsumerPolicies(consumerPols);
    } catch (error) {
      console.error('Failed to load policy data:', error);
    }
  };

  const checkAccess = (consumerId: string, method: string): boolean => {
    const policies = consumerPolicies[consumerId] || [];
    
    if (!servicePolicy) return true; // No service policy = open access
    
    return policies.some(policy => 
      policy.enabled &&
      policy.allowed_methods.includes(method) &&
      servicePolicy.required_roles.includes(policy.role)
    );
  };

  const methods = ['GET', 'POST', 'PUT', 'DELETE'];

  return (
    <div className="access-matrix">
      <h3>Service Access Matrix</h3>
      
      <div className="service-info">
        <p><strong>Service Policy:</strong> {
          servicePolicy 
            ? `Requires roles: ${servicePolicy.required_roles.join(', ')}`
            : 'No policy (open access)'
        }</p>
      </div>

      <table className="matrix-table">
        <thead>
          <tr>
            <th>Consumer</th>
            {methods.map(method => (
              <th key={method}>{method}</th>
            ))}
            <th>Policies</th>
          </tr>
        </thead>
        <tbody>
          {consumers.map(consumer => (
            <tr key={consumer.id}>
              <td>{consumer.name}</td>
              {methods.map(method => (
                <td key={method}>
                  <span className={`access-indicator ${
                    checkAccess(consumer.id, method) ? 'allowed' : 'denied'
                  }`}>
                    {checkAccess(consumer.id, method) ? '✓' : '✗'}
                  </span>
                </td>
              ))}
              <td>
                <div className="consumer-policies">
                  {(consumerPolicies[consumer.id] || []).map(policy => (
                    <span key={policy.id} className={`policy-badge ${policy.enabled ? 'enabled' : 'disabled'}`}>
                      {policy.role}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Utility Functions

### API Helper

```typescript
class PolicyAPI {
  constructor(private baseUrl = '/api/v1') {}

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 204) return null as T;
    return response.json();
  }

  // Service Policy Methods
  async getServicePolicy(serviceId: string): Promise<ServicePolicy | null> {
    return this.request(`/services/${serviceId}/policy`);
  }

  async createServicePolicy(
    serviceId: string, 
    data: CreateServicePolicyRequest
  ): Promise<ServicePolicy> {
    return this.request(`/services/${serviceId}/policy`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServicePolicy(
    serviceId: string,
    policyId: string,
    data: UpdateServicePolicyRequest
  ): Promise<ServicePolicy> {
    return this.request(`/services/${serviceId}/policy/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteServicePolicy(serviceId: string, policyId: string): Promise<void> {
    return this.request(`/services/${serviceId}/policy/${policyId}`, {
      method: 'DELETE',
    });
  }

  // Consumer Policy Methods
  async getConsumerPolicies(
    consumerId: string,
    offset = 0,
    limit = 100
  ): Promise<ConsumerPolicy[]> {
    return this.request(`/consumers/${consumerId}/policies?offset=${offset}&limit=${limit}`);
  }

  async createConsumerPolicy(
    consumerId: string,
    data: CreateConsumerPolicyRequest
  ): Promise<ConsumerPolicy> {
    return this.request(`/consumers/${consumerId}/policies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConsumerPolicy(
    consumerId: string,
    policyId: string
  ): Promise<ConsumerPolicy> {
    return this.request(`/consumers/${consumerId}/policy/${policyId}`);
  }

  async updateConsumerPolicy(
    consumerId: string,
    policyId: string,
    data: UpdateConsumerPolicyRequest
  ): Promise<ConsumerPolicy> {
    return this.request(`/consumers/${consumerId}/policy/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteConsumerPolicy(consumerId: string, policyId: string): Promise<void> {
    return this.request(`/consumers/${consumerId}/policy/${policyId}`, {
      method: 'DELETE',
    });
  }
}

// Usage
const policyAPI = new PolicyAPI();
```

## Error Handling

### Comprehensive Error Handler

```typescript
interface APIError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

function handlePolicyAPIError(error: any): string {
  // Network errors
  if (!error.response && error.message) {
    return `Network error: ${error.message}`;
  }

  // API errors
  if (error.response?.data) {
    const apiError: APIError = error.response.data;
    return apiError.detail || apiError.title || 'Unknown API error';
  }

  // Generic errors
  return error.message || 'An unexpected error occurred';
}

// Usage in components
const handleError = (error: any, operation: string) => {
  const message = handlePolicyAPIError(error);
  console.error(`Failed to ${operation}:`, error);
  
  // Show user notification
  showNotification('error', `Failed to ${operation}: ${message}`);
};
```

## Testing

### Policy API Integration Tests

```typescript
describe('Policy API Integration', () => {
  const api = new PolicyAPI();

  it('should manage service policies', async () => {
    const serviceId = 'test-service-id';
    
    // Create policy
    const created = await api.createServicePolicy(serviceId, {
      required_roles: ['admin'],
      enabled: true
    });
    
    expect(created.required_roles).toEqual(['admin']);
    
    // Update policy
    const updated = await api.updateServicePolicy(serviceId, created.id, {
      required_roles: ['admin', 'moderator']
    });
    
    expect(updated.required_roles).toEqual(['admin', 'moderator']);
    
    // Delete policy
    await api.deleteServicePolicy(serviceId, created.id);
    
    // Verify deletion
    const policy = await api.getServicePolicy(serviceId);
    expect(policy).toBeNull();
  });

  it('should manage consumer policies', async () => {
    const consumerId = 'test-consumer-id';
    
    // Create multiple policies
    const adminPolicy = await api.createConsumerPolicy(consumerId, {
      role: 'admin',
      allowed_methods: ['GET', 'POST', 'PUT', 'DELETE'],
      enabled: true
    });
    
    const userPolicy = await api.createConsumerPolicy(consumerId, {
      role: 'user',
      allowed_methods: ['GET'],
      enabled: true
    });
    
    // List policies
    const policies = await api.getConsumerPolicies(consumerId);
    expect(policies).toHaveLength(2);
    
    // Update policy
    const updated = await api.updateConsumerPolicy(
      consumerId, 
      userPolicy.id, 
      { allowed_methods: ['GET', 'POST'] }
    );
    
    expect(updated.allowed_methods).toEqual(['GET', 'POST']);
    
    // Delete policies
    await api.deleteConsumerPolicy(consumerId, adminPolicy.id);
    await api.deleteConsumerPolicy(consumerId, userPolicy.id);
  });
});
```

## Best Practices

### 1. State Management
```typescript
// Use React Query for caching and synchronization
import { useQuery, useMutation, useQueryClient } from 'react-query';

const useServicePolicy = (serviceId: string) => {
  return useQuery(
    ['servicePolicy', serviceId],
    () => policyAPI.getServicePolicy(serviceId),
    { staleTime: 30000 } // Cache for 30 seconds
  );
};

const useCreateServicePolicy = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ serviceId, data }: { serviceId: string; data: CreateServicePolicyRequest }) =>
      policyAPI.createServicePolicy(serviceId, data),
    {
      onSuccess: (_, { serviceId }) => {
        queryClient.invalidateQueries(['servicePolicy', serviceId]);
      }
    }
  );
};
```

### 2. Form Validation
```typescript
import { z } from 'zod';

const ServicePolicySchema = z.object({
  required_roles: z.array(z.string()).min(1, 'At least one role is required'),
  enabled: z.boolean()
});

const ConsumerPolicySchema = z.object({
  role: z.string().min(1, 'Role is required'),
  allowed_methods: z.array(z.string()).min(1, 'At least one method is required'),
  enabled: z.boolean()
});

// Usage in forms
const validateServicePolicy = (data: any) => {
  try {
    return ServicePolicySchema.parse(data);
  } catch (error) {
    throw new Error('Invalid policy data');
  }
};
```

### 3. Role and Method Constants
```typescript


export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS'
} as const;


```

## Summary

This frontend implementation guide provides:

- **Complete API coverage** for both service and consumer policies
- **React components** for policy management UI
- **TypeScript interfaces** for type safety
- **Error handling** patterns
- **Testing approaches** for API integration
- **Best practices** for state management and validation

The dual policy system enables fine-grained access control where:
1. **Service policies** define what roles can access a service
2. **Consumer policies** define what roles and methods a consumer has
3. **Access is granted** when any consumer policy satisfies both role and method requirements

This architecture supports complex authorization scenarios while maintaining a clean and intuitive API for frontend developers.
