import { Switch } from '@/components/ui/switch';

type SettingsSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function SettingsSwitch({ checked, onChange, label }: SettingsSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      title={label}
    />
  );
}
