// packages/formstr-app/src/containers/FormFillerNew/AIAssistant/index.tsx
import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Typography, Spin, Alert, Card, Space } from 'antd';
import { RobotOutlined, BulbOutlined, SettingOutlined } from '@ant-design/icons';
import { useOllama } from '../../../providers/OllamaProvider';
import OllamaSettingsModal from '../../../components/OllamaSettingsModal';
import styled from 'styled-components';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

const AssistantButton = styled(Button)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  height: 48px;
  width: 48px;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

interface AIAssistantProps {
  formTitle: string;
  formDescription?: string;
  currentQuestion?: string;
  questionType?: string;
  onSuggestion?: (suggestion: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  formTitle,
  formDescription,
  currentQuestion,
  questionType,
  onSuggestion,
}) => {
  const { isConfigured, generateText, isLoading } = useOllama();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [generating, setGenerating] = useState(false);
  
  const openAssistant = () => {
    setIsOpen(true);
  };
  
  const closeAssistant = () => {
    setIsOpen(false);
  };
  
  const generateSuggestion = async () => {
    if (!currentQuestion) return;
    
    setGenerating(true);
    
    const prompt = `You are an AI assistant helping someone fill out a form. Based on the information provided, suggest an appropriate response to the current question.
    
    Form Title: "${formTitle}"
    Form Description: "${formDescription || 'Not provided'}"
    Current Question: "${currentQuestion}"
    Question Type: "${questionType || 'text'}"
    User Context: "${userContext}"
    
    Provide a concise, appropriate response to this question based on the context. 
    If the question is subjective or you don't have enough information, make a reasonable suggestion that the user can modify.
    
    Response:`;
    
    try {
      const response = await generateText(prompt);
      setSuggestion(response.trim());
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
    } finally {
      setGenerating(false);
    }
  };
  
  const applySuggestion = () => {
    if (onSuggestion && suggestion) {
      onSuggestion(suggestion);
      closeAssistant();
    }
  };
  
  useEffect(() => {
    // Clear suggestion when modal is opened
    if (isOpen) {
      setSuggestion('');
    }
  }, [isOpen]);
  
  return (
    <>
      <AssistantButton
        type="primary"
        icon={<RobotOutlined />}
        onClick={openAssistant}
        title="AI Assist"
      />
      
      <Modal
        title={
          <Space align="center">
            <RobotOutlined />
            <span>AI Form Assistant</span>
          </Space>
        }
        open={isOpen}
        onCancel={closeAssistant}
        footer={null}
        width={600}
      >
        {!isConfigured ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="Ollama Not Configured"
              description="You need to configure your Ollama connection to use the AI assistant."
              type="warning"
              showIcon
            />
            <Button 
              type="primary" 
              icon={<SettingOutlined />}
              onClick={() => setSettingsOpen(true)}
            >
              Configure Ollama
            </Button>
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {currentQuestion ? (
              <>
                <Card title="Current Question" size="small">
                  <Paragraph>{currentQuestion}</Paragraph>
                </Card>
                
                <Title level={5}>Provide some context</Title>
                <Paragraph>
                  Tell the AI about yourself or provide relevant information to help it generate a better response.
                </Paragraph>
                
                <TextArea
                  placeholder="e.g., I'm a software developer with 5 years of experience..."
                  rows={4}
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                
                <Button
                  type="primary"
                  icon={<BulbOutlined />}
                  onClick={generateSuggestion}
                  loading={generating}
                  block
                >
                  Generate Suggestion
                </Button>
                
                {generating && (
                  <div style={{ textAlign: 'center', margin: '16px 0' }}>
                    <Spin />
                    <Text>Thinking...</Text>
                  </div>
                )}
                
                {suggestion && (
                  <Card 
                    title="AI Suggestion" 
                    size="small"
                    style={{ marginTop: 16 }}
                    extra={
                      <Button type="primary" size="small" onClick={applySuggestion}>
                        Use This
                      </Button>
                    }
                  >
                    <Paragraph>{suggestion}</Paragraph>
                  </Card>
                )}
              </>
            ) : (
              <Alert
                message="No Active Question"
                description="Please focus on a field in the form to get AI assistance."
                type="info"
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>
      
      <OllamaSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};

export default AIAssistant;
