import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Form, Input, Select, Checkbox, Radio, DatePicker, TimePicker, Typography, Spin, Alert, Space, message } from 'antd';
import { SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getEventById } from '../../nostr/api';
import { decodeForm } from '../../utils/formDecoder';
import AIAssistant from './AIAssistant';
import { useOllama } from '../../providers/OllamaProvider';
import { Field } from '../../nostr/types';
import { ROUTES } from '../../constants/routes';
import { submitForm } from '../../nostr/formSubmission';
import { useProfile } from '../../provider/ProfileProvider';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface FormQuestion {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: Array<{ label: string; value: string }>;
}

const FormFillerNew: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { profile } = useProfile();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  
  // For AI suggestion
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (formId) {
      fetchForm(formId);
    }
  }, [formId]);

  const fetchForm = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const event = await getEventById(id);
      if (!event) {
        throw new Error('Form not found');
      }
      
      const decodedForm = decodeForm(event);
      if (!decodedForm) {
        throw new Error('Could not decode form');
      }
      
      setFormData(decodedForm);
      setFormTitle(decodedForm.name || 'Untitled Form');
      setFormDescription(decodedForm.description || '');
      
      // Process questions
      const processedQuestions = processFormQuestions(decodedForm.fields);
      setQuestions(processedQuestions);
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading the form');
      setLoading(false);
    }
  };

  const processFormQuestions = (fields: Field[]): FormQuestion[] => {
    return fields.map((field, index) => {
      const [type, id, options, text] = field;
      
      // Process options for select/radio/checkbox fields
      let processedOptions;
      if (options && Array.isArray(options)) {
        processedOptions = options.map((opt, i) => ({
          label: typeof opt === 'string' ? opt : opt.label || `Option ${i+1}`,
          value: typeof opt === 'string' ? opt : opt.value || `${i+1}`
        }));
      }
      
      const optionsObj = typeof options === 'object' ? options : {};
      const isRequired = Boolean(optionsObj.required);
      
      return {
        id: id || `q-${index}`,
        text: text || `Question ${index+1}`,
        type: type,
        required: isRequired,
        options: processedOptions
      };
    });
  };

  const handleSubmit = async (values: any) => {
    if (!formId || !formData) return;
    
    try {
      setSubmitting(true);
      
      // Format the submission data
      const submission = {
        formId,
        answers: values,
        submittedAt: new Date().toISOString()
      };
      
      // Submit the form
      await submitForm(submission, profile);
      
      message.success('Form submitted successfully!');
      navigate(ROUTES.HOME);
    } catch (err) {
      message.error('Failed to submit form. Please try again.');
      console.error('Form submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle suggested answers from AI
  const handleSuggestedAnswer = (questionId: string, answer: string | string[]) => {
    // Update the field value
    setFieldValues(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Update form values
    form.setFieldsValue({
      [questionId]: answer
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Loading form..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert
          message="Error Loading Form"
          description={error}
          type="error"
          showIcon
        />
        <Button 
          type="primary" 
          onClick={() => navigate(ROUTES.HOME)}
          style={{ marginTop: 16 }}
          icon={<ArrowLeftOutlined />}
        >
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <Card bordered={false}>
        <Button 
          onClick={() => navigate(ROUTES.HOME)} 
          icon={<ArrowLeftOutlined />}
          style={{ marginBottom: 16 }}
        >
          Back
        </Button>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>{formTitle}</Title>
          {formDescription && (
            <Paragraph>{formDescription}</Paragraph>
          )}
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={fieldValues}
        >
          {questions.map((question) => (
            <Form.Item
              key={question.id}
              name={question.id}
              label={<div style={{ fontWeight: 500 }}>{question.text}</div>}
              rules={question.required ? [{ required: true, message: 'This field is required' }] : []}
            >
              {renderFormItem(question)}
            </Form.Item>
          ))}
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SendOutlined />}
              loading={submitting}
              size="large"
              block
            >
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <AIAssistant 
        formTitle={formTitle}
        formDescription={formDescription}
        questions={questions}
        onSuggestAnswer={handleSuggestedAnswer}
      />
    </div>
  );
};

// Helper function to render the appropriate form element based on question type
const renderFormItem = (question: FormQuestion) => {
  const { type, options } = question;
  
  switch (type) {
    case 'shortText':
      return <Input placeholder="Your answer" />;
    
    case 'paragraph':
      return <Input.TextArea rows={4} placeholder="Your answer" />;
    
    case 'number':
      return <Input type="number" placeholder="0" />;
    
    case 'radioButton':
      return (
        <Radio.Group>
          {options?.map((option) => (
            <Radio key={option.value} value={option.value}>
              {option.label}
            </Radio>
          ))}
        </Radio.Group>
      );
    
    case 'checkboxes':
      return (
        <Checkbox.Group>
          {options?.map((option) => (
            <div key={option.value}>
              <Checkbox value={option.value}>{option.label}</Checkbox>
            </div>
          ))}
        </Checkbox.Group>
      );
    
    case 'dropdown':
      return (
        <Select placeholder="Select an option">
          {options?.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      );
    
    case 'date':
      return <DatePicker style={{ width: '100%' }} />;
    
    case 'time':
      return <TimePicker style={{ width: '100%' }} />;
    
    default:
      return <Input placeholder="Your answer" />;
  }
};

export default FormFillerNew;
