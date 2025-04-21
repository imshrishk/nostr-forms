import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Typography, 
  Select, 
  Alert, 
  Space, 
  Divider,
  Collapse,
  Badge,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import { 
  RobotOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import OllamaService from '../../services/ollama';
import ollamaConfig from '../../config/ollama';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

interface OllamaSettingsProps {
  onConfigChange?: (config: any) => void;
}

const OllamaSettings: React.FC<OllamaSettingsProps> = ({ onConfigChange }) => {
  const [serverUrl, setServerUrl] = useState(ollamaConfig.baseUrl);
  const [selectedModel, setSelectedModel] = useState(ollamaConfig.model);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState<string>("0.7");
  const [maxTokens, setMaxTokens] = useState<string>("2048");

  // Create a new instance with updated settings
  const getOllamaService = () => {
    return new OllamaService({
      ...ollamaConfig,
      baseUrl: serverUrl,
      model: selectedModel,
    });
  };

  useEffect(() => {
    // Automatically test connection on mount with a slight delay
    const timer = setTimeout(() => {
      fetchModels();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Update config when values change
    const updatedConfig = {
      ...ollamaConfig,
      baseUrl: serverUrl,
      model: selectedModel,
    };
    
    if (onConfigChange) {
      onConfigChange(updatedConfig);
    }
  }, [serverUrl, selectedModel]);

  const testConnection = async () => {
    setIsLoading(true);
    setConnectionMessage('');
    setIsConnected(null);

    const ollamaService = getOllamaService();

    try {
      // Use the updated testConnection method that returns an object
      const result = await ollamaService.testConnection();
      setIsConnected(result.success);
      setConnectionMessage(result.message);
      
      if (result.success && result.availableModels && result.availableModels.length > 0) {
        setAvailableModels(result.availableModels);
        // Update selected model if current one isn't available
        if (result.availableModels.indexOf(selectedModel) === -1) {
          setSelectedModel(result.availableModels[0]);
        }
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionMessage('Error testing connection to Ollama server');
      console.error('Connection test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    
    try {
      const ollamaService = getOllamaService();
      const result = await ollamaService.testConnection();
      
      if (result.success && result.availableModels && result.availableModels.length > 0) {
        setAvailableModels(result.availableModels);
        setIsConnected(true);
        
        // Auto-select first available model if current isn't available
        if (result.availableModels.indexOf(selectedModel) === -1) {
          setSelectedModel(result.availableModels[0]);
        }
      } else {
        setAvailableModels([]);
        setIsConnected(false);
        setConnectionMessage(result.message);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
      setIsConnected(false);
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <Card className="mb-4">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center">
          <Title level={4} style={{ margin: 0 }}>
            <RobotOutlined className="mr-2" /> Ollama Settings
          </Title>
          {isConnected === true && (
            <Badge status="success" text="Connected" />
          )}
          {isConnected === false && (
            <Badge status="error" text="Disconnected" />
          )}
          {isConnected === null && (
            <Badge status="processing" text="Checking..." />
          )}
        </Space>

        <Paragraph type="secondary">
          Configure your connection to Ollama for AI-powered form creation and field completion.
        </Paragraph>

        <div className="mb-3">
          <Text strong>Ollama Server URL</Text>
          <Input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://127.0.0.1:11434"
            addonBefore="URL"
            className="mb-2"
          />
          <Text type="secondary">
            <InfoCircleOutlined className="mr-1" />
            Default is http://127.0.0.1:11434 for local Ollama installations
          </Text>
        </div>

        <div className="mb-3">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text strong>Models</Text>
            <Button 
              size="small" 
              icon={<SyncOutlined />} 
              onClick={fetchModels}
              loading={loadingModels}
            >
              Refresh Models
            </Button>
          </Space>
          
          {loadingModels ? (
            <div style={{ padding: '10px 0', textAlign: 'center' }}>
              <Spin size="small" /> <Text>Loading available models...</Text>
            </div>
          ) : availableModels.length > 0 ? (
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              className="w-full mb-2"
              loading={isLoading}
            >
              {availableModels.map(model => (
                <Option key={model} value={model}>{model}</Option>
              ))}
            </Select>
          ) : (
            <div style={{ marginBottom: '10px' }}>
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="No models found" 
                style={{ padding: '10px 0' }}
              />
            </div>
          )}
          
          <Text type="secondary">
            <InfoCircleOutlined className="mr-1" />
            Install models with: <code>ollama pull llama2</code> (or another model name)
          </Text>
        </div>

        <Button
          type="primary"
          onClick={testConnection}
          loading={isLoading}
          icon={<ReloadOutlined />}
        >
          Test Connection
        </Button>

        {connectionMessage && (
          <Alert
            message={isConnected ? "Connection Successful" : "Connection Failed"}
            description={connectionMessage}
            type={isConnected ? "success" : "error"}
            showIcon
            icon={isConnected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          />
        )}

        <Divider style={{ margin: '12px 0' }} />

        <Collapse ghost>
          <Panel 
            header={
              <span>
                <SettingOutlined className="mr-2" />
                Advanced Settings
              </span>
            } 
            key="advanced"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="mb-3">
                <Text strong>Response Temperature</Text>
                <Tooltip title="Controls randomness: lower values make responses more deterministic (0.0-1.0)">
                  <Select
                    value={temperature}
                    onChange={setTemperature}
                    className="w-full mb-2"
                  >
                    <Option value="0.1">0.1 - Very focused</Option>
                    <Option value="0.5">0.5 - Balanced</Option>
                    <Option value="0.7">0.7 - Default</Option>
                    <Option value="0.9">0.9 - Creative</Option>
                  </Select>
                </Tooltip>
              </div>
              
              <div className="mb-3">
                <Text strong>Max Tokens</Text>
                <Tooltip title="Maximum length of response">
                  <Select
                    value={maxTokens}
                    onChange={setMaxTokens}
                    className="w-full mb-2"
                  >
                    <Option value="512">512 - Short</Option>
                    <Option value="1024">1024 - Medium</Option>
                    <Option value="2048">2048 - Default</Option>
                    <Option value="4096">4096 - Long</Option>
                  </Select>
                </Tooltip>
              </div>
            </Space>
          </Panel>
        </Collapse>
      </Space>
    </Card>
  );
};

export default OllamaSettings; 