// packages/formstr-app/src/components/OllamaSettingsModal/index.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select, Typography, Alert, Space } from 'antd';
import { useOllama } from '../../providers/OllamaProvider';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface OllamaSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({ visible, onClose }) => {
  const { 
    baseUrl, 
    setBaseUrl, 
    model, 
    setModel, 
    availableModels, 
    fetchModels, 
    testConnection,
    connectionStatus,
    isLoading
  } = useOllama();
  
  const [form] = Form.useForm();
  const [testingConnection, setTestingConnection] = useState(false);
  
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        baseUrl,
        model,
      });
    }
  }, [visible, baseUrl, model, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      setBaseUrl(values.baseUrl);
      setModel(values.model);
      onClose();
    });
  };

  const handleTestConnection = async () => {
    const url = form.getFieldValue('baseUrl');
    setTestingConnection(true);
    await testConnection(url);
    setTestingConnection(false);
  };

  const handleFetchModels = async () => {
    const url = form.getFieldValue('baseUrl');
    await fetchModels(url);
  };

  return (
    <Modal
      title="Ollama Settings"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="test" onClick={handleTestConnection} loading={testingConnection}>
          Test Connection
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk}>
          Save
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5}>Configure Your Ollama Instance</Title>
        <Paragraph>
          Formstr can connect to your self-hosted Ollama instance to provide AI-powered
          features for form creation and responses.
        </Paragraph>

        {connectionStatus === 'success' && (
          <Alert
            message="Connection Successful"
            description="Your Ollama instance is connected and ready to use."
            type="success"
            showIcon
          />
        )}

        {connectionStatus === 'error' && (
          <Alert
            message="Connection Failed"
            description="Could not connect to your Ollama instance. Please check the URL and ensure Ollama is running."
            type="error"
            showIcon
          />
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            baseUrl,
            model,
          }}
        >
          <Form.Item
            label="Ollama Server URL"
            name="baseUrl"
            rules={[{ required: true, message: 'Please enter your Ollama server URL' }]}
            extra="The base URL of your Ollama instance, e.g., http://localhost:11434"
          >
            <Input placeholder="http://localhost:11434" />
          </Form.Item>

          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleFetchModels} loading={isLoading}>
              Fetch Available Models
            </Button>
          </Space>

          <Form.Item
            label="Model"
            name="model"
            rules={[{ required: true, message: 'Please select a model' }]}
          >
            <Select
              placeholder="Select a model"
              loading={isLoading}
              disabled={availableModels.length === 0}
            >
              {availableModels.map((modelName) => (
                <Option key={modelName} value={modelName}>
                  {modelName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        <Paragraph type="secondary">
          Note: To use Ollama, you must have it installed and running on your server or local machine.
          Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> to learn more.
        </Paragraph>
      </Space>
    </Modal>
  );
};

export default OllamaSettingsModal;
