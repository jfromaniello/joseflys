"use client";

import Link from "next/link";

type Calculator = "home" | "tas" | "winds" | "conversions";

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
    id: "winds" as const,
    name: "Wind Calculator",
    href: "/winds",
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
];

export function Navigation({ currentPage }: NavigationProps) {
  const visibleCalculators = calculators.filter((calc) => calc.id !== currentPage);

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {visibleCalculators.map((calc, index) => (
        <div key={calc.id} className="flex items-center gap-4">
          <Link
            href={calc.href}
            className="inline-flex items-center gap-2 text-sm transition-colors hover:brightness-125"
            style={{ color: "oklch(0.65 0.15 230)" }}
          >
            {calc.icon}
            {calc.name}
          </Link>
          {index < visibleCalculators.length - 1 && (
            <span style={{ color: "oklch(0.4 0.02 240)" }}>•</span>
          )}
        </div>
      ))}
    </div>
  );
}
