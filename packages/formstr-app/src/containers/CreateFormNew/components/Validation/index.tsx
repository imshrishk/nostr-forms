import { useEffect, useState } from "react";
import { ValidationRuleTypes } from "@formstr/sdk/dist/interfaces";
import { Typography, Select } from "antd";
import { IProps } from "./validation.type";
import { ANSWER_TYPE_RULES_MENU, RULE_CONFIG } from "../../configs/config";
import StyleWrapper from "./validation.style";

const { Text } = Typography;

function Validation(props: IProps) {
  const { answerType, answerSettings, handleAnswerSettings } = props;
  const validationRules = answerSettings?.validationRules || {};
  
  const defaultSelected = validationRules ? 
    Object.keys(validationRules).filter(k => k) as ValidationRuleTypes[] : [];

  const [selected, setSelected] =
    useState<ValidationRuleTypes[]>(defaultSelected);

  useEffect(() => {
    setSelected(defaultSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerType]);

  const hasRules = answerType && 
                   ANSWER_TYPE_RULES_MENU[answerType] && 
                   ANSWER_TYPE_RULES_MENU[answerType]?.length > 0;
  
  if (!answerType || (!selected?.length && !hasRules)) {
    return null;
  }

  const onRuleSelect = (val: any) => {
    if (!val) return;
    const newSelected = [...selected, val];
    setSelected(newSelected);
  };

  const onSettingChange = (ruleType: ValidationRuleTypes, val: any) => {
    if (!ruleType) return;
    handleAnswerSettings({
      validationRules: { ...validationRules, [ruleType]: val },
    });
  };

  let rules = [];
  if (ANSWER_TYPE_RULES_MENU[answerType]) {
    rules = ANSWER_TYPE_RULES_MENU[answerType].filter(
      rule => rule && !selected.includes(rule.value)
    );
  }

  return (
    <StyleWrapper className="input-property">
      <div className="header">
        <div>
          <Text className="property-title">Validation</Text>
        </div>
        {Array.isArray(rules) && rules.length > 0 && (
          <Select value="Select" options={rules} onChange={onRuleSelect} />
        )}
      </div>
      {Array.isArray(selected) && selected.length > 0 &&
        selected.map((ruleType) => {
          if (!ruleType || !RULE_CONFIG[ruleType]) return null;
          
          let { key, component: Component } = RULE_CONFIG[ruleType];
          return (
            <Component
              key={key}
              //@ts-ignore
              rule={validationRules[ruleType]}
              onChange={onSettingChange}
            />
          );
        })}
    </StyleWrapper>
  );
}

export default Validation;
