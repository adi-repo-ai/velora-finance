import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SessionGuard } from "@/components/session-guard";
import { CubeLoader } from "@/components/cube-loader";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 pb-10 pt-4 sm:px-8">
      <SessionGuard />
      <Nav />
      <main className="mx-auto w-full max-w-[1380px]">
        {/* Pages depend on today's date, so they render per request rather than at build time. */}
        <Suspense fallback={<CubeLoader label="Loading your vault" className="min-h-[460px]" />}>{children}</Suspense>
      </main>
      <div className="mt-auto"><Footer /></div>
    </div>
  );
}
