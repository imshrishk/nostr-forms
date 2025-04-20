import React, { useState } from 'react';
import { Input, Button, Spin, Alert, Card, Typography, Space } from 'antd';
import { SendOutlined, PlusOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useOllama } from '../../../../providers/OllamaProvider';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import { generateQuestion } from '../../utils';
import { INPUTS_MENU } from '../../configs/menuConfig';
import { AnswerTypes } from '@formstr/sdk/dist/interfaces';
import { makeTag } from '../../../../utils/utility';

const { TextArea } = Input;
const { Title, Text } = Typography;

const StyledCard = styled(Card)`
  margin-bottom: 16px;
`;

const QuestionItem = styled.div`
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fafafa;

  &:hover {
    background-color: #f5f5f5;
  }
`;

interface AIQuestionGeneratorProps {
  onClose: () => void;
}

const AIQuestionGenerator: React.FC<AIQuestionGeneratorProps> = ({ onClose }) => {
  const { ollamaService, isConnected, selectedModel } = useOllama();
  const { formName, formSettings, addQuestion } = useFormBuilderContext();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{
    question: string;
    type: AnswerTypes;
    options?: string[];
  }>>([]);

  const generateQuestions = async () => {
    if (!isConnected) {
      setError('Ollama is not connected. Please connect to your Ollama instance first.');
      return;
    }
    
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate questions.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create system prompt with form context
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant helping to create a form titled "${formName}". 
          ${formSettings.description ? `The form description is: ${formSettings.description}` : ''}
          Generate appropriate questions based on the user's prompt. For each question, specify:
          1. The question text
          2. The question type (one of: shortText, paragraph, number, radioButton, checkboxes, dropdown, date, time)
          3. If the type is radioButton, checkboxes, or dropdown, also provide options.
          Format your response as JSON in this structure:
          [
            {
              "question": "Question text here",
              "type": "shortText",
            },
            {
              "question": "Multiple choice question?",
              "type": "radioButton",
              "options": ["Option 1", "Option 2", "Option 3"]
            }
          ]`
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
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse response as JSON');
      }
      
      const jsonResponse = JSON.parse(jsonMatch[0]);
      setGeneratedQuestions(jsonResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (question: string, type: AnswerTypes, options?: string[]) => {
    // Find the menu item that matches the type
    const menuItem = INPUTS_MENU.find(item => item.answerSettings.renderElement === type);
    
    if (!menuItem) {
      console.error(`Question type not found: ${type}`);
      return;
    }
    
    // Add the question
    const questionId = addQuestion(
      menuItem.primitive, 
      question, 
      menuItem.answerSettings
    );
    
    // If we have options and it's a choice type question, add the options
    if (options && ['radioButton', 'checkboxes', 'dropdown'].includes(type)) {
      // This would require adding options functionality
      // We would need to access the question and set its options
      // This may require modifying the addQuestion function to return the question ID
    }
    
    // Remove the question from the list
    setGeneratedQuestions(prev => 
      prev.filter(q => q.question !== question || q.type !== type)
    );
  };

  const handleAddAll = () => {
    generatedQuestions.forEach(q => {
      handleAddQuestion(q.question, q.type, q.options);
    });
    onClose();
  };

  return (
    <div>
      <Title level={4}>AI Question Generator</Title>
      <Text type="secondary">
        Describe the kind of questions you want to generate for your form.
      </Text>
      
      <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
        <TextArea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="E.g., Generate questions for a customer satisfaction survey about a restaurant experience"
          rows={4}
          disabled={loading || !isConnected}
        />
        
        {error && <Alert message={error} type="error" showIcon />}
        
        <Button 
          type="primary" 
          onClick={generateQuestions} 
          loading={loading}
          disabled={!isConnected || !prompt.trim()}
          icon={<SendOutlined />}
        >
          Generate Questions
        </Button>
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="Generating questions..." />
          </div>
        )}
        
        {generatedQuestions.length > 0 && (
          <StyledCard title="Generated Questions">
            <Space direction="vertical" style={{ width: '100%' }}>
              {generatedQuestions.map((q, idx) => (
                <QuestionItem key={idx}>
                  <div>
                    <Text strong>{q.question}</Text>
                    <br />
                    <Text type="secondary">{q.type}</Text>
                    {q.options && (
                      <div>
                        <Text type="secondary">
                          Options: {q.options.join(', ')}
                        </Text>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => handleAddQuestion(q.question, q.type, q.options)}
                    size="small"
                  />
                </QuestionItem>
              ))}
              
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                  type="primary" 
                  onClick={handleAddAll}
                >
                  Add All Questions
                </Button>
              </div>
            </Space>
          </StyledCard>
        )}
      </Space>
    </div>
  );
};

export default AIQuestionGenerator;
