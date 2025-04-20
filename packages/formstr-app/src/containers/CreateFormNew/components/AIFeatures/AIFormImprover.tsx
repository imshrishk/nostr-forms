import React, { useState } from 'react';
import { Button, Input, Spin, Alert, Typography, Space, Card } from 'antd';
import { SendOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useOllama } from '../../../../providers/OllamaProvider';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import { Field } from '../../../../nostr/types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const StyledCard = styled(Card)`
  margin-bottom: 16px;
`;

interface AIFormImproverProps {
  onClose: () => void;
}

const AIFormImprover: React.FC<AIFormImproverProps> = ({ onClose }) => {
  const { ollamaService, isConnected } = useOllama();
  const { 
    formName, 
    formSettings, 
    questionsList,
    updateFormName,
    updateFormSetting,
    editQuestion
  } = useFormBuilderContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<{
    title?: string;
    description?: string;
    questions?: Array<{ id: string; text: string }>
  } | null>(null);

  const getFormContent = () => {
    // Create a string representation of the form
    let formContent = `Form Title: ${formName}\n`;
    
    if (formSettings.description) {
      formContent += `Form Description: ${formSettings.description}\n`;
    }
    
    formContent += `\nQuestions:\n`;
    
    questionsList.forEach((question: Field, index) => {
      formContent += `${index + 1}. ${question[3] || ''}\n`;
    });
    
    return formContent;
  };

  const improveForm = async () => {
    if (!isConnected) {
      setError('Ollama is not connected. Please connect to your Ollama instance first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare the form content for the prompt
      const formContent = getFormContent();
      
      // Create system prompt for form improvement
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant helping to improve a form. Analyze the form provided and suggest improvements 
          for clarity, professionalism, and effectiveness. Consider:
          1. The form title and description
          2. Each question's wording and clarity
          
          Format your response as JSON with these sections:
          {
            "title": "Improved title if needed",
            "description": "Improved description if needed",
            "questions": [
              { "id": "0", "text": "Improved question 1" },
              { "id": "1", "text": "Improved question 2" }
            ]
          }
          
          Only include sections that need improvement. If the title is good, don't include it.`
        },
        {
          role: 'user' as const,
          content: formContent
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
      setImprovements(jsonResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate improvements');
    } finally {
      setLoading(false);
    }
  };

  const applyImprovement = (type: 'title' | 'description' | 'question', value: string, questionIndex?: number) => {
    if (!value) return; // Add null check
    
    if (type === 'title') {
      updateFormName(value);
    } else if (type === 'description') {
      updateFormSetting({ ...formSettings, description: value });
    } else if (type === 'question' && questionIndex !== undefined) {
      const question = questionsList[questionIndex];
      if (question) {
        const updatedQuestion = [...question];
        updatedQuestion[3] = value;
        // Fix type error by type assertion
        editQuestion(updatedQuestion as Field, updatedQuestion[1]);
      }
    }
  };  

  const applyAllImprovements = () => {
    if (improvements?.title) {
      updateFormName(improvements.title);
    }
    
    if (improvements?.description) {
      updateFormSetting({ ...formSettings, description: improvements.description });
    }
    
    if (improvements?.questions) {
      improvements.questions.forEach(q => {
        const index = parseInt(q.id);
        if (!isNaN(index) && index >= 0 && index < questionsList.length) {
          const question = questionsList[index];
          if (question) {
            const updatedQuestion = [...question];
            updatedQuestion[3] = q.text;
            editQuestion(updatedQuestion, updatedQuestion[1]);
          }
        }
      });
    }
    
    onClose();
  };

  return (
    <div>
      <Title level={4}>AI Form Improvement</Title>
      <Text type="secondary">
        Use AI to improve your form's clarity, professionalism, and effectiveness.
      </Text>
      
      <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
        {error && <Alert message={error} type="error" showIcon />}
        
        <Button 
          type="primary" 
          onClick={improveForm} 
          loading={loading}
          disabled={!isConnected}
          icon={<SendOutlined />}
        >
          Analyze and Improve Form
        </Button>
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="Analyzing form..." />
          </div>
        )}
        
        {improvements && (
          <StyledCard title="Suggested Improvements">
            <Space direction="vertical" style={{ width: '100%' }}>
              {improvements.title && (
                <div>
                  <Text strong>Form Title:</Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Paragraph style={{ marginBottom: 0 }}>{improvements.title}</Paragraph>
                    <Button 
                      type="link" 
                      icon={<EditOutlined />}
                      onClick={() => applyImprovement('title', improvements.title)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
              
              {improvements.description && (
                <div>
                  <Text strong>Form Description:</Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Paragraph style={{ marginBottom: 0 }}>{improvements.description}</Paragraph>
                    <Button 
                      type="link" 
                      icon={<EditOutlined />}
                      onClick={() => applyImprovement('description', improvements.description)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
              
              {improvements.questions && improvements.questions.length > 0 && (
                <div>
                  <Text strong>Questions:</Text>
                  {improvements.questions.map((q) => {
                    const index = parseInt(q.id);
                    if (isNaN(index) || index < 0 || index >= questionsList.length) {
                      return null;
                    }
                    
                    return (
                      <div key={q.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Paragraph style={{ marginBottom: 0 }}>
                            <Text type="secondary">Q{parseInt(q.id) + 1}: </Text>
                            {q.text}
                          </Paragraph>
                          <Button 
                            type="link" 
                            icon={<EditOutlined />}
                            onClick={() => applyImprovement('question', q.text, index)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                  type="primary" 
                  onClick={applyAllImprovements}
                >
                  Apply All Improvements
                </Button>
              </div>
            </Space>
          </StyledCard>
        )}
      </Space>
    </div>
  );
};

export default AIFormImprover;
