import React, { useState } from "react";
import { Form, Input, Typography, Select, Checkbox, DatePicker, TimePicker, FormInstance } from "antd";
import { Field, Option, Tag } from "@formstr/sdk/dist/formstr/nip101";
import "./formFields.style.css"; // We'll create this file later

const { Text } = Typography;
const { Option: SelectOption } = Select;

interface FormFieldsProps {
  fields: Field[] | Tag[];
  handleInput: (questionId: string, answer: string, message?: string) => void;
  embedMode?: boolean;
  form?: FormInstance<any>; // Properly typed Form instance
  disabled?: boolean; // Add this prop
}

export const FormFields: React.FC<FormFieldsProps> = ({
  fields,
  handleInput,
  embedMode,
  form: externalForm,
  disabled = false, // Default to not disabled
}) => {
  // Use the form from props if provided, otherwise create a new one
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;
  const [fieldStates, setFieldStates] = useState<{[key: string]: any}>({});

  // Add validation for all field types
  const validateField = (value: any, fieldId: string, field: Field | Tag) => {
    if (!value) return Promise.resolve();
    
    try {
      const fieldType = typeof field[2] === 'string' ? field[2] : JSON.parse(field[2])?.type;
      const config = field[5] ? JSON.parse(field[5]) : {};
      const required = config.required === true;
      
      // If empty and required, return validation error
      if (required) {
        if (fieldType === 'checkbox') {
          // For checkboxes, value is a boolean
          if (value === false) {
            return Promise.reject('This checkbox is required');
          }
        } else {
          // For other fields, check if value is empty
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return Promise.reject('This field is required');
          }
        }
      }
      
      // Validate based on field type
      if (fieldType === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return Promise.reject('Please enter a valid email address');
        }
      } else if (fieldType === 'tel') {
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        if (!phoneRegex.test(value)) {
          return Promise.reject('Please enter a valid phone number');
        }
      } else if (fieldType === 'number') {
        if (isNaN(Number(value))) {
          return Promise.reject('Please enter a valid number');
        }
      }
      
      return Promise.resolve();
    } catch (e) {
      console.error('Validation error:', e);
      return Promise.resolve(); // Don't block submission on error
    }
  };

  // Handle changes for different field types
  const handleChange = (value: any, fieldId: string, field: Field | Tag) => {
    try {
      // Get field type and configurations
      const fieldType = typeof field[2] === 'string' ? field[2] : JSON.parse(field[2])?.type;
      const config = field[5] ? JSON.parse(field[5]) : {};
      const renderElement = config.renderElement;
      
      // Process value based on field type
      let processedValue;
      
      if (fieldType === 'checkbox') {
        // For checkbox, value is boolean -> convert to string
        processedValue = value ? 'true' : 'false';
      } else if (fieldType === 'checkboxes' || renderElement === 'checkboxes') {
        // For checkbox groups, ensure array and join with semicolon
        if (Array.isArray(value)) {
          processedValue = value.join(';');
        } else if (typeof value === 'string' && value.includes(',')) {
          // Handle comma-separated string
          processedValue = value.split(',').join(';');
        } else {
          processedValue = value;
        }
      } else if (fieldType === 'select' || fieldType === 'singleselect' || fieldType === 'radio' || 
                 renderElement === 'select' || renderElement === 'radioButton') {
        // For select/radio, use the value directly
        processedValue = value;
      } else if (fieldType === 'multiselect' || renderElement === 'multiselect') {
        // For multiselect, join values with semicolon
        if (Array.isArray(value)) {
          processedValue = value.join(';');
        } else if (typeof value === 'string' && value.includes(',')) {
          // Handle comma-separated string
          processedValue = value.split(',').join(';');
        } else {
          processedValue = value;
        }
      } else if (fieldType === 'date' || fieldType === 'time') {
        // Format date/time values
        processedValue = value ? (typeof value.format === 'function' ? value.format('YYYY-MM-DD HH:mm:ss') : value) : '';
      } else {
        // For text inputs and other types
        processedValue = value;
      }
      
      // Store field state for UI updates
      setFieldStates(prev => ({
        ...prev,
        [fieldId]: value
      }));
      
      // Pass processed value to parent component
      handleInput(fieldId, processedValue);
    } catch (e) {
      console.error('Error handling field change:', e);
      handleInput(fieldId, String(value)); // Fallback
    }
  };

  // Get placeholder text based on field type
  const getPlaceholder = (field: Field | Tag) => {
    try {
      const fieldType = typeof field[2] === 'string' ? field[2] : JSON.parse(field[2])?.type;
      const label = field[3];
      
      switch(fieldType) {
        case 'email':
          return 'Enter your email address';
        case 'tel':
          return 'Enter your phone number';
        case 'number':
          return 'Enter a number';
        case 'textarea':
          return `Enter details for ${label}`;
        case 'time':
          return 'Select date/time';
        default:
          return `Enter ${label}`;
      }
    } catch (e) {
      return 'Enter value';
    }
  };

  // Check if a field is required
  const isFieldRequired = (field: Field | Tag) => {
    try {
      const config = field[5] ? JSON.parse(field[5]) : {};
      return config.required === true;
    } catch (e) {
      return false;
    }
  };

  // Render the appropriate field component
  const renderField = (field: Field | Tag) => {
    const [placeholder, fieldId, typeData, label, optionsString, config] = field;
    
    try {
      // Parse field type and configuration
      let fieldType = typeof typeData === 'string' ? typeData : JSON.parse(typeData)?.type;
      const fieldConfig = config ? JSON.parse(config) : {};
      const renderElement = fieldConfig.renderElement;
      const required = fieldConfig.required === true;
      
      // Parse options for select/checkbox fields
      let options = [];
      try {
        options = optionsString ? JSON.parse(optionsString) : [];
        
        // Ensure options are in the correct format
        options = options.map(option => {
          // If option is already a string, return [option, option] array
          if (typeof option === 'string') {
            return [option, option];
          }
          // If it's an array, ensure it has at least two items (value and label)
          if (Array.isArray(option) && option.length >= 1) {
            return option.length >= 2 ? option : [option[0], option[0]];
          }
          // If it's an object with id/label, convert to array
          if (typeof option === 'object' && option !== null) {
            if ('optionId' in option && 'optionLabel' in option) {
              return [option.optionId, option.optionLabel];
            }
            if ('id' in option && 'label' in option) {
              return [option.id, option.label];
            }
          }
          return ['', ''];
        }).filter(option => option[0] !== '');
      } catch (e) {
        console.error('Error parsing options:', e, optionsString);
        options = [];
      }
      
      // If renderElement is specified, use that as the field type
      if (renderElement && !fieldType) {
        fieldType = renderElement;
      }
      
      // Add required validation rule
      const rules = [
        {
          validator: (_: any, value: any) => validateField(value, fieldId, field),
        }
      ];
      
      // Helper to convert array/string values for checkboxes
      const getInitialValue = (fieldValue: any): any => {
        if (!fieldValue) return undefined;
        
        // Form data is typically stored as [value, message] tuple
        let value = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;
        
        if (fieldType === 'checkbox') {
          // For single checkbox, convert string 'true'/'false' to boolean
          return value === true || value === 'true';
        } else if (fieldType === 'checkboxes') {
          // For checkbox groups, split semicolon-separated values
          return typeof value === 'string' ? value.split(/[;,]/) : value;
        } else if (fieldType === 'multiselect') {
          // For multiselect, split semicolon-separated values to array
          return typeof value === 'string' ? value.split(/[;,]/) : value;
        }
        
        return value;
      };
      
      // Get form value for this field
      const fieldValue = form.getFieldValue(fieldId);
      const initialValue = getInitialValue(fieldValue);
      
      // Determine field UI component based on type
      switch (fieldType) {
        case 'select':
        case 'singleselect':
        case 'radio':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Select
                placeholder={`Select ${label}`}
                onChange={(value) => handleChange(value, fieldId, field)}
                style={{ width: '100%' }}
                disabled={disabled}
              >
                {options.map((option: Option | string, index: number) => {
                  let value, text;
                  if (typeof option === 'string') {
                    value = option;
                    text = option;
                  } else if (Array.isArray(option)) {
                    value = option[0];
                    text = option[1] || option[0];
                  } else {
                    return null;
                  }
                  return <SelectOption key={index} value={value}>{text}</SelectOption>;
                })}
              </Select>
            </Form.Item>
          );
          
        case 'checkbox':
          return (
            <Form.Item 
              name={fieldId}
              valuePropName="checked"
              initialValue={initialValue}
              rules={rules}
              style={{ marginBottom: 24 }}
            >
              <Checkbox 
                onChange={(e) => handleChange(e.target.checked, fieldId, field)}
                disabled={disabled}
              >
                {label}
              </Checkbox>
            </Form.Item>
          );
          
        case 'checkboxes':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <div className="checkbox-group">
                {options.map((option: Option | string, index: number) => {
                  let value, text;
                  if (typeof option === 'string') {
                    value = option;
                    text = option;
                  } else if (Array.isArray(option)) {
                    value = option[0];
                    text = option[1] || option[0];
                  } else {
                    return null;
                  }
                  
                  // Check if this value is in the current selection 
                  const isChecked = initialValue && Array.isArray(initialValue) && initialValue.includes(value);
                  
                  return (
                    <div key={index} className="checkbox-item">
                      <Checkbox
                        value={value}
                        checked={isChecked}
                        onChange={(e) => {
                          // Handle group of checkboxes
                          const currentValues = fieldStates[fieldId] || [];
                          let newValues;
                          
                          if (e.target.checked) {
                            newValues = [...currentValues, value];
                          } else {
                            newValues = currentValues.filter((v: string) => v !== value);
                          }
                          
                          handleChange(newValues, fieldId, field);
                        }}
                        disabled={disabled}
                      >
                        {text}
                      </Checkbox>
                    </div>
                  );
                })}
              </div>
            </Form.Item>
          );
          
        case 'multiselect':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Select
                mode="multiple"
                placeholder={`Select ${label} options`}
                onChange={(value) => handleChange(value, fieldId, field)}
                style={{ width: '100%' }}
                disabled={disabled}
              >
                {options.map((option: Option | string, index: number) => {
                  if (typeof option === 'string') {
                    return <SelectOption key={index} value={option}>{option}</SelectOption>;
                  }
                  return <SelectOption key={index} value={option[0]}>{option[1]}</SelectOption>;
                })}
              </Select>
            </Form.Item>
          );
          
        case 'textarea':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Input.TextArea
                placeholder={getPlaceholder(field)}
                onChange={(e) => handleChange(e.target.value, fieldId, field)}
                rows={4}
                disabled={disabled}
              />
            </Form.Item>
          );
          
        case 'time':
        case 'date':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              {fieldType === 'date' ? (
                <DatePicker 
                  style={{ width: '100%' }}
                  onChange={(date) => handleChange(date, fieldId, field)}
                  disabled={disabled}
                />
              ) : (
                <TimePicker 
                  style={{ width: '100%' }} 
                  format="HH:mm"
                  onChange={(time) => handleChange(time, fieldId, field)}
                  disabled={disabled}
                />
              )}
            </Form.Item>
          );
          
        case 'number':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Input
                type="number"
                placeholder={getPlaceholder(field)}
                onChange={(e) => handleChange(e.target.value, fieldId, field)}
                disabled={disabled}
              />
            </Form.Item>
          );
          
        case 'email':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Input
                type="email"
                placeholder={getPlaceholder(field)}
                onChange={(e) => handleChange(e.target.value, fieldId, field)}
                disabled={disabled}
              />
            </Form.Item>
          );
          
        case 'tel':
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Input
                type="tel"
                placeholder={getPlaceholder(field)}
                onChange={(e) => handleChange(e.target.value, fieldId, field)}
                disabled={disabled}
              />
            </Form.Item>
          );
          
        default:
          return (
            <Form.Item
              name={fieldId}
              rules={rules}
              initialValue={initialValue}
              style={{ marginBottom: 24 }}
            >
              <Input
                placeholder={getPlaceholder(field)}
                onChange={(e) => handleChange(e.target.value, fieldId, field)}
                disabled={disabled}
              />
            </Form.Item>
          );
      }
    } catch (e) {
      console.error('Error rendering field:', e);
      // Fallback to text input if there's an error
      return (
        <Form.Item
          name={fieldId}
          style={{ marginBottom: 24 }}
        >
          <Input
            placeholder={label}
            onChange={(e) => handleChange(e.target.value, fieldId, field)}
            disabled={disabled}
          />
        </Form.Item>
      );
    }
  };

  return (
    <div className="formFields">
      {fields.map((field, index) => {
        // Skip non-field tags
        if (field[0] !== "field") return null;
        
        const fieldItem = field as Field;
        const [placeholder, fieldId, typeData, label, optionsString, config] = fieldItem;
        const required = isFieldRequired(fieldItem);
        
        return (
          <div key={index} style={{ marginBottom: embedMode ? 12 : 24 }}>
            <label className="formFieldLabel">
              {/* Show asterisk for required fields */}
              {required && <span className="required-marker">* </span>}
              {label}
            </label>
            {renderField(fieldItem)}
          </div>
        );
      })}
    </div>
  );
}; 