import React, { memo, useCallback } from 'react';
import { Checkbox } from 'antd';

interface Props {
  field: any[];
  formik: any;
  showPreview?: boolean;
  disabled?: boolean;
  highlightIndex?: boolean;
  isHidden?: boolean;
  validationSchema?: any;
}

export const FormFieldRenderer = memo(
  ({
    field,
    formik,
    showPreview = false,
    disabled = false,
    highlightIndex = false,
    isHidden = false,
    validationSchema,
  }: Props) => {
    // Extract field properties
    const [_, fieldId, typeData, label, optionsString, configString] = field;
    
    // Parse field type and options
    let fieldType = typeof typeData === 'string' ? typeData : JSON.parse(typeData)?.type;
    const config = configString ? JSON.parse(configString) : {};
    
    // Parse options for select/checkbox fields
    let options = [];
    try {
      options = optionsString ? JSON.parse(optionsString) : [];
    } catch (e) {
      console.error('Error parsing options:', e);
      options = [];
    }
    
    // Use renderElement as fallback type if fieldType is not available
    if (config.renderElement && !fieldType) {
      fieldType = config.renderElement;
    }

    // Set field value in formik
    const setFieldValue = (value: any) => {
      formik.setFieldValue(fieldId, value);
    };
    
    const renderPreview = useCallback(() => {
      const fieldValue = formik.values[fieldId];
      
      // Handle array values (including those from checkbox groups)
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        const previewValue = fieldValue[0];
        
        // Handle checkbox/checkboxes specifically
        if (fieldType === 'checkbox') {
          return previewValue === 'true' || previewValue === true ? 'Yes' : 'No';
        } else if (fieldType === 'checkboxes' || config.renderElement === 'checkboxes') {
          // For checkboxes, the first element contains a semicolon-separated string of values
          if (typeof previewValue === 'string') {
            return previewValue.split(';').map(val => val.trim()).filter(Boolean).join(', ');
          }
          return Array.isArray(previewValue) ? previewValue.join(', ') : String(previewValue);
        }
        
        return String(previewValue);
      }
      
      // Handle select/singleselect
      if (fieldType === 'select' || fieldType === 'singleselect' || config.renderElement === 'select') {
        // Try to match the value with an option label
        const normalizedValue = String(fieldValue || '');
        const matchingOption = options.find((opt: any) => {
          const optionValue = Array.isArray(opt) ? opt[0] : opt;
          return String(optionValue) === normalizedValue;
        });
        
        if (matchingOption) {
          // Return the option label if available
          return Array.isArray(matchingOption) ? matchingOption[1] : matchingOption;
        }
      }
      
      // Handle radio buttons
      if (fieldType === 'radio' || config.renderElement === 'radio') {
        const normalizedValue = String(fieldValue || '');
        const matchingOption = options.find((opt: any) => {
          const optionValue = Array.isArray(opt) ? opt[0] : opt;
          return String(optionValue) === normalizedValue;
        });
        
        if (matchingOption) {
          return Array.isArray(matchingOption) ? matchingOption[1] : matchingOption;
        }
      }
      
      // Handle date and time formatted display
      if (fieldType === 'date' && fieldValue) {
        try {
          return new Date(fieldValue).toLocaleDateString();
        } catch (e) {
          return fieldValue;
        }
      }
      
      if (fieldType === 'time' && fieldValue) {
        return fieldValue;
      }
      
      // Return string value or default text
      return fieldValue ? String(fieldValue) : '(Empty)';
    }, [fieldId, fieldType, formik.values, config, options]);

    // Improve checkbox group handling
    const renderCheckboxGroup = () => {
      return (
        <Checkbox.Group
          className="checkbox-group"
          value={getFormCheckboxGroupValue()}
          onChange={(values) => {
            // Convert array to semicolon-separated string for consistency
            const stringValue = Array.isArray(values) ? values.join(';') : String(values);
            setFieldValue([stringValue, formik.values[fieldId]?.[1]]);
          }}
          disabled={disabled}
        >
          {options.map((option: any) => {
            const [value, label] = Array.isArray(option)
              ? option
              : [option, option];
            return (
              <div key={value} className="checkbox-option">
                <Checkbox value={value}>
                  {label}
                </Checkbox>
              </div>
            );
          })}
        </Checkbox.Group>
      );
    };

    // Add helper function for checkbox group values
    const getFormCheckboxGroupValue = () => {
      const fieldValue = formik.values[fieldId];
      if (!fieldValue) return [];
      
      // If value is in [value, message] format
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        const value = fieldValue[0];
        // Split semicolon-separated string into array
        return typeof value === 'string' 
          ? value.split(';').map(v => v.trim()).filter(Boolean) 
          : [];
      }
      
      // If value is directly a string (compatibility with older format)
      if (typeof fieldValue === 'string') {
        return fieldValue.split(';').map(v => v.trim()).filter(Boolean);
      }
      
      return [];
    };

    // Ensure checkbox value is properly handled
    const renderCheckbox = () => {
      const fieldValue = formik.values[fieldId];
      
      // Extract actual value from array format if needed
      let isChecked = false;
      
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        const value = fieldValue[0];
        isChecked = value === true || value === 'true';
      } else {
        isChecked = fieldValue === true || fieldValue === 'true';
      }
      
      return (
        <Checkbox
          checked={isChecked}
          onChange={(e) => {
            setFieldValue([String(e.target.checked), formik.values[fieldId]?.[1]]);
          }}
          disabled={disabled}
        >
          {label}
        </Checkbox>
      );
    };

    // Main rendering logic
    if (showPreview) {
      return <div className="field-preview">{renderPreview()}</div>;
    }

    if (isHidden) {
      return null;
    }

    // Handle different field types
    switch (fieldType) {
      case 'checkbox':
        return renderCheckbox();
      case 'checkboxes':
        return renderCheckboxGroup();
      default:
        // For other field types, return a placeholder when in preview mode
        if (showPreview) {
          return <div className="field-preview">{renderPreview()}</div>;
        }
        return <div>Field type not supported for preview: {fieldType}</div>;
    }
  }
); 