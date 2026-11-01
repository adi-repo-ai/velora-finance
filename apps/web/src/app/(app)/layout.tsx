import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Skeleton } from "@/components/states";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 pb-10 pt-4 sm:px-8">
      <Nav />
      <main className="mx-auto w-full max-w-[1380px]">
        {/* Pages depend on today's date, so they render per request rather than at build time. */}
        <Suspense fallback={<Skeleton className="h-[460px] w-full rounded-[30px]" />}>{children}</Suspense>
      </main>
      <div className="mt-auto"><Footer /></div>
    </div>
  );
}
