import { Menu, Divider } from 'antd';
import { BASIC_MENU } from '../../configs/menuConfig';
import useFormBuilderContext from '../../hooks/useFormBuilderContext';
import AIMenu from '../AIFeatures/AIMenu';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  .ai-menu-container {
    padding: 0 24px 12px;
  }
`;

function BasicMenu() {
  const { addQuestion } = useFormBuilderContext();
  
  const onMenuClick = ({ key }: { key: string }) => {
    const selectedItem = BASIC_MENU.find((item) => item.key === key);
    addQuestion(selectedItem?.primitive, undefined, selectedItem?.answerSettings);
  };
  
  const items = [
    { key: 'Basic', label: 'Basic', children: BASIC_MENU, type: 'group' },
  ];
  
  return (
    <StyledWrapper>
      <div className="ai-menu-container">
        <AIMenu />
      </div>
      <Menu selectedKeys={[]} items={items} onClick={onMenuClick} />
    </StyledWrapper>
  );
}

export default BasicMenu;
