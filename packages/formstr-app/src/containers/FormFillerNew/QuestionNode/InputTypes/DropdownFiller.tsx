import { Option } from "@formstr/sdk/dist/formstr/nip101";
import { Select } from "antd";

interface DropdownFillerProps {
  options: Option[];
  onChange: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}

export const DropdownFiller: React.FC<DropdownFillerProps> = ({
  options,
  onChange,
  defaultValue,
  disabled,
}) => {
  return (
    <Select
      defaultValue={defaultValue}
      style={{ width: "100%" }}
      onChange={onChange}
      options={options.map((choice) => {
        let [choiceId, label] = choice;
        return { value: choiceId, label: label };
      })}
      disabled={disabled}
      placeholder="Select an option"
    />
  );
};
