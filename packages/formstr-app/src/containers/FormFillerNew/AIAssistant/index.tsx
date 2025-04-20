import React, { useState, useEffect } from 'react';
import { Button, Spin, Alert, Tooltip, Typography, Drawer, Input, Space } from 'antd';
import { RobotOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useOllama } from '../../../providers/OllamaProvider';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const AIButton = styled(Button)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;

  .anticon {
    font-size: 24px;
  }
`;

interface AIAssistantProps {
  formTitle: string;
  formDescription?: string;
  questions: Array<{
    id: string;
    text: string;
    type: string; 
    options?: Array<{ label: string; value: string }>;
  }>;
  onSuggestAnswer: (questionId: string, answer: string | string[]) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  formTitle, 
  formDescription, 
  questions,
  onSuggestAnswer
}) => {
  const { ollamaService, isConnected } = useOllama();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [suggestedAnswers, setSuggestedAnswers] = useState<Record<string, string | string[]>>({});

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  const formatFormContent = () => {
    let content = `Form Title: ${formTitle}\n`;
    
    if (formDescription) {
      content += `Form Description: ${formDescription}\n\n`;
    }
    
    content += "Questions:\n";
    questions.forEach((q, index) => {
      content += `${index + 1}. ${q.text} (${q.type})`;
      if (q.options) {
        content += ` Options: ${q.options.map(o => o.label).join(', ')}`;
      }
      content += '\n';
    });
    
    return content;
  };

  const generateAnswers = async () => {
    if (!isConnected) {
      setError('Ollama is not connected. Please connect to your Ollama instance first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formContent = formatFormContent();
      
      const prompt = customPrompt.trim() 
        ? `${customPrompt}\n\nHere is the form to fill out:\n${formContent}`
        : `Please help me fill out this form with reasonable and realistic answers:\n${formContent}`;
      
      // Create system prompt for form filling
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant helping to fill out a form. 
          Generate appropriate answers for each question based on the form context.
          Format your response as JSON where keys are question numbers (1, 2, 3...) and values are the answers:
          {
            "1": "Answer to question 1",
            "2": "Answer to question 2",
            "3": ["Selected option 1", "Selected option 3"]
          }
          
          For multiple choice questions, return an array of selected options.
          Make answers realistic, appropriate and contextual to the form's purpose.`
        },
        {
          role: 'user' as const,
          content: prompt
        }
      ];
      
      const response = await ollamaService.chat({
        messages: messages,
        temperature: 0.7
      });
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse response as JSON');
      }
      
      const jsonResponse = JSON.parse(jsonMatch[0]);
      
      // Process answers and map them to question IDs
      const mappedAnswers: Record<string, string | string[]> = {};
      
      Object.keys(jsonResponse).forEach(questionNum => {
        const index = parseInt(questionNum) - 1;
        if (index >= 0 && index < questions.length) {
          const questionId = questions[index].id;
          mappedAnswers[questionId] = jsonResponse[questionNum];
        }
      });
      
      setSuggestedAnswers(mappedAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate answers');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAnswer = (questionId: string) => {
    const answer = suggestedAnswers[questionId];
    if (answer !== undefined) {
      onSuggestAnswer(questionId, answer);
    }
  };

  const handleApplyAll = () => {
    Object.keys(suggestedAnswers).forEach(questionId => {
      onSuggestAnswer(questionId, suggestedAnswers[questionId]);
    });
    setDrawerVisible(false);
  };

  return (
    <>
      <AIButton 
        type="primary" 
        icon={<RobotOutlined />} 
        onClick={toggleDrawer}
        title="AI Form Assistant"
      />
      
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ fontSize: '18px', marginRight: '8px' }} />
            <span>AI Form Assistant</span>
          </div>
        }
        open={drawerVisible}
        onClose={toggleDrawer}
        width={450}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {!isConnected && (
            <Alert
              message="Ollama Not Connected"
              description="Please connect to your Ollama instance in the settings to use AI features."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Paragraph>
            The AI assistant can help you fill out this form with realistic answers.
          </Paragraph>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong>Customize your request (optional):</Text>
            <TextArea
              placeholder="E.g., Fill this form as a customer who had a great experience"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <Button 
            type="primary" 
            onClick={generateAnswers} 
            loading={loading}
            disabled={!isConnected}
            icon={<SendOutlined />}
            style={{ marginBottom: 16 }}
          >
            Generate Answers
          </Button>
          
          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin tip="Generating answers..." />
            </div>
          )}
          
          {!loading && Object.keys(suggestedAnswers).length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Suggested Answers</Title>
                <Button type="primary" onClick={handleApplyAll}>
                  Apply All
                </Button>
              </div>
              
              {questions.map((q, index) => {
                const answer = suggestedAnswers[q.id];
                if (answer === undefined) return null;
                
                return (
                  <div key={q.id} style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text strong>{index + 1}. {q.text}</Text>
                        <Paragraph style={{ margin: '8px 0' }}>
                          {Array.isArray(answer) 
                            ? answer.join(', ')
                            : answer}
                        </Paragraph>
                      </div>
                      <Button 
                        type="link" 
                        onClick={() => handleApplyAnswer(q.id)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Space>
      </Drawer>
    </>
  );
};

export default AIAssistant;
