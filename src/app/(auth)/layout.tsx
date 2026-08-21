// Route groups like (auth) don't get their own entry in Next's generated
// LayoutRoutes map (it only covers segments with a real URL), so the
// LayoutProps<...> helper doesn't apply here — a plain children prop does.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      {children}
    </div>
  );
}
