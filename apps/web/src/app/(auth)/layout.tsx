import { Footer } from "@/components/footer";
import { TiltCard } from "@/components/tilt-card";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-[440px] gap-8">
        <div className="text-center">
          <span className="mx-auto mb-4 block size-12 rounded-full bg-[conic-gradient(from_0deg,#c99b5b,#7a5226,#f3dcb0,#7a5226,#c99b5b)] shadow-[0_0_30px_rgb(201_155_91/.5)]" aria-hidden />
          <p className="font-serif text-6xl leading-none">Velora</p>
          <p className="mt-2 text-sm text-muted">Your money, all in one place.</p>
        </div>
        <TiltCard>{children}</TiltCard>
        <Footer compact />
      </div>
    </main>
  );
}
