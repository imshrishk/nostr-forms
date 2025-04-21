import { Card, Input } from "antd";
import { ChangeEvent, useRef, PointerEvent as ReactPointerEvent } from "react";
import useFormBuilderContext from "../../hooks/useFormBuilderContext";
import CardHeader from "./CardHeader";
import Inputs from "./Inputs";
import { AnswerSettings } from "@formstr/sdk/dist/interfaces";
import StyledWrapper from "./index.style";
import { SmallDashOutlined } from "@ant-design/icons";
import QuestionTextStyle from "./question.style";
import { Choice } from "./InputElements/OptionTypes/types";
import UploadImage from "./UploadImage";
import { Field } from "../../../../nostr/types";
import { DragControls } from "framer-motion";

// Define an interface for the expected settings structure
interface ParsedFieldSettings {
  type: string;
  label: string;
  required: boolean;
  options: any[]; // Use 'any[]' for simplicity, could be Choice[]
  settings: AnswerSettings; // Re-use AnswerSettings type if appropriate
}

type QuestionCardProps = {
  question: Field;
  onEdit: (question: Field, tempId: string) => void;
  onReorderKey: (keyType: "UP" | "DOWN", tempId: string) => void;
  firstQuestion: boolean;
  lastQuestion: boolean;
  dragControls: DragControls | undefined;
};

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onEdit,
  onReorderKey,
  firstQuestion,
  lastQuestion,
  dragControls,
}) => {
  // Initialize fieldSettings with the correct type and default values
  let fieldSettings: Partial<ParsedFieldSettings> = { 
    type: 'text', 
    label: question[3] || '', 
    required: false, 
    options: [], 
    settings: {}
  };
  try {
    // Attempt to parse settings from index 2
    const rawParsed = JSON.parse(question[2] || '{}');

    if (typeof rawParsed === 'object' && rawParsed !== null && rawParsed.type) {
      // It's the new format, merge it with defaults
      fieldSettings = { 
        ...fieldSettings, // Start with defaults
        ...rawParsed, // Override with parsed values
        // Ensure nested settings object exists
        settings: { ...(fieldSettings.settings || {}), ...(rawParsed.settings || {}) } 
      };
    } else if (typeof question[2] === 'string' && question[2].length > 0) {
      // It's likely the old format (raw type string)
      // Reconstruct a basic settings object
      fieldSettings.type = question[2];
      fieldSettings.label = question[3] || fieldSettings.label;
      // Attempt to parse legacy required setting from index 5
      try {
         const legacySettings = JSON.parse(question[5] || '{}');
         fieldSettings.required = legacySettings.required || fieldSettings.required;
      } catch {}
    }
    // If it's neither an object nor a valid string, defaults will be used

  } catch (e) {
     // Handle potential parsing errors
    console.error("Error parsing question settings:", e, " Raw data:", question[2]);
    // Defaults are already set, maybe log or set a specific error state?
  }

  // Now fieldSettings is guaranteed to have at least the default structure
  // Re-assign to non-partial type for clarity, although defaults handle undefined
  const finalFieldSettings = fieldSettings as ParsedFieldSettings; 

  const answerType = finalFieldSettings.type;
  let options = finalFieldSettings.options || JSON.parse(question[4] || '[]'); // Fallback for options
  const answerSettings = JSON.parse(question[5] || '{}'); // Keep parsing legacy settings 
  const combinedSettings = { ...answerSettings, ...(finalFieldSettings.settings || {}), required: finalFieldSettings.required };

  const { setQuestionIdInFocus } = useFormBuilderContext();
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    let field = [...question] as Field;
    const newLabel = event.target.value;
    field[3] = newLabel; // Update label in index 3

    // Robustly update settings in index 2
    try {
      let currentSettings = JSON.parse(field[2] || '{}');
      // Ensure it's an object before modifying
      if (typeof currentSettings === 'object' && currentSettings !== null) {
        currentSettings.label = newLabel;
        field[2] = JSON.stringify(currentSettings);
      } else if (typeof field[2] === 'string') {
        // Handle old format - index 2 might just be the type string
        // Create a new settings object with the updated label
        const type = field[2];
        const required = JSON.parse(field[5] || '{}')?.required || false;
        const options = JSON.parse(field[4] || '[]')
        field[2] = JSON.stringify({ type, label: newLabel, required, options, settings: { required } });
      }
    } catch (e) {
      console.error("Error updating settings in handleTextChange:", e, " Raw data:", field[2]);
      // Fallback: create a basic settings object if parsing failed
      // Use the newLabel value that was attempted
      field[2] = JSON.stringify({ type: 'text', label: newLabel, required: false, options: [], settings: { required: false } });
    }

    onEdit(field, question[1]);
  };

  const handleRequiredChange = (required: boolean) => {
    let field = [...question] as Field;

    // Robustly update settings in index 2
    try {
      let currentSettings = JSON.parse(field[2] || '{}');
      if (typeof currentSettings === 'object' && currentSettings !== null) {
        currentSettings.required = required;
        if (!currentSettings.settings) currentSettings.settings = {};
        currentSettings.settings.required = required;
        field[2] = JSON.stringify(currentSettings);
      } else if (typeof field[2] === 'string') {
        // Handle old format
        const type = field[2];
        const label = field[3];
        const options = JSON.parse(field[4] || '[]');
        field[2] = JSON.stringify({ type, label, required, options, settings: { required } });
      }
    } catch (e) {
      console.error("Error updating settings in handleRequiredChange:", e, " Raw data:", field[2]);
       // Fallback: create a basic settings object if parsing failed
       const label = field[3];
      field[2] = JSON.stringify({ type: 'text', label, required, options: [], settings: { required } });
    }

    // Also update the legacy settings in index 5 for potential compatibility
    try {
      const legacySettings = JSON.parse(field[5] || '{}');
      legacySettings.required = required;
      field[5] = JSON.stringify(legacySettings);
    } catch (e) {
      field[5] = JSON.stringify({ required }); // Fallback for legacy settings
    }

    onEdit(field, question[1]);
  };

  const onCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestionIdInFocus(question[1]);
  };

  // This function updates settings coming *from* the Inputs component or Settings Panel
  const handleAnswerSettings = (newSpecificSettings: AnswerSettings) => {
    let field = [...question] as Field;
    
    // Robustly update settings in index 2
    try {
      let currentSettings = JSON.parse(field[2] || '{}');
      let type = field[2]; // Assume old format initially

      if (typeof currentSettings === 'object' && currentSettings !== null) {
        // It's the new format
        currentSettings.settings = { ...(currentSettings.settings || {}), ...newSpecificSettings };
        // Update the main type if renderElement changed
        if (newSpecificSettings.renderElement && newSpecificSettings.renderElement !== currentSettings.type) {
          currentSettings.type = newSpecificSettings.renderElement;
        }
         // Update required status based on incoming settings
        if (newSpecificSettings.required !== undefined) {
          currentSettings.required = newSpecificSettings.required;
          if (!currentSettings.settings) currentSettings.settings = {};
          currentSettings.settings.required = newSpecificSettings.required;
        }
        field[2] = JSON.stringify(currentSettings);
      } else if (typeof type === 'string') {
        // It's the old format, reconstruct the full settings object
        const label = field[3];
        const options = JSON.parse(field[4] || '[]');
        const required = newSpecificSettings.required !== undefined ? newSpecificSettings.required : false;
        const finalType = newSpecificSettings.renderElement || type;
        field[2] = JSON.stringify({ 
            type: finalType, 
            label, 
            required, 
            options, 
            settings: { ...newSpecificSettings, required } 
        });
      }
    } catch (e) {
      console.error("Error updating settings in handleAnswerSettings:", e, " Raw data:", field[2]);
      // Fallback: create basic settings object
      const label = field[3];
      const required = newSpecificSettings.required !== undefined ? newSpecificSettings.required : false;
      field[2] = JSON.stringify({ type: 'text', label, required, options: [], settings: { ...newSpecificSettings, required } });
    }

    // Update legacy settings in index 5 as well if needed (or maybe deprecate this?)
    field[5] = JSON.stringify(newSpecificSettings); 
    onEdit(field, question[1]);
  };

  const handleOptions = (newOptions: Choice[]) => {
    let field = [...question] as Field;
    field[4] = JSON.stringify(newOptions); // Update options string in index 4

    // Robustly update settings in index 2
    try {
      let currentSettings = JSON.parse(field[2] || '{}');
      if (typeof currentSettings === 'object' && currentSettings !== null) {
        // It's the new format
        currentSettings.options = newOptions;
        field[2] = JSON.stringify(currentSettings);
      } else if (typeof field[2] === 'string') {
        // Handle old format
        const type = field[2];
        const label = field[3];
        const required = JSON.parse(field[5] || '{}')?.required || false;
        field[2] = JSON.stringify({ type, label, required, options: newOptions, settings: { required } });
      }
    } catch (e) {
      console.error("Error updating settings in handleOptions:", e, " Raw data:", field[2]);
      // Fallback: create basic settings object
      const label = field[3];
      const required = JSON.parse(field[5] || '{}')?.required || false;
      field[2] = JSON.stringify({ type: 'text', label, required, options: newOptions, settings: { required } });
    }

    onEdit(field, question[1]);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragControls) return;
    const savedEvent = event;
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = setTimeout(() => {
      dragControls.start(savedEvent);
    }, 300);
  };

  const handlePointerUp = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  return (
    <StyledWrapper>
      <Card type="inner" className="question-card" onClick={onCardClick}>
        <div className="drag-icon"
        onPointerDown={dragControls ? handlePointerDown : undefined} 
        onPointerUp={dragControls ? handlePointerUp : undefined}
        onPointerCancel={dragControls ? handlePointerUp : undefined}
        style={{ touchAction: dragControls ? "none" : "auto" }}
        >
          <SmallDashOutlined />
        </div>
        <CardHeader
          required={combinedSettings.required}
          onRequired={handleRequiredChange}
          question={question}
          onReorderKey={onReorderKey}
          firstQuestion={firstQuestion}
          lastQuestion={lastQuestion}
        />
        <div
          className="question-text"
          style={{ justifyContent: "space-between", display: "flex" }}
        >
          <QuestionTextStyle style={{ width: "100%" }}>
            <label>
              <Input.TextArea
                key={question[1]}
                className="question-input"
                onChange={handleTextChange}
                defaultValue={"Click to edit"}
                value={question[3] || ""}
                placeholder="Enter a Question"
                autoSize
              />
            </label>
          </QuestionTextStyle>
          <UploadImage
            onImageUpload={(markdownUrl) => {
              const currentDisplay = question[3] || "";
              const newDisplay = currentDisplay
                ? `${currentDisplay}\n\n${markdownUrl}`
                : markdownUrl;

              const field: Field = [
                question[0],
                question[1],
                question[2],
                newDisplay,
                question[4],
                question[5],
              ];

              onEdit(field, field[1]);
            }}
          />
        </div>

        <Inputs
          inputType={answerType}
          options={options}
          answerSettings={combinedSettings}
          answerSettingsHandler={handleAnswerSettings}
          optionsHandler={handleOptions}
        />
      </Card>
    </StyledWrapper>
  );
};

export default QuestionCard;
