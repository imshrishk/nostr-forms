import React, { useState, useEffect } from 'react';
import { Menu, Layout, Button, Drawer, Avatar, Dropdown, Space, Badge, Typography } from 'antd';
import { UserOutlined, DownOutlined, MenuOutlined, BellOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import styled from 'styled-components';
import type { MenuProps } from 'antd';
import { TemplateSelectionModal } from "../TemplateSelectionModal";
import FAQModal from '../FAQModal';
import OllamaSettingsModal from '../OllamaSettingsModal';
import { useProfile } from '../../provider/ProfileProvider';
import { HEADER_MENU, HEADER_MENU_KEYS } from './configs';
import { ROUTES } from '../../constants/routes';
import logo from '../../assets/formstr-logo.svg';

const { Header } = Layout;
const { Text } = Typography;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 24px;
`;

const Logo = styled.img`
  height: 32px;
  margin-right: 8px;
`;

const RightMenuWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const MobileMenuButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
`;

const NostrHeader: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFAQModalVisible, setIsFAQModalVisible] = useState(false);
  const [isOllamaSettingsModalVisible, setIsOllamaSettingsModalVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isLoading: profileLoading } = useProfile();

  useEffect(() => {
    // Set the selected key based on current location
    if (location.pathname === ROUTES.PUBLIC_FORMS) {
      setSelectedKey([HEADER_MENU_KEYS.PUBLIC_FORMS]);
    } else {
      setSelectedKey([]);
    }
  }, [location]);

  const onMenuClick: MenuProps["onClick"] = (e) => {
    if (e.key === HEADER_MENU_KEYS.HELP) {
      setIsFAQModalVisible(true);
      setSelectedKey([e.key]);
      return;
    }
    if (e.key === HEADER_MENU_KEYS.CREATE_FORMS) {
      openTemplateModal();
      return;
    }
    if (e.key === HEADER_MENU_KEYS.AI_SETTINGS) {
      setIsOllamaSettingsModalVisible(true);
      setSelectedKey([e.key]);
      return;
    }
    setSelectedKey([e.key]);
  };

  const openTemplateModal = () => {
    setIsTemplateModalVisible(true);
  };

  const handleCreateForm = (templateId: string | null) => {
    setIsTemplateModalVisible(false);
    navigate(templateId ? `${ROUTES.CREATE_FORM}?template=${templateId}` : ROUTES.CREATE_FORM);
  };

  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      label: <Link to={ROUTES.PROFILE}>Profile</Link>,
    },
    {
      key: 'my-forms',
      label: <Link to={ROUTES.MY_FORMS}>My Forms</Link>,
    },
    {
      key: 'my-responses',
      label: <Link to={ROUTES.MY_RESPONSES}>My Responses</Link>,
    },
    {
      key: 'settings',
      label: <Link to={ROUTES.SETTINGS}>Settings</Link>,
    },
  ];

  const renderMobileMenu = () => (
    <>
      <MobileMenuButton
        type="text"
        icon={<MenuOutlined />}
        onClick={() => setIsMobileMenuOpen(true)}
      />
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setIsMobileMenuOpen(false)}
        open={isMobileMenuOpen}
        width={250}
      >
        <Menu mode="vertical" selectedKeys={selectedKey}>
          <Menu.Item key="home">
            <Link to={ROUTES.HOME} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </Link>
          </Menu.Item>
          <Menu.Item key={HEADER_MENU_KEYS.PUBLIC_FORMS}>
            <Link to={ROUTES.PUBLIC_FORMS} onClick={() => setIsMobileMenuOpen(false)}>
              Global Forms
            </Link>
          </Menu.Item>
          <Menu.Item key={HEADER_MENU_KEYS.HELP} onClick={() => {
            setIsFAQModalVisible(true);
            setIsMobileMenuOpen(false);
          }}>
            Help
          </Menu.Item>
          <Menu.Item key={HEADER_MENU_KEYS.AI_SETTINGS} onClick={() => {
            setIsOllamaSettingsModalVisible(true);
            setIsMobileMenuOpen(false);
          }}>
            AI Settings
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item key="profile">
            <Link to={ROUTES.PROFILE} onClick={() => setIsMobileMenuOpen(false)}>
              Profile
            </Link>
          </Menu.Item>
          <Menu.Item key="my-forms">
            <Link to={ROUTES.MY_FORMS} onClick={() => setIsMobileMenuOpen(false)}>
              My Forms
            </Link>
          </Menu.Item>
          <Menu.Item key="my-responses">
            <Link to={ROUTES.MY_RESPONSES} onClick={() => setIsMobileMenuOpen(false)}>
              My Responses
            </Link>
          </Menu.Item>
          <Menu.Item key="settings">
            <Link to={ROUTES.SETTINGS} onClick={() => setIsMobileMenuOpen(false)}>
              Settings
            </Link>
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item key={HEADER_MENU_KEYS.CREATE_FORMS}>
            <Button
              type="primary"
              onClick={() => {
                openTemplateModal();
                setIsMobileMenuOpen(false);
              }}
              block
            >
              Create Form
            </Button>
          </Menu.Item>
        </Menu>
      </Drawer>
    </>
  );

  return (
    <>
      <Header className="header-style" style={{ background: "white", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <LogoWrapper>
            <Link to={ROUTES.HOME}>
              <Logo src={logo} alt="Formstr Logo" />
            </Link>
            <Link to={ROUTES.HOME}>
              <Text strong style={{ fontSize: '18px' }}>Formstr</Text>
            </Link>
          </LogoWrapper>
          
          {!isMobile && (
            <Menu
              mode="horizontal"
              onClick={onMenuClick}
              selectedKeys={selectedKey}
              style={{ border: "none", flex: 1 }}
              items={HEADER_MENU}
            />
          )}
          
          <RightMenuWrapper>
            {!isMobile && (
              <Space size={16}>
                <Badge count={0} overflowCount={99}>
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    onClick={() => navigate(ROUTES.NOTIFICATIONS)}
                  />
                </Badge>
                
                <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                  <Button type="text">
                    <Space>
                      <Avatar
                        size="small"
                        icon={<UserOutlined />}
                        src={profile?.picture}
                      />
                      {!profileLoading && profile?.displayName && (
                        <span>{profile.displayName}</span>
                      )}
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
              </Space>
            )}
            
            {isMobile && renderMobileMenu()}
          </RightMenuWrapper>
        </div>
      </Header>
      
      <FAQModal
        visible={isFAQModalVisible}
        onClose={() => {
          setIsFAQModalVisible(false);
          setSelectedKey([]);
        }}
      />
      
      <OllamaSettingsModal
        visible={isOllamaSettingsModalVisible}
        onClose={() => {
          setIsOllamaSettingsModalVisible(false);
          setSelectedKey([]);
        }}
      />
      
      <TemplateSelectionModal
        visible={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        onSelect={handleCreateForm}
      />
    </>
  );
};

export default NostrHeader;
