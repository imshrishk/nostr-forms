import React, { useState } from 'react';
import { Button, Card, Input, Typography, Alert, Space, Collapse, Spin } from 'antd';
import { RobotOutlined, BulbOutlined, FormOutlined } from '@ant-design/icons';
import OllamaService from '../../../../services/ollama';
import ollamaConfig from '../../../../config/ollama';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import { makeTag } from '../../../../utils/utility';
import { Field } from '../../../../nostr/types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const AIFormIntegration: React.FC = () => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFields, setGeneratedFields] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const {
    questionsList,
    updateQuestionsList,
    updateFormName,
    updateFormSetting,
    formSettings,
    bottomElementRef,
  } = useFormBuilderContext();

  const ollamaService = new OllamaService(ollamaConfig);

  const handleGenerateForm = async () => {
    if (!description.trim()) {
      setError('Please provide a description of the form you want to create');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowPreview(false);

    try {
      const formName = description.split('.')[0].trim();
      
      const response = await ollamaService.generateFormSuggestions(description);
      const fields = JSON.parse(response);
      
      setGeneratedFields(fields);
      setShowPreview(true);
    } catch (err) {
      setError('Failed to generate form fields. Please try again.');
      console.error('Error generating form fields:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyToForm = () => {
    const suggestedName = description.split('.')[0].trim();
    updateFormName(suggestedName);

    const formFields: Field[] = generatedFields.map((field) => {
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
      ];
    });
    
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
  };

  return (
    <Card className="mb-6">
      <Title level={4}>
        <RobotOutlined className="mr-2" /> AI Form Builder
      </Title>
      <Paragraph type="secondary">
        Describe the form you want to create and let AI generate it for you. Be specific about the fields you need.
      </Paragraph>
      
      <div className="mb-4">
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
        
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: Conference Registration Form. Create a form for a tech conference with fields for name, email, company, job title, and dietary preferences. Email and name should be required."
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
            <Panel header="Generated Form Fields" key="1">
              <div className="mb-4">
                <ul className="list-disc pl-6">
                  {generatedFields.map((field, index) => (
                    <li key={index} className="mb-2">
                      <Text strong>{field.label}</Text>
                      <Text type="secondary"> ({field.type})</Text>
                      {field.required && <Text type="danger"> *</Text>}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </Collapse>
          
          <div className="mt-4 flex justify-end">
            <Button
              type="primary"
              icon={<FormOutlined />}
              onClick={applyToForm}
              className="mt-2"
            >
              Apply to Form Builder
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AIFormIntegration;
