import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Typography, Alert, Space, Collapse, Modal, Spin, Drawer, Tabs, message } from 'antd';
import { RobotOutlined, BulbOutlined, CheckOutlined, SettingOutlined, CodeOutlined, EyeOutlined } from '@ant-design/icons';
import OllamaService from '../../../services/ollama';
import ollamaConfig from '../../../config/ollama';
import { Field, Response } from '@formstr/sdk/dist/formstr/nip101';
import OllamaSettings from '../../../components/OllamaSettings';
import ReactJson from 'react-json-view';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface AIFormFillerProps {
  fields: Field[];
  onResponsesGenerated: (responses: Record<string, [string, string | undefined]>) => void;
}

// Helper function to clean up field labels for better AI understanding
const cleanFieldLabel = (label: string): string => {
  return label.replace(/^\*\s*/, '').trim();
};

// Helper function to determine if a field is required
const isFieldRequired = (field: Field): boolean => {
  try {
    const config = field[5] ? JSON.parse(field[5]) : {};
    return config.required === true;
  } catch (e) {
    // Default to not required if parsing fails
    return false;
  }
};

// Helper function to safely parse field type with better error handling
const getFieldType = (field: Field): { type: string, renderElement?: string } => {
  const [, , typeData, , , configString] = field;
  let type = 'text'; // Default type
  let renderElement: string | undefined;
  
  // Try to parse type from typeData
  try {
    if (typeof typeData === 'string') {
      if (typeData.startsWith('{')) {
        // It's likely a JSON object
        const parsed = JSON.parse(typeData);
        type = parsed.type || type;
      } else {
        // It's a simple string type
        type = typeData;
      }
    }
  } catch (e) {
    console.warn('Failed to parse field type data:', e);
  }
  
  // Try to get renderElement from config
  try {
    if (configString) {
      const config = JSON.parse(configString);
      renderElement = config.renderElement;
    }
  } catch (e) {
    console.warn('Failed to parse field config:', e);
  }
  
  return { type, renderElement };
};

// Helper to get options with better error handling
const getFieldOptions = (field: Field): string[] => {
  const [, , , , optionsString] = field;
  let options: any[] = [];
  
  try {
    if (optionsString) {
      const parsed = JSON.parse(optionsString);
      
      if (Array.isArray(parsed)) {
        // Convert options to simple strings
        options = parsed.map(opt => {
          if (typeof opt === 'string') return opt;
          if (Array.isArray(opt) && opt.length >= 2) return opt[1]; // Option label
          return '';
        }).filter(Boolean);
      }
    }
  } catch (e) {
    console.warn('Failed to parse field options:', e);
  }
  
  return options;
};

