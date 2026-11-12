export function Toggle({
  label,
  hint,
  checked,
  disabled,
  hidden,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  hidden?: boolean;
  onChange: (value: boolean) => void;
}) {
  if (hidden) return null;
  return (
    <label className={`toggle ${disabled ? "is-disabled" : ""}`}>
      <span>
        {label}
        {hint ? <small className="toggle-hint">{hint}</small> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
