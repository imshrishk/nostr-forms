import { CloseOutlined } from "@ant-design/icons";
import { Input, Radio } from "antd";
import { useState } from "react";
import OptionsStyle from "./Options.style";
import { AddOption } from "./AddOption";
import { handleDelete, handleLabelChange, hasOtherOption } from "./utils";
import { Choice, ChoiceSettings } from "./types";
import { makeTag } from "../../../../../../utils/utility";

interface RadioButtonCreatorProps {
  initialValues?: Array<Choice>;
  onValuesChange: (options: Choice[]) => void;
}

export const RadioButtonCreator: React.FC<RadioButtonCreatorProps> = ({
  initialValues,
  onValuesChange,
}) => {
  const [choices, setChoices] = useState<Array<Choice>>(initialValues || []);

  const handleNewChoices = (choices: Array<Choice>) => {
    setChoices(choices);
    onValuesChange(choices);
  };

  return (
    <OptionsStyle>
      {choices?.map((choice) => {
        // console.log("Choice is", choice); // Keep console log commented out
        let choiceId = choice[0];
        let label = choice[1];
        let settingsString = choice[2];
        let settings: ChoiceSettings = {}; // Default settings

        try {
          // Safely parse settings string
          settings = JSON.parse(settingsString || "{}") as ChoiceSettings;
        } catch (e) {
          console.error("Error parsing choice settings:", e, " Raw settings:", settingsString);
          // Keep settings as {} if parsing fails
        }

        return (
          <div className="radioButtonItem" key={choiceId}>
            <Radio disabled key={choiceId + "choice"} />
            <Input
              key={choiceId + "input"}
              defaultValue={label}
              onChange={(e) => {
                handleLabelChange(
                  e.target.value,
                  choiceId,
                  choices,
                  handleNewChoices
                );
              }}
              placeholder="Enter an option"
              className="choice-input"
              disabled={settings.isOther} // Use safely parsed settings
            />
            {choices.length >= 2 && (
              <CloseOutlined
                onClick={(e) => {
                  handleDelete(choiceId!, choices, handleNewChoices);
                }}
              />
            )}
          </div>
        );
      })}
      <AddOption
        disable={choices.some((choice) => {
          let [choiceId, label, settingsString] = choice;
          return label === "";
        })}
        choices={choices}
        callback={handleNewChoices}
        displayOther={!hasOtherOption(choices)}
      />
    </OptionsStyle>
  );
};
