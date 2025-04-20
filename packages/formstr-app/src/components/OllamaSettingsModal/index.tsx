import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Select, Alert, Typography, Space, Spin } from 'antd';
import { useOllama } from '../../providers/OllamaProvider';
import styled from 'styled-components';

const { Title, Text } = Typography;
const { Option } = Select;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

interface OllamaSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({ visible, onClose }) => {
  const {
    isConnected,
    isLoading,
    error,
    baseUrl,
    models,
    selectedModel,
    connect,
    disconnect,
    setSelectedModel,
    fetchModels,
  } = useOllama();

  const [url, setUrl] = useState(baseUrl);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (visible && isConnected) {
      fetchModels();
    }
  }, [visible, isConnected]);

  const handleConnect = async () => {
    await connect(url);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title={<Title level={4}>Ollama Settings</Title>}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      <SettingsContainer>
        {error && <Alert message={error} type="error" showIcon />}
        
        <InputGroup>
          <Text strong>Ollama API URL</Text>
          <Space>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:11434"
              disabled={isConnected || isLoading}
              style={{ width: 300 }}
            />
            {isConnected ? (
              <Button onClick={handleDisconnect} danger>
                Disconnect
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={handleConnect} 
                loading={isLoading}
              >
                Connect
              </Button>
            )}
          </Space>
          <Text type="secondary">
            Enter the URL where your Ollama instance is running
          </Text>
        </InputGroup>
        
        {isConnected && (
          <InputGroup>
            <Text strong>Select Model</Text>
            <Select
              value={selectedModel}
              onChange={handleModelChange}
              style={{ width: 300 }}
              loading={isLoading}
            >
              {models.map(model => (
                <Option key={model} value={model}>{model}</Option>
              ))}
            </Select>
            <Text type="secondary">
              Choose the AI model to use for form generation and filling
            </Text>
            <Button 
              onClick={fetchModels} 
              type="link" 
              style={{ width: 150 }}
            >
              Refresh Models
            </Button>
          </InputGroup>
        )}
        
        <div style={{ marginTop: 20 }}>
          <Button type="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      </SettingsContainer>
    </Modal>
  );
};

export default OllamaSettingsModal;
