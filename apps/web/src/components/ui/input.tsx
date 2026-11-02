"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { Children, isValidElement, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "h-11 w-full rounded-2xl border border-line bg-surface/70 px-4 text-[15px] text-text placeholder:text-faint shadow-[inset_0_1px_2px_rgb(80_60_30/.06)] outline-none transition focus:border-gold-1 focus:bg-surface focus:ring-4 focus:ring-gold-1/20 aria-invalid:border-negative";

/** `icon` shows a small leading icon inside the field. */
export function Input({ className, icon, ...props }: ComponentProps<"input"> & { icon?: ReactNode }) {
  const input = <input data-slot="input" className={cn(fieldClass, icon && "pl-11", className)} {...props} />;
  if (!icon) return input;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted [&_svg]:size-[18px]" aria-hidden>{icon}</span>
      {input}
    </div>
  );
}

const NONE = "__none__"; // Radix items can't use "" as a value
const enc = (v: string) => (v === "" ? NONE : v);
const dec = (v: string) => (v === NONE ? "" : v);

/**
 * Animated glass dropdown with the same API as a native <select>: pass <option> children, `value`/`onChange`
 * or `defaultValue`, and `name` to submit with the form. onChange receives `{ target: { value } }`.
 */
export function Select({ className, children, value, defaultValue, onChange, name, id, disabled, ...rest }: ComponentProps<"select">) {
  const options = Children.toArray(children).filter(isValidElement).map((o) => {
    const p = o.props as { value?: string | number; children?: ReactNode; className?: string };
    return { value: String(p.value ?? p.children ?? ""), label: p.children, className: p.className };
  });
  const [inner, setInner] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : inner;
  function change(v: string) {
    const real = dec(v);
    if (value === undefined) setInner(real);
    onChange?.({ target: { value: real, name }, currentTarget: { value: real, name } } as unknown as ChangeEvent<HTMLSelectElement>);
  }
  return (
    <SelectPrimitive.Root value={enc(current)} onValueChange={change} disabled={disabled}>
      {name && <input type="hidden" name={name} value={current} />}
      <SelectPrimitive.Trigger
        id={id}
        aria-label={rest["aria-label"]}
        aria-invalid={rest["aria-invalid"]}
        className={cn(fieldClass, "group flex cursor-pointer items-center justify-between gap-2 text-left data-[state=open]:border-gold-1 data-[state=open]:ring-4 data-[state=open]:ring-gold-1/20", className)}
      >
        <span className="min-w-0 truncate"><SelectPrimitive.Value /></span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-300 ease-[cubic-bezier(.3,1.5,.6,1)] group-data-[state=open]:rotate-180 group-data-[state=open]:text-gold-2" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[70] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)] overflow-hidden rounded-2xl border border-line bg-surface/95 p-1 shadow-[0_24px_48px_-16px_rgb(60_40_15/.4)] backdrop-blur-xl data-[state=open]:animate-[dropdown_.18s_cubic-bezier(.2,.9,.3,1.2)]"
        >
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={enc(o.value)}
                className={cn("relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-3 text-sm outline-none transition-colors data-[highlighted]:bg-gold-1/15 data-[state=checked]:font-medium", o.className)}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2.5"><Check className="size-4 text-gold-2" /></SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
