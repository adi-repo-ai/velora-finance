"use client";

import { CalendarDays } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { GlassCalendar } from "@/components/ui/glass-calendar";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Date field that opens the glass calendar. Submits `name` as yyyy-mm-dd through a hidden input,
 * so forms read it from FormData exactly like a native date input.
 */
export function DatePicker({
  id, name, defaultValue = "", placeholder = "Pick a date", min, "aria-invalid": invalid,
}: { id: string; name: string; defaultValue?: string; placeholder?: string; min?: string; "aria-invalid"?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const label = value ? new Date(`${value}T00:00:00`).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger id={id} aria-invalid={invalid} className={cn(fieldClass, "flex items-center gap-3 text-left", !value && "text-faint")}>
        <CalendarDays className="size-[18px] shrink-0 text-muted" aria-hidden />
        <span className="flex-1 truncate">{label || placeholder}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} collisionPadding={12} className="z-[60] w-[min(340px,calc(100vw-24px))] outline-none data-[state=open]:animate-[fadein_.15s_ease]">
          <GlassCalendar value={value || null} min={min} onSelect={(d) => { setValue(d); setOpen(false); }} className="bg-surface/90 shadow-[0_30px_60px_-20px_rgb(60_40_15/.45)] backdrop-blur-2xl" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
