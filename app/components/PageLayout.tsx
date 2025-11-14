import { ReactNode } from "react";
import { Navbar } from "./Navbar";

type Page = "home" | "tas" | "course" | "leg" | "conversions" | "planning" | "distance" | "local-chart" | "segments" | "isa" | "climb" | "my-planes" | "flight-plans";

interface PageLayoutProps {
  children: ReactNode;
  currentPage?: Page;
}

export function PageLayout({ children, currentPage = "home" }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage={currentPage} />
      <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 min-h-[calc(100vh-3.5rem)]">
        {children}
      </div>
    </div>
  );
}
