import React, { useState } from 'react';
import { Menu, Drawer, Button, Typography, Alert } from 'antd';
import { 
  RobotOutlined, 
  PlusOutlined, 
  EditOutlined, 
  SettingOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import { useOllama } from '../../../../providers/OllamaProvider';
import OllamaSettingsModal from '../../../../components/OllamaSettingsModal';
import AIQuestionGenerator from './AIQuestionGenerator';
import AIFormImprover from './AIFormImprover';

const { Title, Text } = Typography;

enum AIFeature {
  GENERATE_QUESTIONS = 'generate_questions',
  IMPROVE_FORM = 'improve_form',
  OLLAMA_SETTINGS = 'ollama_settings',
}

const AIMenu: React.FC = () => {
  const { isConnected } = useOllama();
  const [activeFeature, setActiveFeature] = useState<AIFeature | null>(null);
  
  const handleMenuClick = ({ key }: { key: string }) => {
    setActiveFeature(key as AIFeature);
  };
  
  const closeDrawer = () => {
    setActiveFeature(null);
  };
  
  const menuItems = [
    {
      key: AIFeature.GENERATE_QUESTIONS,
      icon: <PlusOutlined />,
      label: 'Generate Questions',
      disabled: !isConnected,
    },
    {
      key: AIFeature.IMPROVE_FORM,
      icon: <EditOutlined />,
      label: 'Improve Form',
      disabled: !isConnected,
    },
    {
      key: AIFeature.OLLAMA_SETTINGS,
      icon: <SettingOutlined />,
      label: 'Ollama Settings',
    },
  ];

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case AIFeature.GENERATE_QUESTIONS:
        return <AIQuestionGenerator onClose={closeDrawer} />;
      case AIFeature.IMPROVE_FORM:
        return <AIFormImprover onClose={closeDrawer} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Menu
        mode="inline"
        selectedKeys={activeFeature ? [activeFeature] : []}
        onClick={handleMenuClick}
        items={menuItems}
      />
      
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ fontSize: '18px', marginRight: '8px' }} />
            <span>AI Assistant</span>
          </div>
        }
        open={activeFeature !== null && activeFeature !== AIFeature.OLLAMA_SETTINGS}
        onClose={closeDrawer}
        width={500}
      >
        {!isConnected && (
          <Alert
            message="Ollama Not Connected"
            description="Please connect to your Ollama instance in the settings to use AI features."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {renderFeatureContent()}
      </Drawer>
      
      <OllamaSettingsModal
        visible={activeFeature === AIFeature.OLLAMA_SETTINGS}
        onClose={closeDrawer}
      />
    </>
  );
};

export default AIMenu;
