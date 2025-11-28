"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { DownloadDropdownButton } from "../components/DownloadDropdownButton";
import { ShareDropdownButton } from "../components/ShareDropdownButton";
import {
  loadFlightPlans,
  deleteFlightPlan,
  type FlightPlan,
  buildLocalChartUrl,
} from "@/lib/flightPlan";
import {
  TrashIcon,
  EyeIcon,
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  MapIcon,
} from "@heroicons/react/24/outline";

export function FlightPlansClient() {
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safe: Synchronizing with external system (localStorage)
    // Load flight plans on mount
    const plans = loadFlightPlans();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlightPlans(plans);
    setLoading(false);
  }, []);

  const handleDelete = (planId: string, planName: string) => {
    if (confirm(`Are you sure you want to delete "${planName}"? This will remove all legs in this flight plan.`)) {
      const success = deleteFlightPlan(planId);
      if (success) {
        setFlightPlans(flightPlans.filter((p) => p.id !== planId));
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <PageLayout currentPage="flight-plans">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-400 text-lg">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout currentPage="flight-plans">
      <CalculatorPageHeader
        title="Flight Plans"
        description="View and manage your saved flight plans"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "white" }}
            >
              Your Flight Plans
            </h2>
            <p
              className="text-sm mt-2"
              style={{ color: "oklch(0.7 0.02 240)" }}
            >
              {flightPlans.length === 0
                ? "No flight plans yet. Create a leg and save it to a flight plan to get started."
                : `${flightPlans.length} flight plan${flightPlans.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Create New Button (shown when there are flight plans) */}
          {flightPlans.length > 0 && (
            <div className="mb-6">
              <Link
                href="/flight-plans/create"
                className="inline-flex px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors items-center gap-2 cursor-pointer"
              >
                <PlusIcon className="w-5 h-5" />
                New Flight Plan
              </Link>
            </div>
          )}

          {/* Flight Plans List */}
          {flightPlans.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="text-5xl mb-4"
                style={{ color: "oklch(0.5 0.02 240)" }}
              >
                ✈️
              </div>
              <p
                className="text-lg mb-2"
                style={{ color: "oklch(0.7 0.02 240)" }}
              >
                No flight plans yet
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "oklch(0.6 0.02 240)" }}
              >
                Create a complete flight plan with route and aircraft settings
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/flight-plans/create"
                  className="inline-flex px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors items-center gap-2 justify-center cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create Flight Plan
                </Link>
                <Link
                  href="/leg"
                  className="inline-flex px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors items-center gap-2 justify-center cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create Single Leg
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {flightPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-900/50 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {plan.name}
                      </h3>
                      <div
                        className="text-xs space-y-1"
                        style={{ color: "oklch(0.6 0.02 240)" }}
                      >
                        {plan.date && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{plan.date}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>
                            Updated {formatDate(plan.updated_at)} at{" "}
                            {formatTime(plan.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <DownloadDropdownButton
                        flightPlan={plan}
                        variant="secondary"
                        size="sm"
                        showText={false}
                      />
                      <ShareDropdownButton flightPlan={plan} compact />
                      {buildLocalChartUrl(plan) && (
                        <Link
                          href={buildLocalChartUrl(plan)!}
                          className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                          title="View on map"
                        >
                          <MapIcon className="w-5 h-5" />
                        </Link>
                      )}
                      <Link
                        href={`/flight-plans/${plan.id}`}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                        title="View details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(plan.id, plan.name)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete flight plan"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Legs Summary */}
                  <div className="text-sm">
                    <span className="font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                      {plan.legs.length} leg{plan.legs.length !== 1 ? "s" : ""}
                    </span>
                    {plan.legs.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {plan.legs.map((leg, i) => {
                          // Priority: desc > from.name > fromCity > "Leg N"
                          const legName = leg.desc
                            || leg.from?.name?.split(",")[0]
                            || leg.fromCity?.split(",")[0]
                            || `Leg ${i + 1}`;
                          return (
                            <span key={leg.id} className="flex items-center gap-1.5">
                              {i > 0 && (
                                <span style={{ color: "oklch(0.5 0.02 240)" }}>→</span>
                              )}
                              <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded text-xs font-medium border border-sky-500/30">
                                {legName}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer description="View and manage your saved flight plans with multiple legs" />
    </PageLayout>
  );
}
