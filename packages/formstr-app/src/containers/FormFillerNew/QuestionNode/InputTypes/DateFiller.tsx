import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Dayjs } from "dayjs";

interface DateFillerProps {
  onChange: (dateString: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}

export const DateFiller: React.FC<DateFillerProps> = ({
  onChange,
  defaultValue,
  disabled,
}) => {
  const defaultDate = defaultValue ? dayjs(defaultValue) : undefined;
  const onChangeHandler = (date: Dayjs | null, dateString: string) => {
    onChange(dateString);
  };
  return (
    <DatePicker
      style={{ width: "100%" }}
      defaultValue={defaultDate}
      onChange={onChangeHandler}
      disabled={disabled}
    />
  );
};
