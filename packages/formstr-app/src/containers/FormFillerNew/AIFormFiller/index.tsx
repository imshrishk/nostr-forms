import React, { useState } from 'react';
import { Button, Card, Input, Typography, Alert, Space, Collapse, Modal, Spin } from 'antd';
import { RobotOutlined, BulbOutlined, CheckOutlined } from '@ant-design/icons';
import OllamaService from '../../../services/ollama';
import ollamaConfig from '../../../config/ollama';
import { Field, Response } from '@formstr/sdk/dist/formstr/nip101';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AIFormFillerProps {
  fields: Field[];
  onResponsesGenerated: (responses: Record<string, [string, string | undefined]>) => void;
}

const AIFormFiller: React.FC<AIFormFillerProps> = ({ fields, onResponsesGenerated }) => {
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [generatedResponses, setGeneratedResponses] = useState<Record<string, any>>({});

  const ollamaService = new OllamaService(ollamaConfig);

  const handleGenerateResponses = async () => {
    if (!context.trim()) {
      setError('Please provide context for generating form responses');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert fields to a simpler format for AI processing
      const simplifiedFields = fields.map(field => {
        const [placeholder, fieldId, typeData, label, optionsString, config] = field;
        const fieldConfig = JSON.parse(config);
        const options = JSON.parse(optionsString || '[]');
        
        return {
          id: fieldId,
          label,
          type: fieldConfig.type || 'text',
          required: fieldConfig.required || false,
          options: options.map((opt: any) => opt[1])
        };
      });

      const responses = await ollamaService.generateFormResponse(simplifiedFields, context);
      setGeneratedResponses(responses);
      setIsModalVisible(true);
    } catch (err) {
      setError('Failed to generate form responses. Please try again.');
      console.error('Error generating form responses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyResponses = () => {
    const formattedResponses: Record<string, [string, string | undefined]> = {};
    
    fields.forEach(field => {
      const [placeholder, fieldId, typeData, label] = field;
      
      if (generatedResponses[label]) {
        formattedResponses[fieldId] = [generatedResponses[label].toString(), undefined];
      }
    });
    
    onResponsesGenerated(formattedResponses);
    setIsModalVisible(false);
  };

  const fieldsPreview = fields.map(field => {
    const [placeholder, fieldId, typeData, label, optionsString, config] = field;
    const fieldConfig = JSON.parse(config);
    
    return (
      <li key={label} className="mb-2">
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
        onClick={() => setIsModalVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        Fill with AI
      </Button>
      
      <Modal
        title={
          <div>
            <RobotOutlined className="mr-2" /> AI Form Filler
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={550}
      >
        <div className="mb-4">
          <Paragraph type="secondary">
            Describe the context for filling this form and let AI generate responses for you.
          </Paragraph>
          
          <Collapse defaultActiveKey={['1']} className="mb-4">
            <Panel header="Form Fields to be Filled" key="1">
              <ul className="list-disc pl-6">
                {fieldsPreview}
              </ul>
            </Panel>
          </Collapse>
          
          <Alert
            message="Tips for Better Results"
            description={
              <Space direction="vertical">
                <Text>
                  <BulbOutlined className="mr-2" />
                  Provide specific details about the person or situation
                </Text>
                <Text>
                  <BulbOutlined className="mr-2" />
                  Include relevant information for each field
                </Text>
                <Text>
                  <BulbOutlined className="mr-2" />
                  Be clear about preferences or requirements
                </Text>
              </Space>
            }
            type="info"
            showIcon
            className="mb-4"
          />
          
          <TextArea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Example: Fill this form for John Doe, a software engineer at Acme Corp. His email is john.doe@acme.com. He's interested in AI and machine learning."
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
          
          {Object.keys(generatedResponses).length > 0 ? (
            <div className="mb-4">
              <Alert
                message="Generated Responses"
                description={
                  <ul className="list-disc pl-6">
                    {Object.entries(generatedResponses).map(([field, value]) => (
                      <li key={field} className="mb-1">
                        <Text strong>{field}:</Text> {value.toString()}
                      </li>
                    ))}
                  </ul>
                }
                type="success"
                showIcon
                className="mb-4"
              />
              
              <div className="flex justify-end">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={applyResponses}
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
              block
            >
              {isLoading ? 'Generating Responses...' : 'Generate Responses'}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AIFormFiller;
