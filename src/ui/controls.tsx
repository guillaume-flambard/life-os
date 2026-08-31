import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import "./ui.css";

type Variant = { primary?: boolean; ghost?: boolean; subtle?: boolean; danger?: boolean; sm?: boolean; block?: boolean };

// Bespoke button — replaces Chakra's <Button> to shed the component-library look.
export function Btn({
  children,
  primary,
  ghost,
  subtle,
  danger,
  sm,
  block,
  loading,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & Variant & { loading?: boolean; children: ReactNode }) {
  const cls = [
    "ui-btn",
    primary && "primary",
    ghost && "ghost",
    subtle && "subtle",
    danger && "danger",
    sm && "sm",
    block && "block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="ui-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// Bespoke single-line field.
export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={["ui-field", className].filter(Boolean).join(" ")} {...rest} />;
}

// Bespoke multiline field (auto-grows).
export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, onInput, ...rest } = props;
  return (
    <textarea
      className={["ui-field", className].filter(Boolean).join(" ")}
      rows={rest.rows ?? 3}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 220) + "px";
        onInput?.(e);
      }}
      {...rest}
    />
  );
}
