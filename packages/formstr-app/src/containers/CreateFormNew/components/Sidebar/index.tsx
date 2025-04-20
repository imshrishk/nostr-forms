import { forwardRef, useState } from "react";
import { Divider, Button, Collapse } from "antd";
import { RobotOutlined } from '@ant-design/icons';
import BasicMenu from "../BasicMenu";
import InputsMenu from "../InputsMenu";
import PreBuiltMenu from "../PreBuiltMenu";
import AIMenu from "../AIFeatures/AIMenu";
import Sidebar from "../../../../components/Sidebar";
import { useOllama } from "../../../../providers/OllamaProvider";

const { Panel } = Collapse;

function SidebarMenu(_props: any, ref: any) {
  const { isConnected } = useOllama();
  const [activeKey, setActiveKey] = useState<string | string[]>([]);
  
  const handleCollapseChange = (key: string | string[]) => {
    setActiveKey(key);
  };

  return (
    <Sidebar width={252} ref={ref} className="left-sidebar">
      <BasicMenu />
      <Divider className="menu-divider" />
      <InputsMenu />
      <Divider className="menu-divider" />
      <PreBuiltMenu />
      <Divider className="menu-divider" />
      
      <Collapse 
        activeKey={activeKey} 
        onChange={handleCollapseChange}
        ghost
        expandIconPosition="end"
      >
        <Panel 
          header={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <RobotOutlined style={{ marginRight: 8 }} />
              <span>AI Assistant {isConnected ? '✓' : ''}</span>
            </div>
          } 
          key="ai-features"
        >
          <AIMenu />
        </Panel>
      </Collapse>
    </Sidebar>
  );
}

export default forwardRef(SidebarMenu);
