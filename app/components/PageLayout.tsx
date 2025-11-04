import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      {children}
    </div>
  );
}
