# Dynamic Plugin Configuration System

## Overview
The plugin configuration system now dynamically generates form fields based on the plugin's JSON schema, providing a much better user experience than static forms.

## How It Works

### 1. Plugin Selection
When a user selects a plugin type in the PluginModal:
```javascript
// Triggers schema loading
const handlePluginTypeChange = async (e) => {
  const pluginType = e.target.value;
  setSelectedPluginType(pluginType);
  
  if (pluginType) {
    await loadPluginSchema(pluginType); // Loads schema from API
  }
};
```

### 2. Schema Loading
The system attempts to load the plugin schema from the backend:
```javascript
// From AppState.jsx
async loadPluginSchema(pluginName) {
  try {
    const schema = await api.getPluginSchema(pluginName);
    dispatch({ type: ActionTypes.SET_PLUGIN_SCHEMAS, payload: { [pluginName]: schema } });
    return schema;
  } catch (error) {
    // Fallback to built-in schema for common plugins
    const fallbackSchema = getFallbackPluginSchema(pluginName);
    if (fallbackSchema) {
      dispatch({ type: ActionTypes.SET_PLUGIN_SCHEMAS, payload: { [pluginName]: fallbackSchema } });
      return fallbackSchema;
    }
    throw error;
  }
}
```

### 3. Dynamic Form Generation
The DynamicPluginConfig component renders form fields based on the schema:
```javascript
// Supports different field types
switch (fieldType) {
  case 'string':
    // Text input or dropdown for enums
  case 'number':
  case 'integer':
    // Number input with min/max validation
  case 'boolean':
    // Checkbox input
  case 'array':
    // Comma-separated text input
  case 'object':
    // JSON textarea with parsing
}
```

## Supported Field Types

### String Fields
- **Basic text input** for simple strings
- **Dropdown select** for enum values
- **Validation** based on schema constraints

### Number/Integer Fields
- **Number input** with step controls
- **Min/max constraints** from schema
- **Automatic type conversion** (parseInt/parseFloat)

### Boolean Fields
- **Checkbox input** with clear labeling
- **Default value** support from schema

### Array Fields
- **Comma-separated input** for easy editing
- **Automatic parsing** to array format
- **Help text** explaining the format

### Object Fields
- **JSON textarea** with syntax highlighting
- **Real-time parsing** with error tolerance
- **Pretty-printed** default values

## Schema Structure

The system expects plugin schemas in this format:
```json
{
  "type": "object",
  "properties": {
    "field_name": {
      "type": "string|number|integer|boolean|array|object",
      "description": "Help text for the user",
      "default": "default_value",
      "enum": ["option1", "option2"], // For dropdowns
      "minimum": 1, // For numbers
      "maximum": 100, // For numbers
      "required": true // For validation
    }
  }
}
```

## Fallback Schemas

For common plugins, the system includes built-in fallback schemas:

### Rate Limiting
```json
{
  "type": "object",
  "properties": {
    "minute": { "type": "integer", "minimum": 1, "description": "Requests per minute" },
    "hour": { "type": "integer", "minimum": 1, "description": "Requests per hour" },
    "day": { "type": "integer", "minimum": 1, "description": "Requests per day" },
    "policy": { 
      "type": "string", 
      "enum": ["local", "cluster", "redis"], 
      "default": "local",
      "description": "Rate limiting policy" 
    }
  }
}
```

### CORS
```json
{
  "type": "object",
  "properties": {
    "origins": { 
      "type": "array", 
      "description": "Allowed origins for CORS requests" 
    },
    "methods": { 
      "type": "array", 
      "default": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "description": "Allowed HTTP methods" 
    }
  }
}
```

### Key Authentication & Basic Authentication
Similar structures with authentication-specific fields.

## Usage Flow

1. **User opens plugin modal** → PluginModal component loads
2. **User selects plugin type** → Schema loading triggers
3. **Schema loads** → DynamicPluginConfig renders appropriate fields
4. **User fills configuration** → Values are validated and formatted
5. **User submits** → Configuration is sent to backend via API

## Error Handling

- **Schema loading failures** → Falls back to built-in schemas
- **Field validation errors** → Displayed inline with red styling
- **JSON parsing errors** → Allowed during typing, validated on submit
- **Network failures** → Handled by circuit breaker in API client

## CSS Classes

The system uses these CSS classes for styling:
- `.dynamic-plugin-config` - Main container
- `.form-control` - Input fields
- `.form-control.error` - Error state styling
- `.field-error` - Error message text
- `.form-help` - Help text styling
- `.required` - Required field indicator

This makes the plugin configuration much more user-friendly and eliminates the static form problem you mentioned!
