import Link from "next/link";
import { Footer } from "@/components/footer";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 pb-10 pt-6 sm:px-8">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-3xl">
          <span className="size-8 rounded-full bg-[conic-gradient(from_0deg,#c99b5b,#7a5226,#f3dcb0,#7a5226,#c99b5b)] shadow-[0_0_16px_rgb(201_155_91/.45)]" aria-hidden />Velora
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-text">← Back to Velora</Link>
      </header>
      <main className="glass enter mx-auto w-full max-w-3xl p-8 sm:p-12 [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-3xl [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted">
        {children}
      </main>
      <div className="mt-auto"><Footer /></div>
    </div>
  );
}
