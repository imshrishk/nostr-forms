import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Input, 
  Typography, 
  Alert, 
  Space, 
  Collapse, 
  Spin, 
  Tabs, 
  Select, 
  Modal,
  Tag,
  Switch,
  Drawer,
  Radio,
  Checkbox,
  Divider,
  List
} from 'antd';
import { 
  RobotOutlined, 
  BulbOutlined, 
  FormOutlined, 
  SettingOutlined, 
  CodeOutlined,
  EditOutlined,
  EyeOutlined,
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import OllamaService from '../../../../services/ollama';
import ollamaConfig from '../../../../config/ollama';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import { makeTag } from '../../../../utils/utility';
import { Field } from '../../../../nostr/types';
import OllamaSettings from '../../../../components/OllamaSettings';
import ReactJson from 'react-json-view';
import { FormTemplateKey } from '../../../../services/ollama';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;

// Sample prompts for different form types
const SAMPLE_PROMPTS = {
  contact: "Create a contact form with fields for name, email address, phone number, subject, and message content. Name, email, and message should be required fields.",
  event: "Create an event registration form with fields for attendee name, email, phone number, organization, job title, dietary restrictions, and session preferences. Name and email should be required.",
  survey: "Create a customer feedback survey with questions for overall satisfaction rating, product quality rating, service experience comments, likelihood to recommend (scale 1-10), and areas for improvement. All rating questions should be required.",
  application: "Create a job application form with fields for full name, email, phone, resume upload, work experience, education background, skills, and references. All fields except references should be required.",
  order: "Create an order form with fields for customer name, contact information, product selection, quantity, shipping address, billing address, and payment method. All fields should be required except for special instructions."
};

// Define valid form types to fix TypeScript indexing error
// type FormType = 'contact' | 'event' | 'survey' | 'application' | 'order';

const AIFormIntegration: React.FC = () => {
  // Form creation states
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFields, setGeneratedFields] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedFormType, setSelectedFormType] = useState<FormTemplateKey | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [ollamaSettings, setOllamaSettings] = useState(ollamaConfig);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<any>(null);
  
  // Form answer states
  const [answersMode, setAnswersMode] = useState<'manual' | 'ai'>('manual');
  const [aiContext, setAiContext] = useState('');
  const [responsePreview, setResponsePreview] = useState<any>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [manualResponses, setManualResponses] = useState<Record<string, any>>({});
  
  // Add state for Ollama connection status
  const [ollamaConnectionStatus, setOllamaConnectionStatus] = useState<boolean | null>(null);
  
  const {
    questionsList,
    updateQuestionsList,
    updateFormName,
    updateFormSetting,
    formSettings,
    bottomElementRef,
  } = useFormBuilderContext();

  const ollamaService = new OllamaService(ollamaSettings);

  // Check Ollama connection on component mount and settings change
  useEffect(() => {
    checkOllamaConnection();
  }, [ollamaSettings]);

  const checkOllamaConnection = async () => {
    try {
      setOllamaConnectionStatus(null); // Set to loading state
      const result = await ollamaService.testConnection();
      setOllamaConnectionStatus(result.success);
      if (!result.success) {
        setError(result.message || 'Could not connect to Ollama. Please check your settings.');
      } else {
        setError(null);
      }
    } catch (err) {
      setOllamaConnectionStatus(false);
      setError('Error connecting to Ollama server.');
    }
  };

  // Handle selecting a form type template
  const handleFormTypeSelect = (type: FormTemplateKey) => {
    setSelectedFormType(type);
    const templatePrompt = ollamaService.getFormTemplates()[type].prompt;
    setDescription(templatePrompt);
  };

  // Convert AI-generated fields to Form Builder format
  const convertToFormFields = (fields: any[]): Field[] => {
    return fields.map((field) => {
      const tempId = makeTag(6);
      let type = 'text';
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'number':
          type = field.type;
          break;
        case 'textarea':
          type = 'textbox';
          break;
        case 'select':
        case 'radio':
          type = 'singleselect';
          break;
        case 'checkbox':
          type = 'multiselect';
          break;
        case 'date':
          type = 'date';
          break;
        case 'time':
          type = 'time';
          break;
        default:
          type = 'text';
      }
      
      const fieldSettings = {
        type,
        label: field.label,
        required: field.required,
        options: field.options || [],
        settings: {
          required: field.required
        }
      };
      
      return [
        'field',
        tempId,
        JSON.stringify(fieldSettings),
        field.label || '',
        JSON.stringify(field.options || []),
        JSON.stringify({ required: field.required }),
      ] as Field;
    });
  };

  const handleGenerateForm = async () => {
    if (!description.trim()) {
      setError('Please enter a form description first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedFields([]);

    try {
      let fields;
      let processedDescription = description;
      
      // Extract form requirements more explicitly for complex descriptions
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes('required') || lowerDesc.includes('optional')) {
        // This is a complex description with specific requirements
        // Enhance it with more explicit structure to help the LLM
        processedDescription = `Form Details: ${description}
Form Requirements:
- Required fields: ${lowerDesc.includes('required') ? 'Yes' : 'No'}
- Optional fields: ${lowerDesc.includes('optional') ? 'Yes' : 'No'}`;
        
        if (lowerDesc.includes('name') || lowerDesc.includes('email') || 
            lowerDesc.includes('message') || lowerDesc.includes('food') || 
            lowerDesc.includes('people')) {
          processedDescription += "\nSpecific fields mentioned: ";
          if (lowerDesc.includes('name')) processedDescription += "Name, ";
          if (lowerDesc.includes('email')) processedDescription += "Email, ";
          if (lowerDesc.includes('food')) processedDescription += "Food, ";
          if (lowerDesc.includes('people') || lowerDesc.includes('number of')) 
            processedDescription += "Number of people, ";
          if (lowerDesc.includes('message')) processedDescription += "Message, ";
          
          // Remove trailing comma and space
          processedDescription = processedDescription.replace(/,\s*$/, '');
        }
      }
      
      // Try to use the selected form type first if available
      if (selectedFormType) {
        // For selected form types, use the prompt associated with that type
        const templatePrompt = ollamaService.getFormTemplates()[selectedFormType].prompt;
        // Combine the template with the user's specific requirements
        const combinedPrompt = `${templatePrompt} with the following specific requirements: ${processedDescription}`;
        const response = await ollamaService.generateFormSuggestions(combinedPrompt);
        fields = JSON.parse(response);
      } else {
        // For custom descriptions, use the processed description directly
        const response = await ollamaService.generateFormSuggestions(processedDescription);
        fields = JSON.parse(response);
      }

      if (Array.isArray(fields) && fields.length > 0) {
        // Validate that the required fields from the description are actually marked as required
        const lowerDesc = description.toLowerCase();
        const validatedFields = fields.map(field => {
          const fieldLabel = field.label.toLowerCase();
          
          // Check if this field should be required based on the description
          if (lowerDesc.includes('required') && lowerDesc.includes(fieldLabel.toLowerCase())) {
            const fieldIsExplicitlyOptional = 
              lowerDesc.includes(`${fieldLabel} as optional`) || 
              lowerDesc.includes(`${fieldLabel} is optional`) ||
              lowerDesc.includes(`optional ${fieldLabel}`);
              
            if (!fieldIsExplicitlyOptional) {
              // Mark as required if it matches a field mentioned as required
              field.required = true;
            }
          }
          
          return field;
        });
        
        setGeneratedFields(validatedFields);
        setShowPreview(true);
      } else {
        throw new Error('Invalid response format from Ollama');
      }
    } catch (err) {
      console.error('Error generating form:', err);
      setError('Failed to generate form fields. Please adjust your Ollama settings or try a different description.');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply generated fields to the form builder
  const handleApplyToForm = () => {
    const suggestedName = description.split('.')[0].trim();
    updateFormName(suggestedName);

    const formFields = convertToFormFields(generatedFields);
    updateQuestionsList(formFields);
    
    updateFormSetting({
      ...formSettings,
      description: description
    });
    
    if (bottomElementRef?.current) {
      bottomElementRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    setShowPreview(false);
    setDescription('');
    setSelectedFormType(null);
  };

  // Handle Ollama settings change
  const handleOllamaConfigChange = (config: any) => {
    setOllamaSettings(config);
  };

  // Handle editing a field
  const handleEditField = (index: number) => {
    setEditingFieldIndex(index);
    setEditingField({...generatedFields[index]});
    setIsEditingFields(true);
  };

  // Save edited field
  const handleSaveField = () => {
    if (editingFieldIndex !== null && editingField) {
      const updatedFields = [...generatedFields];
      updatedFields[editingFieldIndex] = editingField;
      setGeneratedFields(updatedFields);
      setIsEditingFields(false);
      setEditingFieldIndex(null);
      setEditingField(null);
    }
  };

  // Handle adding a new field
  const handleAddField = () => {
    setEditingField({
      type: 'text',
      label: '',
      required: false,
      options: []
    });
    setEditingFieldIndex(generatedFields.length);
    setIsEditingFields(true);
  };

  // Handle field deletion
  const handleDeleteField = (index: number) => {
    const updatedFields = [...generatedFields];
    updatedFields.splice(index, 1);
    setGeneratedFields(updatedFields);
  };

  // Handle field option changes
  const handleOptionChange = (optionIndex: number, value: string) => {
    if (!editingField) return;
    
    const options = [...(editingField.options || [])];
    options[optionIndex] = value;
    setEditingField({ ...editingField, options });
  };

  // Add a new option to the field
  const handleAddOption = () => {
    if (!editingField) return;
    
    const options = [...(editingField.options || []), ''];
    setEditingField({ ...editingField, options });
  };

  // Remove an option from the field
  const handleRemoveOption = (optionIndex: number) => {
    if (!editingField) return;
    
    const options = [...(editingField.options || [])];
    options.splice(optionIndex, 1);
    setEditingField({ ...editingField, options });
  };

  // Generate AI responses for form fields
  const generateAIResponses = async () => {
    if (!questionsList.length) {
      return;
    }

    setIsLoading(true);
    try {
      // Convert questionsList to a format the AI can understand
      const formFields = questionsList.map(field => {
        const dataType = field[2];
        const label = field[3];
        const options = JSON.parse(field[4] || '[]');
        const config = JSON.parse(field[5] || '{}');
        
        let type;
        if (typeof dataType === 'string') {
          type = dataType;
        } else {
          try {
            const parsedType = JSON.parse(dataType);
            type = parsedType.type || 'text';
          } catch (e) {
            type = 'text';
          }
        }
        
        return {
          type,
          label,
          options,
          required: config?.required || false
        };
      });
      
      const responses = await ollamaService.generateFormResponse(formFields, aiContext);
      setResponsePreview(responses);
      setManualResponses(responses);
    } catch (error) {
      console.error('Error generating AI responses:', error);
      setError('Failed to generate AI responses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual response changes
  const handleManualResponseChange = (fieldLabel: string, value: any) => {
    setManualResponses(prev => ({
      ...prev,
      [fieldLabel]: value
    }));
    
    // Update the JSON preview as well
    setResponsePreview({
      ...responsePreview,
      [fieldLabel]: value
    });
  };

  // Field edit modal content
  const renderFieldEditModal = () => (
    <Modal
      title="Edit Field"
      open={isEditingFields}
      onCancel={() => {
        setIsEditingFields(false);
        setEditingFieldIndex(null);
        setEditingField(null);
      }}
      onOk={handleSaveField}
      width={600}
    >
      {editingField && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="mb-3">
            <Text strong>Field Label</Text>
            <Input
              value={editingField.label}
              onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
              placeholder="Enter field label"
              className="mb-2"
            />
          </div>
          
          <div className="mb-3">
            <Text strong>Field Type</Text>
            <Select
              value={editingField.type}
              onChange={(value) => setEditingField({ 
                ...editingField, 
                type: value,
                options: value === 'select' || value === 'radio' || value === 'checkbox' 
                  ? (editingField.options || []) 
                  : []
              })}
              className="w-full mb-2"
            >
              <Option value="text">Text</Option>
              <Option value="email">Email</Option>
              <Option value="tel">Phone</Option>
              <Option value="number">Number</Option>
              <Option value="date">Date</Option>
              <Option value="textarea">Paragraph Text</Option>
              <Option value="select">Dropdown</Option>
              <Option value="radio">Radio Buttons</Option>
              <Option value="checkbox">Checkboxes</Option>
            </Select>
          </div>
          
          <div className="mb-3">
            <Checkbox
              checked={editingField.required}
              onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
            >
              Required Field
            </Checkbox>
          </div>
          
          {(editingField.type === 'select' || editingField.type === 'radio' || editingField.type === 'checkbox') && (
            <div className="mb-3">
              <Text strong>Options</Text>
              {(editingField.options || []).map((option: string, index: number) => (
                <div key={index} className="flex mb-2 items-center">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="mr-2"
                  />
                  <Button 
                    danger 
                    icon={<CloseOutlined />} 
                    onClick={() => handleRemoveOption(index)}
                    size="small"
                  />
                </div>
              ))}
              <Button 
                type="dashed" 
                onClick={handleAddOption} 
                className="mt-2"
                icon={<PlusOutlined />}
              >
                Add Option
              </Button>
            </div>
          )}
        </Space>
      )}
    </Modal>
  );

  return (
    <>
      <Card className="mb-6">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4}>
              <RobotOutlined className="mr-2" /> AI Form Builder
            </Title>
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setShowSettingsModal(true)}
            >
              Ollama Settings
            </Button>
          </Space>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            type="card"
          >
            <TabPane tab="Create Form" key="builder">
              {/* Show Ollama connection status */}
              {ollamaConnectionStatus === false && (
                <Alert
                  message="Ollama Connection Error"
                  description="Could not connect to Ollama server. Please check your settings in the Ollama Settings panel."
                  type="error"
                  showIcon
                  action={
                    <Button size="small" onClick={checkOllamaConnection}>
                      Retry Connection
                    </Button>
                  }
                  className="mb-4"
                />
              )}
              
              <Alert
                message="Tips for Better Results"
                description={
                  <Space direction="vertical">
                    <Text>
                      <BulbOutlined className="mr-2" />
                      Include the form title in the first sentence
                    </Text>
                    <Text>
                      <BulbOutlined className="mr-2" />
                      Specify which fields should be required
                    </Text>
                    <Text>
                      <BulbOutlined className="mr-2" />
                      Mention any validation needs (email, phone, etc.)
                    </Text>
                  </Space>
                }
                type="info"
                showIcon
                className="mb-4"
              />
              
              <div className="mb-4">
                <Text strong>Select Form Type</Text>
                <Radio.Group 
                  onChange={(e) => handleFormTypeSelect(e.target.value as FormTemplateKey)} 
                  value={selectedFormType}
                  className="w-full mb-3"
                  buttonStyle="solid"
                >
                  <Space wrap>
                    <Radio.Button value="contact">Contact Form</Radio.Button>
                    <Radio.Button value="event">Event Registration</Radio.Button>
                    <Radio.Button value="survey">Feedback Survey</Radio.Button>
                    <Radio.Button value="application">Application Form</Radio.Button>
                    <Radio.Button value="order">Order Form</Radio.Button>
                  </Space>
                </Radio.Group>

                <Text strong>Form Description</Text>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the form you want to create. Be specific about fields, required fields, and any special requirements."
                  rows={4}
                  className="mb-4"
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
                
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={handleGenerateForm}
                  loading={isLoading}
                  block
                >
                  {isLoading ? 'Generating Form...' : 'Generate Form'}
                </Button>
              </div>
              
              {showPreview && generatedFields.length > 0 && (
                <div>
                  <Collapse defaultActiveKey={['1']}>
                    <Panel 
                      header="Generated Form Fields" 
                      key="1"
                      extra={
                        <Button 
                          type="text" 
                          icon={<PlusOutlined />} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddField();
                          }}
                        >
                          Add Field
                        </Button>
                      }
                    >
                      <div className="mb-4">
                        <List
                          itemLayout="horizontal"
                          dataSource={generatedFields}
                          renderItem={(field, index) => (
                            <List.Item
                              actions={[
                                <Button 
                                  key="edit" 
                                  icon={<EditOutlined />} 
                                  onClick={() => handleEditField(index)}
                                >
                                  Edit
                                </Button>,
                                <Button 
                                  key="delete" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  onClick={() => handleDeleteField(index)}
                                >
                                  Delete
                                </Button>
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <Space>
                                    <Text strong>{field.label}</Text>
                                    <Text type="secondary">({field.type})</Text>
                                    {field.required && <Text type="danger">*</Text>}
                                  </Space>
                                }
                                description={
                                  field.options && field.options.length > 0 && (
                                    <div className="mt-1">
                                      <Text type="secondary">Options: </Text>
                                      {field.options.map((option: string, optIdx: number) => (
                                        <Tag key={optIdx} color="blue">{option}</Tag>
                                      ))}
                                    </div>
                                  )
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </div>
                    </Panel>
                  </Collapse>
                  
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="primary"
                      icon={<FormOutlined />}
                      onClick={handleApplyToForm}
                      className="mt-2"
                    >
                      Apply to Form
                    </Button>
                  </div>
                </div>
              )}
            </TabPane>
            
            <TabPane tab="Answer Form" key="answers">
              {questionsList.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div className="mb-4">
                    <Radio.Group 
                      value={answersMode} 
                      onChange={(e) => setAnswersMode(e.target.value)}
                      buttonStyle="solid"
                    >
                      <Radio.Button value="manual">Manual Answers</Radio.Button>
                      <Radio.Button value="ai">AI Generated Answers</Radio.Button>
                    </Radio.Group>
                  </div>
                  
                  {answersMode === 'ai' && (
                    <div className="mb-4">
                      <Text strong>Context for AI Responses</Text>
                      <TextArea
                        value={aiContext}
                        onChange={(e) => setAiContext(e.target.value)}
                        placeholder="Provide context for the AI to generate relevant responses. Example: 'John is a 35-year-old software engineer interested in AI workshops.'"
                        rows={3}
                        className="mb-2"
                      />
                      <Button 
                        type="primary" 
                        onClick={generateAIResponses}
                        loading={isLoading}
                        icon={<RobotOutlined />}
                      >
                        Generate AI Responses
                      </Button>
                    </div>
                  )}
                  
                  <Divider orientation="left">Form Answers</Divider>
                  
                  {questionsList.map((field, index) => {
                    const label = field[3];
                    const options = JSON.parse(field[4] || '[]');
                    const config = JSON.parse(field[5] || '{}');
                    const fieldType = field[2]; // This might be JSON or a string
                    let type = typeof fieldType === 'string' ? fieldType : JSON.parse(fieldType)?.type || 'text';
                    
                    return (
                      <div key={index} className="mb-4">
                        <Text strong>
                          {label}
                          {config.required && <Text type="danger"> *</Text>}
                        </Text>
                        
                        {type === 'singleselect' && options.length > 0 && (
                          <Select
                            className="w-full"
                            value={manualResponses[label] || undefined}
                            onChange={(value) => handleManualResponseChange(label, value)}
                            placeholder={`Select ${label}`}
                          >
                            {options.map((option: string, optIdx: number) => (
                              <Option key={optIdx} value={option}>{option}</Option>
                            ))}
                          </Select>
                        )}
                        
                        {type === 'multiselect' && options.length > 0 && (
                          <div>
                            {options.map((option: string, optIdx: number) => (
                              <div key={optIdx}>
                                <Checkbox
                                  checked={manualResponses[label]?.includes(option)}
                                  onChange={(e) => {
                                    const currentValues = manualResponses[label] || [];
                                    let newValues;
                                    
                                    if (e.target.checked) {
                                      newValues = [...currentValues, option];
                                    } else {
                                      newValues = currentValues.filter((val: string) => val !== option);
                                    }
                                    
                                    handleManualResponseChange(label, newValues);
                                  }}
                                >
                                  {option}
                                </Checkbox>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {type === 'textbox' && (
                          <TextArea
                            rows={3}
                            value={manualResponses[label] || ''}
                            onChange={(e) => handleManualResponseChange(label, e.target.value)}
                            placeholder={`Enter ${label}`}
                          />
                        )}
                        
                        {(type === 'text' || type === 'email' || type === 'tel' || type === 'number') && (
                          <Input
                            type={type}
                            value={manualResponses[label] || ''}
                            onChange={(e) => handleManualResponseChange(label, e.target.value)}
                            placeholder={`Enter ${label}`}
                          />
                        )}
                        
                        {type === 'date' && (
                          <Input
                            type="date"
                            value={manualResponses[label] || ''}
                            onChange={(e) => handleManualResponseChange(label, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => setShowJsonPreview(true)}
                    >
                      View JSON Response
                    </Button>
                  </div>
                </Space>
              ) : (
                <Alert
                  message="No Form Fields"
                  description="Please create a form first by adding fields or using the AI Form Builder."
                  type="info"
                  showIcon
                />
              )}
            </TabPane>
          </Tabs>
        </Space>
      </Card>
      
      {/* Ollama Settings Modal */}
      <Modal
        title={<><SettingOutlined className="mr-2" /> Ollama Configuration</>}
        open={showSettingsModal}
        onCancel={() => setShowSettingsModal(false)}
        footer={null}
        width={600}
      >
        <OllamaSettings onConfigChange={handleOllamaConfigChange} />
      </Modal>
      
      {/* Field Edit Modal */}
      {renderFieldEditModal()}
      
      {/* JSON Preview Drawer */}
      <Drawer
        title={<><CodeOutlined className="mr-2" /> JSON Response Preview</>}
        placement="right"
        onClose={() => setShowJsonPreview(false)}
        open={showJsonPreview}
        width={400}
      >
        {responsePreview ? (
          <ReactJson 
            src={responsePreview} 
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

export default AIFormIntegration;
