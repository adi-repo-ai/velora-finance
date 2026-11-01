import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,box-shadow,background] active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-2",
  {
    variants: {
      variant: {
        gold: "bg-gradient-to-b from-gold-1 to-gold-2 text-on-gold shadow-[inset_0_1px_0_rgb(255_255_255/.5),0_14px_30px_-12px_rgb(122_82_38/.7)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/.5),0_18px_36px_-12px_rgb(122_82_38/.8)]",
        glass: "bg-surface/70 text-text shadow-[0_6px_18px_rgb(80_60_30/.12),inset_0_1px_0_#fff] hover:bg-surface",
        ghost: "text-muted hover:text-text hover:bg-surface/50",
        danger: "text-negative hover:bg-negative/10",
        destructive: "bg-negative text-white shadow-[0_14px_30px_-12px_rgb(215_85_61/.6)] hover:bg-negative/90",
      },
      size: { sm: "h-8 px-3.5 text-[13px]", md: "h-10 px-5 text-sm", lg: "h-14 px-7 text-base", icon: "size-9" },
    },
    defaultVariants: { variant: "gold", size: "md" },
  },
);

/** `loading` disables the button and shows a spinner while keeping its label (and width) visible. */
export function Button({
  className, variant, size, asChild = false, loading = false, disabled, children, ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }) {
  if (asChild) return <Slot.Root data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props}>{children}</Slot.Root>;
  return (
    <button data-slot="button" className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}
