import Sidebar from "./components/Sidebar";
import { QuestionsList } from "./components/QuestionsList";
import Settings from "./components/Settings";
import StyledWrapper from "./index.style";
import { useRef, useState, useEffect } from "react";
import { useOutsideClickHandler } from "./hooks/useOutsideClickHandler";
import useFormBuilderContext from "./hooks/useFormBuilderContext";
import AIFormIntegration from "./components/AIFormIntegration";
import { Button, Drawer, Tooltip } from "antd";
import { RobotOutlined } from "@ant-design/icons";

function FormBuilder() {
  const leftSidebarRef = useRef<HTMLInputElement>(null);
  const rightSidebarRef = useRef<HTMLInputElement>(null);
  const [showAIDrawer, setShowAIDrawer] = useState(false);

  const {
    isRightSettingsOpen,
    isLeftMenuOpen,
    closeSettingsOnOutsideClick,
    closeMenuOnOutsideClick,
  } = useFormBuilderContext();

  // Check if AI assistant should be opened automatically (from dashboard)
  useEffect(() => {
    const shouldOpenAI = sessionStorage.getItem('openAIAssistant');
    if (shouldOpenAI === 'true') {
      setShowAIDrawer(true);
      // Clear the flag so it doesn't auto-open on subsequent visits
      sessionStorage.removeItem('openAIAssistant');
    }
  }, []);

  useOutsideClickHandler(leftSidebarRef, closeMenuOnOutsideClick);
  useOutsideClickHandler(rightSidebarRef, closeSettingsOnOutsideClick);

  return (
    <StyledWrapper
      $isOpen={isLeftMenuOpen}
      $isRightSettingsOpen={isRightSettingsOpen}
    >
      <div style={{ display: "flex", maxWidth: "100vw" }}>
        <Sidebar ref={leftSidebarRef} />
        <div style={{ width: "100%", position: "relative" }}>
          <Tooltip title="AI Form Builder">
            <Button
              type="primary"
              shape="circle"
              icon={<RobotOutlined />}
              size="large"
              onClick={() => setShowAIDrawer(true)}
              style={{
                position: "fixed",
                bottom: "20px",
                right: isRightSettingsOpen ? "360px" : "20px",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
            />
          </Tooltip>
          <QuestionsList />
        </div>
        <Settings ref={rightSidebarRef} />
      </div>

      <Drawer
        title="AI Form Builder"
        placement="right"
        closable={true}
        onClose={() => setShowAIDrawer(false)}
        open={showAIDrawer}
        width={450}
      >
        <AIFormIntegration />
      </Drawer>
    </StyledWrapper>
  );
}

export default FormBuilder;
