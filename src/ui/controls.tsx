import type { CSSProperties, ReactNode } from 'react';

/** A titled sidebar section with an engraved eyebrow label. */
export function Panel({
  title,
  dot = false,
  right,
  children,
}: {
  title: string;
  dot?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel__head">
        <div className="panel__title">
          {dot && <span className="dot" />}
          <span className="eyebrow">{title}</span>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Labeled range slider with a live value readout and a filled track. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
  disabled?: boolean;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const style = { '--range-fill': `${pct}%` } as CSSProperties;
  return (
    <div className="field">
      <div className="field__row">
        <span className="field__label">{label}</span>
        <span className="field__value">{display ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={style}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

/** A logarithmic slider (backed by a linear 0..1 position) for wide ranges. */
export function LogSlider({
  label,
  value,
  min,
  max,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);
  const pos = (Math.log10(Math.max(value, min)) - lmin) / (lmax - lmin);
  const style = { '--range-fill': `${pos * 100}%` } as CSSProperties;
  return (
    <div className="field">
      <div className="field__row">
        <span className="field__label">{label}</span>
        <span className="field__value">{display ?? value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={pos}
        style={style}
        onChange={(e) => {
          const p = parseFloat(e.target.value);
          onChange(10 ** (lmin + p * (lmax - lmin)));
        }}
        aria-label={label}
      />
    </div>
  );
}

/** iOS-style toggle switch. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle field">
      <span className="toggle__label">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" />
    </label>
  );
}

/** Segmented control for a small set of mutually exclusive options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented__opt"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
