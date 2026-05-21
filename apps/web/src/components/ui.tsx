import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

export const Button = ({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) => (
  <button
    className={clsx(
      "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
      variant === "primary" && "bg-ink text-white hover:bg-black",
      variant === "secondary" && "border border-ink/10 bg-white text-ink hover:border-mint",
      variant === "ghost" && "text-ink hover:bg-white",
      className
    )}
    {...props}
  />
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={clsx(
      "min-h-10 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20",
      className
    )}
    {...props}
  />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={clsx(
      "min-h-24 w-full resize-y rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20",
      className
    )}
    {...props}
  />
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={clsx(
      "min-h-10 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20",
      className
    )}
    {...props}
  />
);

export const Panel = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

export const StatusPill = ({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) => (
  <span
    className={clsx(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
      tone === "neutral" && "bg-ink/10 text-ink",
      tone === "good" && "bg-mint/10 text-mint",
      tone === "warn" && "bg-sun/20 text-ink",
      tone === "bad" && "bg-coral/10 text-coral"
    )}
  >
    {children}
  </span>
);
