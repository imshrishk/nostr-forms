import React, { useState } from 'react';
import { Modal, Button, Typography, Spin, List, Alert, Space, Card, Tag } from 'antd';
import { ToolOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useOllama } from '../../providers/OllamaProvider';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import styled from 'styled-components';

const { Title, Paragraph, Text } = Typography;

const StyledList = styled(List)`
  margin-top: 16px;
  max-height: 400px;
  overflow-y: auto;
`;

const SuggestionCard = styled(Card)`
  margin-bottom: 16px;
  border-left: 3px solid #1890ff;
`;

interface AIFormImproverProps {
  visible: boolean;
  onClose: () => void;
}

interface FormSuggestion {
  id: string;
  type: 'improvement' | 'warning' | 'tip';
  text: string;
  implemented: boolean;
}

const AIFormImprover: React.FC<AIFormImproverProps> = ({ visible, onClose }) => {
  const { generateText, isLoading } = useOllama();
  const { formName, formSettings, questionsList } = useFormBuilderContext();
  
  const [suggestions, setSuggestions] = useState<FormSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  
  const analyzeForm = async () => {
    setAnalyzing(true);
    
    // Construct the form representation
    const formQuestions = questionsList.map(q => q[3] || '').filter(q => q);
    
    const prompt = `You are a form design expert. Analyze the following form and provide specific suggestions to improve its quality, usability, and effectiveness.
    
    Form Title: "${formName}"
    Form Description: "${formSettings.description || 'No description provided'}"
    
    Form Questions:
    ${formQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
    
    Provide 5-7 specific improvement suggestions. Each suggestion should be one paragraph and focus on:
    1. Clarity and wording of questions
    2. Flow and organization
    3. Missing important questions
    4. Redundant or unnecessary questions
    5. Best practices for form design
    
    Format each suggestion as a separate paragraph with no numbers or bullets.
    Each suggestion should be actionable and specific to this form.`;
    
    try {
      const response = await generateText(prompt);
      const suggestionList = response
        .split('\n\n')
        .filter(para => para.trim().length > 0)
        .map((text, index) => {
          let type: 'improvement' | 'warning' | 'tip' = 'improvement';
          
          if (text.toLowerCase().includes('warning') || 
              text.toLowerCase().includes('problem') ||
              text.toLowerCase().includes('issue')) {
            type = 'warning';
          } else if (text.toLowerCase().includes('tip') ||
                     text.toLowerCase().includes('consider')) {
            type = 'tip';
          }
          
          return {
            id: `sug-${Date.now()}-${index}`,
            type,
            text: text.trim(),
            implemented: false,
          };
        });
      
      setSuggestions(suggestionList);
    } catch (error) {
      console.error('Failed to analyze form:', error);
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleToggleImplemented = (id: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, implemented: !s.implemented } : s)
    );
  };
  
  const handleClose = () => {
    onClose();
  };
  
  // Initial analysis when modal becomes visible
  React.useEffect(() => {
    if (visible && questionsList.length > 0 && suggestions.length === 0) {
      analyzeForm();
    }
  }, [visible, questionsList]);
  
  const getTagColor = (type: string): string => {
    switch (type) {
      case 'improvement': return 'blue';
      case 'warning': return 'red';
      case 'tip': return 'green';
      default: return 'default';
    }
  };
  
  return (
    <Modal
      title={
        <Space align="center">
          <ToolOutlined />
          <span>AI Form Analysis</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="refresh" onClick={analyzeForm} disabled={analyzing}>
          Refresh Analysis
        </Button>,
        <Button key="close" type="primary" onClick={handleClose}>
          Close
        </Button>,
      ]}
      width={700}
    >
      {questionsList.length === 0 ? (
        <Alert
          message="Empty Form"
          description="Add some questions to your form first before running an analysis."
          type="info"
          showIcon
        />
      ) : (
        <>
          <Paragraph>
            The AI has analyzed your form and provided the following suggestions to improve it.
            Mark suggestions as implemented as you address them.
          </Paragraph>
          
          {analyzing ? (
            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                Analyzing your form...
              </Paragraph>
            </div>
          ) : (
            <>
              {suggestions.length === 0 ? (
                <Alert
                  message="No Analysis Available"
                  description="There was an error analyzing your form. Please try again."
                  type="warning"
                  showIcon
                />
              ) : (
                <StyledList
                  dataSource={suggestions}
                  renderItem={item => (
                    <SuggestionCard
                      style={{
                        opacity: item.implemented ? 0.7 : 1,
                        borderLeftColor: item.implemented ? '#52c41a' : undefined,
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <Tag color={getTagColor(item.type)}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </Tag>
                          <Button
                            type={item.implemented ? 'primary' : 'default'}
                            size="small"
                            icon={item.implemented ? <CheckOutlined /> : <CloseOutlined />}
                            onClick={() => handleToggleImplemented(item.id)}
                          >
                            {item.implemented ? 'Implemented' : 'Mark as Implemented'}
                          </Button>
                        </Space>
                        <Paragraph
                          style={{
                            textDecoration: item.implemented ? 'line-through' : 'none',
                          }}
                        >
                          {item.text}
                        </Paragraph>
                      </Space>
                    </SuggestionCard>
                  )}
                />
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
};

export default AIFormImprover;
