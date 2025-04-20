import React, { useState } from 'react';
import OllamaService from '../services/ollama';
import ollamaConfig from '../config/ollama';
import { Button, Input, Alert, Space, Typography, List } from 'antd';
import { RobotOutlined, BulbOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface AIFormFillerProps {
  formFields: any[];
  onResponseGenerated: (responses: Record<string, any>) => void;
}

const AIFormFiller: React.FC<AIFormFillerProps> = ({
  formFields,
  onResponseGenerated,
}) => {
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ollamaService = new OllamaService(ollamaConfig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const responses = await ollamaService.generateFormResponse(formFields, context);
      onResponseGenerated(responses);
    } catch (err) {
      setError('Failed to generate form responses. Please try again.');
      console.error('Error generating form responses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Form Fields to be Filled"
        description={
          <List
            size="small"
            dataSource={formFields}
            renderItem={(field) => (
              <List.Item>
                <Text>
                  {field.label} ({field.type})
                  {field.required && <Text type="danger"> *</Text>}
                </Text>
              </List.Item>
            )}
          />
        }
        type="info"
        showIcon
        className="mb-4"
      />

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="context"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Provide context for AI to fill the form
          </label>
          <TextArea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Example: Fill this registration form for John Doe, a software engineer at Acme Corp. His email is john.doe@acme.com. He wants to attend the morning sessions and prefers workshops on React and TypeScript."
            rows={6}
            className="w-full"
          />
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
          />
        )}

        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          icon={<RobotOutlined />}
          size="large"
          block
        >
          {isLoading ? 'Generating Form Responses...' : 'Generate Form Responses'}
        </Button>
      </form>
    </div>
  );
};

export default AIFormFiller;
