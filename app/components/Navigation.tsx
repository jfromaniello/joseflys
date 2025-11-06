"use client";

import Link from "next/link";

type Calculator = "home" | "tas" | "course" | "conversions" | "planning" | "distance";

interface NavigationProps {
  currentPage: Calculator;
}

const calculators = [
  {
    id: "home" as const,
    name: "Home",
    href: "/",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    id: "tas" as const,
    name: "TAS Calculator",
    href: "/tas",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
  {
    id: "course" as const,
    name: "Course Calculator",
    href: "/course",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    ),
  },
  {
    id: "distance" as const,
    name: "Distance Calculator",
    href: "/distance",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    id: "conversions" as const,
    name: "Unit Converter",
    href: "/conversions",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    ),
  },
  {
    id: "planning" as const,
    name: "Flight Planning",
    href: "/planning",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export function Navigation({ currentPage }: NavigationProps) {
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap print:hidden">
      {calculators.map((calc, index) => (
        <div key={calc.id} className="flex items-center gap-4">
          <Link
            href={calc.href}
            className={`inline-flex items-center gap-2 text-sm transition-colors ${
              calc.id === currentPage
                ? "font-semibold cursor-default"
                : "hover:brightness-125"
            }`}
            style={{
              color:
                calc.id === currentPage
                  ? "white"
                  : "oklch(0.65 0.15 230)",
            }}
            onClick={(e) => {
              if (calc.id === currentPage) {
                e.preventDefault();
              }
            }}
          >
            {calc.icon}
            {calc.name}
          </Link>
          {index < calculators.length - 1 && (
            <span style={{ color: "oklch(0.4 0.02 240)" }}>•</span>
          )}
        </div>
      ))}
    </div>
  );
}