const AIFormFiller: React.FC<AIFormFillerProps> = ({ fields, onResponsesGenerated }) => {
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [generatedResponses, setGeneratedResponses] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('fill');
  const [ollamaSettings, setOllamaSettings] = useState(ollamaConfig);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [ollamaService] = useState(() => new OllamaService(ollamaConfig));
  
  // Extract form title or name if available
  const formTitle = fields.find(f => f[3]?.toLowerCase().includes('form'))?.slice(3) || 'Form';

  useEffect(() => {
    // Pre-populate with form description if available in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const formDescription = urlParams.get('description');
    if (formDescription) {
      setContext(formDescription);
    }
  }, []);

  const handleOllamaConfigChange = (config: any) => {
    setOllamaSettings(config);
  };

  const testOllamaConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ollamaService.testConnection();
      setConnectionStatus(result.success);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setConnectionStatus(false);
      setError('Failed to connect to Ollama. Please check your settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateResponses = async () => {
    if (!context.trim()) {
      setError('Please provide context for generating form responses');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First test the connection
      const connectionTest = await ollamaService.testConnection();
      if (!connectionTest.success) {
        // If Ollama fails, use the enhanced fallback
        console.warn('Using enhanced fallback due to connection issues');
        const sampleResponses = generateEnhancedSampleResponses(fields, context);
        setGeneratedResponses(sampleResponses);
        onResponsesGenerated(sampleResponses);
        setIsLoading(false);
        return;
      }

      // Convert fields to a simpler format for AI processing with improved parsing
      const simplifiedFields = fields
        .filter(field => field[0] === "field") // Filter out non-field tags
        .map(field => {
          const fieldItem = field as Field;
          const [, fieldId, , label] = fieldItem;
          
          // Use helper functions for better parsing
          const { type, renderElement } = getFieldType(fieldItem);
          const isRequired = isFieldRequired(fieldItem);
          const options = getFieldOptions(fieldItem);
          
          // Clean up label for better AI processing
          const cleanedLabel = cleanFieldLabel(label);
          
          // Determine effective field type (considering both type and renderElement)
          const effectiveType = renderElement || type;
          
          // Extract semantic information from the label
          const labelLower = cleanedLabel.toLowerCase();
          const isName = /name|full name|first name|last name/.test(labelLower);
          const isEmail = /email|e-mail/.test(labelLower) || effectiveType === 'email';
          const isPhone = /phone|mobile|cell|telephone|contact/.test(labelLower) || effectiveType === 'tel';
          const isAddress = /address|location|place|venue/.test(labelLower);
          const isDate = /date|day|when/.test(labelLower) || effectiveType === 'date';
          const isTime = /time|hour|when/.test(labelLower) || effectiveType === 'time';
          const isNumber = /number|count|amount|quantity|how many/.test(labelLower) || effectiveType === 'number';
          
          return {
            id: fieldId,
            label: cleanedLabel,
            type: effectiveType,
            required: isRequired,
            options: options,
            // Add richer semantic information for better AI understanding
            semantics: {
              isName,
              isEmail,
              isPhone,
              isAddress,
              isDate,
              isTime,
              isNumber
            }
          };
        });

      // Add detailed context to the prompt with field descriptions and better semantic understanding
      const fieldDescriptions = simplifiedFields.map(f => {
        let description = `${f.label} (${f.type || 'text'})${f.required ? ' (required)' : ''}`;
        
        // Add semantic type information
        const semanticTypes = Object.entries(f.semantics)
          .filter(([, value]) => value === true)
          .map(([key]) => key.replace('is', ''));
        
        if (semanticTypes.length > 0) {
          description += ` - Identified as: ${semanticTypes.join(', ')}`;
        }
        
        // Add options information if available
        if (f.options && f.options.length > 0) {
          description += ` - Options: [${f.options.join(', ')}]`;
        }
        
        return description;
      }).join('\n');
      
      // Extract and analyze key contextual elements with more sophisticated pattern matching
      // Names (capitalized words that are likely names)
      const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
      const names = (context.match(namePattern) || []).join(', ');
      
      // Locations with more patterns
      const locationPattern = /\b(?:at|in|near|around|venue|location|place|address|building|hall|center|centre|park|house|home|apartment|flat|office|shop|store|mall|church|temple|mosque|school|university|college|library|hospital|clinic|restaurant|cafe|bar|pub|club|theater|theatre|cinema|stadium|arena|gym)\b.+?(?:\.|\n|$)/gi;
      const locationMatches = context.match(locationPattern) || [];
      const locations = locationMatches.map(match => match.trim()).join('; ');
      
      // Better time pattern detection
      const timePattern = /\b(?:\d{1,2}(?::\d{2})?(?:\s*[ap]\.?m\.?)?|(?:morning|afternoon|evening|night|noon|midnight))\b/gi;
      const times = (context.match(timePattern) || []).join(', ');
      
      // Date pattern detection
      const datePattern = /\b(?:\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{2,4}|(?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|yesterday)\b/gi;
      const dates = (context.match(datePattern) || []).join(', ');
      
      // Event types
      const eventPattern = /\b(?:party|meeting|conference|workshop|seminar|wedding|birthday|anniversary|celebration|gathering|event|concert|show|exhibition|display|presentation|demonstration|ceremony|service|reception|dinner|lunch|breakfast|brunch|picnic|barbecue|bbq)\b/gi;
      const eventTypes = (context.match(eventPattern) || []).join(', ');
      
      const enhancedContext = `
Form Context Analysis:
${context}

${names ? 'People mentioned: ' + names : ''}
${locations ? 'Locations mentioned: ' + locations : ''}
${times ? 'Times mentioned: ' + times : ''}
${dates ? 'Dates mentioned: ' + dates : ''}
${eventTypes ? 'Event types mentioned: ' + eventTypes : ''}

Please provide real, contextual answers for these form fields:
${fieldDescriptions}

IMPORTANT GUIDELINES: 
- Provide appropriate values based on the form context provided
- Extract real values from the context whenever possible
- For checkbox or multiselect fields, select appropriate options based on context
- For date/time fields, use specific values extracted from the context
- For name fields, use actual names mentioned in the context if available
- For location fields, extract specific places from the context
- Keep text responses concise and relevant to the form's purpose
`;

      console.log('Enhanced context for AI:', enhancedContext);
      
      try {
        const responses = await ollamaService.generateFormResponse(simplifiedFields, enhancedContext);
        console.log('Received responses from Ollama:', responses);
        
        // Process the responses to ensure they're in the expected format
        setGeneratedResponses(responses);
        
        // Notify parent component
        onResponsesGenerated(responses);
      } catch (aiError) {
        console.error('AI generation failed, using enhanced fallback:', aiError);
        const fallbackResponses = generateEnhancedSampleResponses(fields, context);
        setGeneratedResponses(fallbackResponses);
        onResponsesGenerated(fallbackResponses);
      }
    } catch (err) {
      console.error('Error generating form responses:', err);
      setError('Failed to generate responses. Please try again or check your Ollama settings.');
      
      // Use fallback responses
      const fallbackResponses = generateEnhancedSampleResponses(fields, context);
      setGeneratedResponses(fallbackResponses);
      onResponsesGenerated(fallbackResponses);
    } finally {
      setIsLoading(false);
    }
  };

  // Improved enhanced fallback response generator
  const generateEnhancedSampleResponses = (fields: Field[], context: string): Record<string, [string, string | undefined]> => {
    console.log('Generating enhanced sample responses with context:', context);
    
    const responses: Record<string, [string, string | undefined]> = {};
    const contextLower = context.toLowerCase();
    
    // Extract potential values from context
    const extractedNames = context.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const randomName = extractedNames.length > 0 ? 
      extractedNames[Math.floor(Math.random() * extractedNames.length)] : 
      'John Smith';
    
    const extractedEmails = context.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    const randomEmail = extractedEmails.length > 0 ?
      extractedEmails[0] :
      'contact@example.com';
    
    const extractedPhones = context.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g) || [];
    const randomPhone = extractedPhones.length > 0 ?
      extractedPhones[0] :
      '555-123-4567';
    
    const extractedDates = context.match(/\b(?:\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?(?:\s+)(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+)\d{2,4})\b/gi) || [];
    const randomDate = extractedDates.length > 0 ?
      extractedDates[0] :
      new Date().toLocaleDateString();
    
    const extractedTimes = context.match(/\b\d{1,2}:\d{2}(?:\s*[AP]M)?\b/gi) || [];
    const randomTime = extractedTimes.length > 0 ?
      extractedTimes[0] :
      '7:00 PM';
      
    // Process each field to generate a contextually appropriate response
    fields.filter(field => field[0] === 'field').forEach(field => {
      try {
        const [, fieldId, typeData, label] = field;
        const cleanedLabel = cleanFieldLabel(label);
        const labelLower = cleanedLabel.toLowerCase();
        
        // Get field type with better error handling
        let fieldType = 'text';
        let fieldConfig = {};
        
        try {
          if (typeof typeData === 'string') {
            // Try to parse as JSON first
            if (typeData.startsWith('{')) {
              const parsed = JSON.parse(typeData);
              fieldType = parsed.type || 'text';
            } else {
              // It's a simple string type
              fieldType = typeData;
            }
          }
          
          // Parse config
          if (field[5]) {
            fieldConfig = JSON.parse(field[5]);
          }
        } catch (e) {
          console.warn('Error parsing field type/config:', e);
        }
        
        // Get render element if available
        const renderElement = fieldConfig && typeof fieldConfig === 'object' ? 
          (fieldConfig as any).renderElement : undefined;
        
        // Effective type considering renderElement
        const effectiveType = renderElement || fieldType;
        
        // Parse options if available
        let options: string[] = [];
        try {
          if (field[4]) {
            const parsed = JSON.parse(field[4]);
            options = parsed.map((opt: any) => {
              if (typeof opt === 'string') return opt;
              if (Array.isArray(opt) && opt.length >= 2) return opt[1];
              return '';
            }).filter(Boolean);
          }
        } catch (e) {
          console.warn('Error parsing options:', e);
        }
        
        // Generate response based on field type and label
        let response: string = '';
        
        switch (effectiveType) {
          case 'email':
            response = randomEmail || 'contact@example.com';
            break;
            
          case 'tel':
            response = randomPhone || '555-123-4567';
            break;
            
          case 'checkbox':
            response = contextLower.includes('yes') || contextLower.includes('agree') ? 'true' : 'false';
            break;
            
          case 'checkboxes':
            // Select 1-2 options that match keywords in the context
            if (options.length > 0) {
              const selectedOptions = options.filter(opt => 
                contextLower.includes(opt.toLowerCase())
              );
              
              // If no matches, select 1-2 random options
              if (selectedOptions.length === 0) {
                const numToSelect = Math.min(Math.floor(Math.random() * 2) + 1, options.length);
                for (let i = 0; i < numToSelect; i++) {
                  selectedOptions.push(options[Math.floor(Math.random() * options.length)]);
                }
              }
              
              response = Array.from(new Set(selectedOptions)).join(';') || '';
            } else {
              response = '';
            }
            break;
            
          case 'radio':
          case 'select':
          case 'singleselect':
            // Select an option that matches the context
            if (options.length > 0) {
              const matchingOption = options.find(opt => 
                contextLower.includes(opt.toLowerCase())
              );
              
              response = matchingOption || options[Math.floor(Math.random() * options.length)] || '';
            } else {
              response = '';
            }
            break;
            
          case 'date':
            response = randomDate || new Date().toLocaleDateString();
            break;
            
          case 'time':
            response = randomTime || '7:00 PM';
            break;
            
          case 'number':
            if (labelLower.includes('age')) {
              response = '28';
            } else if (labelLower.includes('quantity') || labelLower.includes('count')) {
              response = Math.floor(Math.random() * 10 + 1).toString();
            } else {
              response = Math.floor(Math.random() * 100).toString();
            }
            break;
            
          case 'text':
          default:
            // Generate text response based on label
            if (labelLower.includes('name')) {
              response = randomName;
            } else if (labelLower.includes('address')) {
              response = '123 Main St, Anytown, US 12345';
            } else if (labelLower.includes('food') || labelLower.includes('meal')) {
              response = contextLower.includes('vegetarian') ? 'Vegetarian option' : 'No dietary restrictions';
            } else if (labelLower.includes('comment') || labelLower.includes('feedback')) {
              response = 'Looking forward to the event!';
            } else {
              response = `Response for ${cleanedLabel}`;
            }
            break;
        }
        
        // Ensure response is a string
        if (response === null || response === undefined) {
          response = '';
        }
        
        // Store response in format [answer, message]
        responses[fieldId] = [response, undefined];
        
      } catch (e) {
        console.error('Error generating sample response for field:', e);
        responses[field[1]] = ['', undefined];
      }
    });
    
    return responses;
  };

  const applyResponses = () => {
    const formattedResponses: Record<string, [string, string | undefined]> = {};
    
    // Process all form fields
    fields.forEach(field => {
      // Skip non-field tags
      if (field[0] !== "field") return;
      
      const fieldItem = field as Field;
      const [placeholder, fieldId, typeData, label] = fieldItem;
      const cleanLabel = cleanFieldLabel(label);
      
      // Get the response for this field either by ID or by label
      const responseValue = generatedResponses[fieldId] || generatedResponses[cleanLabel];
      
      if (responseValue !== undefined) {
        let formattedValue: string;
        
        // Ensure the value is a string
        if (Array.isArray(responseValue)) {
          // If it's already in the format [value, message]
          formattedValue = String(responseValue[0] || '');
        } else if (typeof responseValue === 'object' && responseValue !== null) {
          formattedValue = JSON.stringify(responseValue);
        } else {
          formattedValue = String(responseValue || '');
        }
        
        formattedResponses[fieldId] = [formattedValue, undefined];
      }
    });
    
    onResponsesGenerated(formattedResponses);
    message.success('AI responses applied to form');
    setIsModalVisible(false);
  };

  const fieldsPreview = fields.map(field => {
    const [placeholder, fieldId, typeData, label, optionsString, config] = field;
    
    let fieldConfig;
    try {
      fieldConfig = JSON.parse(config);
    } catch (e) {
      fieldConfig = { required: false };
    }
    
    return (
      <li key={fieldId} className="mb-2">
        <Text strong>{label}</Text>
        {fieldConfig.required && <Text type="danger"> *</Text>}
      </li>
    );
  });

  return (
    <>
      <Button
        type="primary"
        icon={<RobotOutlined />}
        onClick={() => {
          setIsModalVisible(true);
          setError(null);
          // Automatically test connection when opening the modal
          testOllamaConnection();
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          borderRadius: '50px',
          fontSize: '16px',
        }}
      >
        <span style={{ marginLeft: '8px' }}>Fill with AI</span>
      </Button>
      
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ fontSize: '20px', marginRight: '10px', color: '#1890ff' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>AI Form Filler</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={650}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
          <TabPane tab="Fill Form" key="fill">
            <div className="mb-4">
              {connectionStatus === false && (
                <Alert
                  message="Ollama Connection Issue"
                  description="Could not connect to Ollama server. Please check your settings in the AI Settings tab."
                  type="error"
                  showIcon
                  className="mb-4"
                />
              )}
              
              <Paragraph style={{ fontSize: '16px', marginBottom: '16px' }}>
                Describe the context for filling this form and let AI generate responses for you.
                The more details you provide, the more accurate the responses will be.
              </Paragraph>
              
              <Collapse defaultActiveKey={['1']} className="mb-4">
                <Panel header={<Text strong>Form Fields to be Filled</Text>} key="1">
                  <ul className="list-disc" style={{ paddingLeft: '20px' }}>
                    {fieldsPreview}
                  </ul>
                </Panel>
              </Collapse>
              
              <Alert
                message={<Text strong>Tips for Better Results</Text>}
                description={
                  <Space direction="vertical">
                    <Text>
                      <BulbOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                      Provide specific details about the person or situation
                    </Text>
                    <Text>
                      <BulbOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                      Include relevant information for each field
                    </Text>
                    <Text>
                      <BulbOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                      Be clear about preferences or requirements
                    </Text>
                  </Space>
                }
                type="info"
                showIcon
                className="mb-4"
                style={{ borderLeft: '4px solid #1890ff' }}
              />
              
              <TextArea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Example: I'm organizing a birthday party at my home on Friday evening with beer and pizza. Everyone should bring a baseball cap."
                rows={4}
                className="mb-4"
                style={{ fontSize: '14px', borderRadius: '4px' }}
              />
              
              {error && (
                <Alert
                  message="Error"
                  description={error}
                  type="error"
                  showIcon
                  className="mb-4"
                />
              )}
              
              {Object.keys(generatedResponses).length > 0 ? (
                <div className="mb-4">
                  <Alert
                    message={<Text strong>Generated Responses</Text>}
                    description={
                      <ul className="list-disc" style={{ paddingLeft: '20px' }}>
                        {Object.entries(generatedResponses).map(([field, value]) => (
                          <li key={field} className="mb-1">
                            <Text strong>{field}:</Text> {Array.isArray(value) ? value.join(', ') : value.toString()}
                          </li>
                        ))}
                      </ul>
                    }
                    type="success"
                    showIcon
                    className="mb-4"
                    style={{ borderLeft: '4px solid #52c41a' }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => setShowJsonPreview(true)}
                    >
                      View JSON
                    </Button>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={applyResponses}
                      size="large"
                    >
                      Apply Responses
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={handleGenerateResponses}
                  loading={isLoading}
                  disabled={connectionStatus === false}
                  block
                  size="large"
                  style={{ height: '50px', fontSize: '16px' }}
                >
                  {isLoading ? 'Generating Responses...' : 'Generate Responses'}
                </Button>
              )}
            </div>
          </TabPane>
          <TabPane tab="AI Settings" key="settings">
            <OllamaSettings onConfigChange={handleOllamaConfigChange} />
          </TabPane>
        </Tabs>
      </Modal>
      
      {/* JSON Preview Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CodeOutlined style={{ fontSize: '18px', marginRight: '8px' }} /> 
            <span>JSON Response Preview</span>
          </div>
        }
        placement="right"
        onClose={() => setShowJsonPreview(false)}
        open={showJsonPreview}
        width={400}
      >
        {Object.keys(generatedResponses).length > 0 ? (
          <ReactJson 
            src={generatedResponses} 
            theme="rjv-default" 
            displayDataTypes={false} 
            name={null}
            style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}
          />
        ) : (
          <Alert
            message="No Data"
            description="No response data is available yet."
            type="info"
            showIcon
          />
        )}
      </Drawer>
    </>
  );
};

export default AIFormFiller;
