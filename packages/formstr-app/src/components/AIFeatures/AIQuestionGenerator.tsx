// packages/formstr-app/src/containers/CreateFormNew/components/AIFeatures/AIQuestionGenerator.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography, Spin, List, Checkbox, Space, Alert } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { useOllama } from '../../providers/OllamaProvider';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import styled from 'styled-components';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

const StyledList = styled(List)`
  margin-top: 16px;
  max-height: 300px;
  overflow-y: auto;
`;

interface AIQuestionGeneratorProps {
  visible: boolean;
  onClose: () => void;
}

interface GeneratedQuestion {
  id: string;
  text: string;
  selected: boolean;
}

const AIQuestionGenerator: React.FC<AIQuestionGeneratorProps> = ({ visible, onClose }) => {
  const { generateText, isLoading } = useOllama();
  const { formName, formSettings, addQuestion } = useFormBuilderContext();
  
  const [form] = Form.useForm();
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  
  const handleGenerate = async () => {
    const values = await form.validateFields();
    setGenerating(true);
    
    const prompt = `You are a form creation assistant. Create a list of 5-7 questions for a form titled "${formName}". ${
      formSettings.description ? `The form description is: ${formSettings.description}` : ''
    }
    
    Additional context from the user: "${values.context}"
    
    Format each question as a separate line with no numbers or bullets.
    Each question should be clear, concise, and relevant to the form's purpose.
    Provide a mix of question types (e.g., short answer, multiple choice, yes/no).
    
    Just return the questions and nothing else.`;
    
    try {
      const response = await generateText(prompt);
      const questions = response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map((text, index) => ({
          id: `gen-${Date.now()}-${index}`,
          text: text.replace(/^\d+[\.\)]\s*/, '').replace(/^-\s*/, ''),
          selected: true,
        }));
      
      setGeneratedQuestions(questions);
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setGenerating(false);
    }
  };
  
  const handleToggleQuestion = (id: string) => {
    setGeneratedQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, selected: !q.selected } : q)
    );
  };
  
  const handleAddQuestions = () => {
    const selectedQuestions = generatedQuestions.filter(q => q.selected);
    selectedQuestions.forEach(q => {
      addQuestion('text', q.text);
    });
    
    onClose();
    setGeneratedQuestions([]);
    form.resetFields();
  };
  
  const handleCancel = () => {
    onClose();
    setGeneratedQuestions([]);
    form.resetFields();
  };
  
  return (
    <Modal
      title={
        <Space align="center">
          <BulbOutlined />
          <span>AI Question Generator</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="add"
          type="primary"
          disabled={generatedQuestions.filter(q => q.selected).length === 0}
          onClick={handleAddQuestions}
        >
          Add Selected Questions
        </Button>,
      ]}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ context: '' }}
      >
        <Paragraph>
          Describe your form's purpose or the information you want to collect. 
          The AI will suggest relevant questions for your form.
        </Paragraph>
        
        <Form.Item
          name="context"
          label="What kind of form are you creating?"
          rules={[{ required: true, message: 'Please provide some context' }]}
        >
          <TextArea
            placeholder="e.g., A job application form for a software developer position, a conference registration form, a customer feedback survey..."
            rows={4}
          />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleGenerate} 
            loading={generating}
            icon={<BulbOutlined />}
          >
            Generate Questions
          </Button>
        </Form.Item>
      </Form>
      
      {generating && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>
            Generating questions...
          </Paragraph>
        </div>
      )}
      
      {generatedQuestions.length > 0 && (
        <>
          <Alert
            message="Questions Generated"
            description="Select the questions you want to add to your form. You can edit them after adding."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Title level={5}>Generated Questions:</Title>
          <StyledList
            dataSource={generatedQuestions}
            renderItem={item => (
              <List.Item>
                <Checkbox
                  checked={item.selected}
                  onChange={() => handleToggleQuestion(item.id)}
                  style={{ marginRight: 8 }}
                />
                <div>{item.text}</div>
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default AIQuestionGenerator;
