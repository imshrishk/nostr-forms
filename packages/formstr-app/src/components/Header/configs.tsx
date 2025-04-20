import { Link } from "react-router-dom";
import { Button } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { ROUTES } from "../../constants/routes";

export const HEADER_MENU_KEYS = {
  PUBLIC_FORMS: "PUBLIC_FORMS",
  USER: "USER",
  CREATE_FORMS: "CREATE_FORMS",
  HELP: "HELP",
  AI_ASSISTANT: "AI_ASSISTANT",
};

export const HEADER_MENU = [
  {
    key: HEADER_MENU_KEYS.HELP,
    label: "Help",
    icon: <InfoCircleOutlined />,
  },
  {
    key: HEADER_MENU_KEYS.PUBLIC_FORMS,
    label: "Global Forms",
    icon: (
      <Link to={ROUTES.PUBLIC_FORMS}>
        <SearchOutlined />
      </Link>
    ),
  },
  {
    key: HEADER_MENU_KEYS.AI_ASSISTANT,
    label: (
      <Link to={ROUTES.AI_ASSISTANT}>
        <Button type="primary" icon={<RobotOutlined />}>
          AI Assistant
        </Button>
      </Link>
    ),
  },
  {
    key: HEADER_MENU_KEYS.CREATE_FORMS,
    label: (
      <Button
        type="primary"
        icon={<PlusOutlined style={{ paddingTop: "2px" }} />}
      >
        Create Form
      </Button>
    ),
  },
];
