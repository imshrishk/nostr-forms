import { AnswerTypes } from "@formstr/sdk/dist/interfaces";
import { makeTag } from "../../../utils/utility";
import { IAnswerSettings } from "../components/AnswerSettings/types";
import { Field } from "../../../nostr/types";

export const generateQuestion = (
  primitive: string = "text",
  label: string | null = null,
  choices: string[][] = [],
  answerSettings: IAnswerSettings = { renderElement: AnswerTypes.shortText }
): Field => {
  const tempId = makeTag(6);
  const questionLabel = label || "Click here to edit";
  const required = answerSettings.required || false;

  // Determine the correct internal type based on primitive/answerSettings
  let type = primitive; 
  if (answerSettings.renderElement === AnswerTypes.paragraph) {
    type = 'textbox';
  } else if (answerSettings.renderElement === AnswerTypes.radioButton || answerSettings.renderElement === AnswerTypes.dropdown) {
    type = 'singleselect';
  } else if (answerSettings.renderElement === AnswerTypes.checkboxes) {
    type = 'multiselect';
  } else if (answerSettings.renderElement === AnswerTypes.date) {
    type = 'date';
  } else if (answerSettings.renderElement === AnswerTypes.time) {
    type = 'time';
  } else if (answerSettings.renderElement === AnswerTypes.number) {
    type = 'number';
  }

  const fieldSettings = {
    type: type, 
    label: questionLabel,
    required: required,
    options: choices, // Store actual options array here
    settings: { // Store specific settings under the 'settings' key
      ...answerSettings,
      required: required 
    }
  };

  return [
    "field",
    tempId,
    JSON.stringify(fieldSettings), // Store stringified settings object at index 2
    questionLabel, // Store label at index 3
    JSON.stringify(choices) || "[]", // Keep options string at index 4 (for potential legacy compatibility?)
    JSON.stringify({ required: required }), // Store minimal settings at index 5 (for potential legacy compatibility?)
  ];
};

export const websocketUrlPattern =
  /^(wss?:\/\/)([^:@/]+(?::[^@/]+)?@)?([^:/]+)(?::(\d+))?(\/.*)?$/;

export function isValidWebSocketUrl(url: string): boolean {
  const match = url.match(websocketUrlPattern);
  if (!match) {
    return false;
  }
  const [, scheme, , , port] = match;

  if (!scheme || (scheme !== "ws://" && scheme !== "wss://")) {
    return false;
  }
  if (port !== undefined) {
    const portNumber = parseInt(port, 10);
    if (!(0 <= portNumber && portNumber <= 65535)) {
      return false;
    }
  }

  return true;
}

export const areArraysSame = (arr1: Array<string>, arr2: Array<string>) => {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((element, index) => element === arr2[index]);
};

export const isGreaterThanOrEqual = (val: number, compareVal: number) =>
  val >= compareVal;

export const isLessThanOrEqual = (val: number, compareVal: number) =>
  val <= compareVal;

export const getNumValue = (val: string | number): number => {
  let newVal = val;
  if (typeof newVal === "string") {
    newVal = newVal.length;
  }
  return newVal;
};
