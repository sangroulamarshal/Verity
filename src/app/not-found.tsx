import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Image src="/logo-mark.png" alt="Verity" width={48} height={48} />
      <div>
        <p className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
