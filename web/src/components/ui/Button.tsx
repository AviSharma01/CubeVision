"use client";

import { forwardRef } from "react";

type Variant = "primary" | "ghost";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Toggle-style pressed state (speed selector, tabs) */
  active?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm " +
  "font-medium transition-all active:scale-[0.97] " +
  "disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-white/85",
  ghost: "bg-white/[0.06] text-white hover:bg-white/[0.12]",
};

const ACTIVE = "bg-white/20 ring-1 ring-white/40";

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "ghost", active, className = "", children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={[BASE, VARIANTS[variant], active ? ACTIVE : "", className].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});
