"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, ...props }: ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgb(60_45_25/.18)] backdrop-blur-sm data-[state=open]:animate-[fadein_.2s_ease]" />
      <DialogPrimitive.Content
        className={cn(
          "glass fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-[30px] p-7 outline-none",
          className,
        )}
        {...props}
      >
        <div>
          <DialogPrimitive.Title className="font-serif text-4xl leading-none">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm text-muted">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </div>
        {children}
        <DialogPrimitive.Close className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-faint hover:bg-surface/60 hover:text-text" aria-label="Close">
          ✕
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
