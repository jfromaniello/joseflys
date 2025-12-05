"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Dialog, Transition, TransitionChild, DialogPanel, Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";

type Page = "home" | "tas" | "course" | "leg" | "conversions" | "planning" | "route" | "local-chart" | "segments" | "isa" | "climb" | "vstall" | "takeoff" | "my-planes" | "flight-plans" | "conditions";

interface NavbarProps {
  currentPage: Page;
}

// ========== FLIGHT PLANNING ==========
const flightPlanningTools = [
  {
    id: "leg" as const,
    name: "Leg Planner",
    href: "/leg",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "course" as const,
    name: "Course Calculator",
    href: "/course",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    ),
  },
  {
    id: "route" as const,
    name: "Route Calculator",
    href: "/route",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    id: "planning" as const,
    name: "Flight Planning",
    href: "/planning",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "local-chart" as const,
    name: "Local Chart",
    href: "/local-chart",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "conditions" as const,
    name: "Airport Conditions",
    href: "/conditions",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
];

// ========== AIRCRAFT PERFORMANCE ==========
const aircraftPerformance = [
  {
    id: "climb" as const,
    name: "Climb Calculator",
    href: "/climb",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
  {
    id: "vstall" as const,
    name: "V-Stall Calculator",
    href: "/vstall",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    id: "takeoff" as const,
    name: "Takeoff Performance",
    href: "/takeoff",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 18Q14 18 16 14T18 6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 8l3-2 1 3" />
      </svg>
    ),
  },
];

