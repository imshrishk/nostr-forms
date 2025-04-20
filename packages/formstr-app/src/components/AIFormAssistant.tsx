import React, { useState } from 'react';
import AIFormBuilder from './AIFormBuilder';
import AIFormFiller from './AIFormFiller';
import { Button, Steps, Card, Typography, Space } from 'antd';
import { RobotOutlined, FormOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Step } = Steps;

interface FormField {
  type: string;
  label: string;
  required: boolean;
}

const AIFormAssistant: React.FC = () => {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [aiResponses, setAiResponses] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'builder' | 'filler'>('builder');
  const [currentStep, setCurrentStep] = useState(0);

  const handleFieldsGenerated = (fields: FormField[]) => {
    setFormFields(fields);
    setActiveTab('filler');
    setCurrentStep(1);
  };

  const handleResponsesGenerated = (responses: Record<string, any>) => {
    setAiResponses(responses);
    setCurrentStep(2);
  };

  const steps = [
    {
      title: 'Create Form',
      content: (
        <Card className="mt-4">
          <Title level={4}>Step 1: Create Your Form with AI</Title>
          <Text type="secondary" className="block mb-4">
            Describe what kind of form you want to create. For example: "I need a registration form for a tech conference with fields for name, email, company, and session preferences."
          </Text>
          <AIFormBuilder onFieldsGenerated={handleFieldsGenerated} />
        </Card>
      ),
    },
    {
      title: 'Fill Form',
      content: (
        <Card className="mt-4">
          <Title level={4}>Step 2: Let AI Fill Your Form</Title>
          <Text type="secondary" className="block mb-4">
            Provide context for how you want the form filled. For example: "Fill this registration form for John Doe from Acme Corp who wants to attend the morning sessions."
          </Text>
          <AIFormFiller
            formFields={formFields}
            onResponseGenerated={handleResponsesGenerated}
          />
        </Card>
      ),
    },
    {
      title: 'Review',
      content: (
        <Card className="mt-4">
          <Title level={4}>Step 3: Review Generated Responses</Title>
          <Text type="secondary" className="block mb-4">
            Check the AI-generated responses and make any necessary adjustments.
          </Text>
          {Object.keys(aiResponses).length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow">
              <div className="space-y-2">
                {formFields.map((field) => (
                  <div key={field.label} className="flex items-center">
                    <span className="font-medium w-1/3">{field.label}:</span>
                    <span className="w-2/3">{aiResponses[field.label] || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="text-center mb-8">
        <Title level={2}>
          <RobotOutlined className="mr-2" />
          AI Form Assistant
        </Title>
        <Text type="secondary" className="block">
          Create and fill forms using AI in three simple steps
        </Text>
      </div>

      <Steps current={currentStep} className="mb-8">
        {steps.map((step) => (
          <Step
            key={step.title}
            title={step.title}
            icon={
              step.title === 'Create Form' ? (
                <FormOutlined />
              ) : step.title === 'Fill Form' ? (
                <RobotOutlined />
              ) : (
                <CheckCircleOutlined />
              )
            }
          />
        ))}
      </Steps>

      <div className="steps-content">{steps[currentStep].content}</div>

      <div className="mt-8 flex justify-between">
        <Button
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        <Button
          type="primary"
          onClick={() => setCurrentStep(currentStep + 1)}
          disabled={currentStep === steps.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default AIFormAssistant;
