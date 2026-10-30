import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "h-11 w-full rounded-2xl border border-line bg-surface/70 px-4 text-[15px] text-text placeholder:text-faint shadow-[inset_0_1px_2px_rgb(80_60_30/.06)] outline-none transition focus:border-gold-1 focus:bg-surface focus:ring-4 focus:ring-gold-1/20 aria-invalid:border-negative";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClass, "appearance-none pr-9 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2 4l4 4 4-4%22 fill=%22none%22 stroke=%22%238a8478%22 stroke-width=%221.5%22/></svg>')] bg-[right_14px_center] bg-no-repeat", className)} {...props} />;
}