// ========== UTILITIES ==========
const utilities = [
  {
    id: "conversions" as const,
    name: "Unit Converter",
    href: "/conversions",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    id: "tas" as const,
    name: "TAS Calculator",
    href: "/tas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: "isa" as const,
    name: "ISA Calculator",
    href: "/isa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
];

// ========== EDUCATIONAL ==========
const educational = [
  {
    id: "segments" as const,
    name: "LNAV Segments",
    href: "/segments",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

// ========== USER DATA ==========
const otherPages = [
  {
    id: "my-planes" as const,
    name: "My Planes",
    href: "/my-planes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    id: "flight-plans" as const,
    name: "My Flight Plans",
    href: "/flight-plans",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const allPages = [...flightPlanningTools, ...aircraftPerformance, ...utilities, ...educational, ...otherPages];

export function Navbar({ currentPage }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentPageData = allPages.find((p) => p.id === currentPage);
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-gray-800 print:hidden">
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Logo / Brand */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0 cursor-pointer">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-sky-500/20 border border-sky-500/30 group-hover:bg-sky-500/30 transition-colors">
                <svg
                  className="w-5 h-5 text-sky-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-base leading-tight">José Flies</div>
                <div className="text-xs text-gray-400 -mt-0.5">Aviation Tools</div>
              </div>
              {isDev && (
                <div className="ml-2 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40">
                  <span className="text-xs font-bold text-amber-400">DEV</span>
                </div>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center ml-auto">
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer">
                  {currentPage === "home" ? (
                    <svg
                      className="w-5 h-5"
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
                  ) : (
                    currentPageData?.icon
                  )}
                  <span>{currentPage === "home" ? "Home" : currentPageData?.name}</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </MenuButton>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-slate-900 shadow-xl border border-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
                    <div className="py-1">
                      {/* Flight Planning */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Flight Planning
                      </div>
                      {flightPlanningTools.map((tool) => (
                        <MenuItem key={tool.id}>
                          {({ focus }) => (
                            <Link
                              href={tool.href}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                tool.id === currentPage
                                  ? "bg-sky-500/20 text-sky-400"
                                  : focus
                                  ? "bg-slate-800 text-white"
                                  : "text-gray-300"
                              }`}
                            >
                              {tool.icon}
                              <span>{tool.name}</span>
                            </Link>
                          )}
                        </MenuItem>
                      ))}

                      {/* Aircraft Performance */}
                      <div className="border-t border-gray-700 mt-1 pt-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Aircraft Performance
                      </div>
                      {aircraftPerformance.map((tool) => (
                        <MenuItem key={tool.id}>
                          {({ focus }) => (
                            <Link
                              href={tool.href}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                tool.id === currentPage
                                  ? "bg-sky-500/20 text-sky-400"
                                  : focus
                                  ? "bg-slate-800 text-white"
                                  : "text-gray-300"
                              }`}
                            >
                              {tool.icon}
                              <span>{tool.name}</span>
                            </Link>
                          )}
                        </MenuItem>
                      ))}

                      {/* Utilities */}
                      <div className="border-t border-gray-700 mt-1 pt-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Utilities
                      </div>
                      {utilities.map((tool) => (
                        <MenuItem key={tool.id}>
                          {({ focus }) => (
                            <Link
                              href={tool.href}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                tool.id === currentPage
                                  ? "bg-sky-500/20 text-sky-400"
                                  : focus
                                  ? "bg-slate-800 text-white"
                                  : "text-gray-300"
                              }`}
                            >
                              {tool.icon}
                              <span>{tool.name}</span>
                            </Link>
                          )}
                        </MenuItem>
                      ))}

                      {/* Educational */}
                      <div className="border-t border-gray-700 mt-1 pt-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Educational
                      </div>
                      {educational.map((tool) => (
                        <MenuItem key={tool.id}>
                          {({ focus }) => (
                            <Link
                              href={tool.href}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                tool.id === currentPage
                                  ? "bg-sky-500/20 text-sky-400"
                                  : focus
                                  ? "bg-slate-800 text-white"
                                  : "text-gray-300"
                              }`}
                            >
                              {tool.icon}
                              <span>{tool.name}</span>
                            </Link>
                          )}
                        </MenuItem>
                      ))}

                      {/* User Data */}
                      <div className="border-t border-gray-700 mt-1" />
                      {otherPages.map((page) => (
                        <MenuItem key={page.id}>
                          {({ focus }) => (
                            <Link
                              href={page.href}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                page.id === currentPage
                                  ? "bg-sky-500/20 text-sky-400"
                                  : focus
                                  ? "bg-slate-800 text-white"
                                  : "text-gray-300"
                              }`}
                            >
                              {page.icon}
                              <span>{page.name}</span>
                            </Link>
                          )}
                        </MenuItem>
                      ))}
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center p-1.5 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <Transition appear show={isMobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 md:hidden"
          onClose={() => setIsMobileMenuOpen(false)}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full justify-end">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="w-full max-w-sm min-h-full bg-slate-900 shadow-xl">
                  {/* Mobile menu header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-slate-900 z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-500/20 border border-sky-500/30">
                        <svg
                          className="w-6 h-6 text-sky-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">José Flies</span>
                          {isDev && (
                            <div className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                              <span className="text-xs font-bold text-amber-400">DEV</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">Aviation Tools</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Mobile menu items */}
                  <div className="p-4 space-y-1">
                    <Link
                      href="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all cursor-pointer ${
                        currentPage === "home"
                          ? "bg-sky-500/20 text-sky-400"
                          : "text-gray-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
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
                      Home
                    </Link>

                    {/* Flight Planning */}
                    <div className="pt-3 pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Flight Planning
                    </div>
                    {flightPlanningTools.map((tool) => (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all cursor-pointer ${
                          tool.id === currentPage
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {tool.icon}
                        {tool.name}
                      </Link>
                    ))}

                    {/* Aircraft Performance */}
                    <div className="pt-3 pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Aircraft Performance
                    </div>
                    {aircraftPerformance.map((tool) => (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all cursor-pointer ${
                          tool.id === currentPage
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {tool.icon}
                        {tool.name}
                      </Link>
                    ))}

                    {/* Utilities */}
                    <div className="pt-3 pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Utilities
                    </div>
                    {utilities.map((tool) => (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all cursor-pointer ${
                          tool.id === currentPage
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {tool.icon}
                        {tool.name}
                      </Link>
                    ))}

                    {/* Educational */}
                    <div className="pt-3 pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Educational
                    </div>
                    {educational.map((tool) => (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all cursor-pointer ${
                          tool.id === currentPage
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {tool.icon}
                        {tool.name}
                      </Link>
                    ))}

                    {/* User Data */}
                    <div className="border-t border-gray-700 my-2" />
                    {otherPages.map((page) => (
                      <Link
                        key={page.id}
                        href={page.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all cursor-pointer ${
                          page.id === currentPage
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {page.icon}
                        {page.name}
                      </Link>
                    ))}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-14 print:hidden" />
    </>
  );
}
