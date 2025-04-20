import React, { useState } from 'react';
import OllamaService from '../services/ollama';
import ollamaConfig from '../config/ollama';
import { Button, Input, Alert, Space, Typography } from 'antd';
import { RobotOutlined, BulbOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface AIFormBuilderProps {
  onFieldsGenerated: (fields: any[]) => void;
}

const AIFormBuilder: React.FC<AIFormBuilderProps> = ({ onFieldsGenerated }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ollamaService = new OllamaService(ollamaConfig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await ollamaService.generateFormSuggestions(description);
      const fields = JSON.parse(response);
      onFieldsGenerated(fields);
    } catch (err) {
      setError('Failed to generate form fields. Please try again.');
      console.error('Error generating form fields:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Tips for Better Results"
        description={
          <Space direction="vertical">
            <Text>
              <BulbOutlined className="mr-2" />
              Be specific about the type of form you want to create
            </Text>
            <Text>
              <BulbOutlined className="mr-2" />
              Mention all the fields you need
            </Text>
            <Text>
              <BulbOutlined className="mr-2" />
              Specify which fields should be required
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
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Describe your form
          </label>
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: I need a registration form for a tech conference with fields for name, email, company, and session preferences. All fields should be required except for company."
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
          {isLoading ? 'Generating Form Fields...' : 'Generate Form Fields'}
        </Button>
      </form>
    </div>
  );
};

export default AIFormBuilder;
