import { TimePicker } from "antd";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";

interface TimeFillerProps {
  onChange: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}

export const TimeFiller: React.FC<TimeFillerProps> = ({
  onChange,
  defaultValue,
  disabled,
}) => {
  const defaultTime = defaultValue ? dayjs(defaultValue, "HH:mm:ss") : undefined;
  const onChangeHandler = (time: Dayjs | null, timeString: string) => {
    onChange(timeString);
  };
  return (
    <TimePicker
      style={{ width: "100%" }}
      defaultValue={defaultTime}
      onChange={onChangeHandler}
      disabled={disabled}
    />
  );
};
