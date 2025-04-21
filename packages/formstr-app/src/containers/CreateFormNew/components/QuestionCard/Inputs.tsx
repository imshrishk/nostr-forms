import { AnswerSettings, AnswerTypes } from "@formstr/sdk/dist/interfaces";
import ShortText from "./InputElements/ShortText";
import { RadioButtonCreator } from "./InputElements/OptionTypes/RadioButtonCreator";
import { CheckboxCreator } from "./InputElements/OptionTypes/CheckBoxCreator";
import { DropdownCreator } from "./InputElements/OptionTypes/DropdownCreator";
import { DatePicker, Input, InputNumber, TimePicker } from "antd";
import { Choice } from "./InputElements/OptionTypes/types";

interface InputsProps {
  inputType: string;
  options: Array<Choice>;
  answerSettings: AnswerSettings;
  answerSettingsHandler: (answerSettings: AnswerSettings) => void;
  optionsHandler: (options: Array<Choice>) => void;
}

const Inputs: React.FC<InputsProps> = ({
  inputType,
  options,
  answerSettings,
  answerSettingsHandler,
  optionsHandler,
}) => {
  const getInputElement = () => {
    switch (inputType) {
      case 'text':
        return (
          <>
            <ShortText />
          </>
        );
      case 'textbox':
        return <Input.TextArea disabled={true} placeholder="User will type paragraph here" />;
      case 'number':
        return <InputNumber disabled={true} placeholder="User will type number here" style={{ width: '100%' }}/>;
      case 'singleselect':
        return (
          <RadioButtonCreator
            initialValues={options}
            onValuesChange={optionsHandler}
          />
        );
      case 'multiselect':
        return (
          <CheckboxCreator
            initialValues={options}
            onValuesChange={optionsHandler}
          />
        );
      case 'date':
        return <DatePicker disabled={true} style={{ width: '100%' }} />;
      case 'time':
        return <TimePicker disabled={true} style={{ width: '100%' }} />;
      default:
        return <ShortText />;
    }
  };
  return <>{getInputElement()}</>;
};

export default Inputs;
