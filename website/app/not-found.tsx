import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-[clamp(1rem,4vw,2rem)]">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">404</h1>
        <p className="text-xl sm:text-2xl text-white/60 mb-8">Page not found</p>
        <Link href="/" className="btn btn-primary">
          Go back home
        </Link>
      </div>
    </div>
  );
}
