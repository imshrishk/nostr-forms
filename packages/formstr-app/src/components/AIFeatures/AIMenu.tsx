import React, { useState } from 'react';
import { Menu, Button, Dropdown, Space, Typography, message } from 'antd';
import { BulbOutlined, RobotOutlined, ToolOutlined, SettingOutlined } from '@ant-design/icons';
import { useOllama } from '../../providers/OllamaProvider';
import OllamaSettingsModal from '../../components/OllamaSettingsModal';
import AIQuestionGenerator from './AIQuestionGenerator';
import AIFormImprover from './AIFormImprover';
import styled from 'styled-components';

const { Text } = Typography;

const StyledDropdownButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 8px;
`;

const MenuItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface AIMenuProps {
  className?: string;
}

const AIMenu: React.FC<AIMenuProps> = ({ className }) => {
  const { isConfigured } = useOllama();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [questionGeneratorVisible, setQuestionGeneratorVisible] = useState(false);
  const [formImproverVisible, setFormImproverVisible] = useState(false);
  
  const handleMenuClick = ({ key }: { key: string }) => {
    if (!isConfigured) {
      message.warning('Please configure your Ollama connection first');
      setSettingsModalVisible(true);
      return;
    }
    
    switch (key) {
      case 'generate-questions':
        setQuestionGeneratorVisible(true);
        break;
      case 'improve-form':
        setFormImproverVisible(true);
        break;
      case 'settings':
        setSettingsModalVisible(true);
        break;
    }
  };
  
  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="generate-questions">
        <MenuItemContent>
          <BulbOutlined />
          <span>Generate Questions</span>
        </MenuItemContent>
      </Menu.Item>
      <Menu.Item key="improve-form">
        <MenuItemContent>
          <ToolOutlined />
          <span>Improve Form</span>
        </MenuItemContent>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="settings">
        <MenuItemContent>
          <SettingOutlined />
          <span>Ollama Settings</span>
        </MenuItemContent>
      </Menu.Item>
    </Menu>
  );
  
  return (
    <div className={className}>
      <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
        <StyledDropdownButton icon={<RobotOutlined />}>
          <Space>
            AI Features
            {!isConfigured && (
              <Text type="warning" style={{ fontSize: '12px' }}>
                (Not Configured)
              </Text>
            )}
          </Space>
        </StyledDropdownButton>
      </Dropdown>
      
      <OllamaSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
      
      <AIQuestionGenerator
        visible={questionGeneratorVisible}
        onClose={() => setQuestionGeneratorVisible(false)}
      />
      
      <AIFormImprover
        visible={formImproverVisible}
        onClose={() => setFormImproverVisible(false)}
      />
    </div>
  );
};

export default AIMenu;
