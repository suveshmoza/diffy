type SettingsSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function SettingsSwitch({ checked, onChange, label }: SettingsSwitchProps) {
  return (
    <button
      type='button'
      role='switch'
      className='gprv-settings-switch'
      data-checked={checked ? '' : undefined}
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
    >
      <span
        className='gprv-settings-switch-track'
        aria-hidden='true'
      >
        <span className='gprv-settings-switch-thumb' />
      </span>
    </button>
  );
}
