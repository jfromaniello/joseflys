"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/app/components/Navbar";
import { AerodromeSearchInput, AerodromeResult } from "@/app/components/AerodromeSearchInput";

export default function ConditionsPage() {
  const router = useRouter();
  const [selectedAerodrome, setSelectedAerodrome] = useState<AerodromeResult | null>(null);

  const handleAerodromeSelect = (aerodrome: AerodromeResult | null) => {
    setSelectedAerodrome(aerodrome);
    if (aerodrome?.code) {
      router.push(`/conditions/${aerodrome.code}`);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="conditions" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-white mb-3">
              Airport Conditions
            </h1>
            <p className="text-slate-400">
              View current weather, runway information, and aerodrome details
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8">
            <AerodromeSearchInput
              value={selectedAerodrome}
              onChange={handleAerodromeSelect}
              label="Select Aerodrome"
              placeholder="Search by ICAO code or airport name..."
              showLabel={true}
            />

            <p className="text-sm text-slate-500 mt-4 text-center">
              Enter an ICAO code (e.g., SAEZ, KJFK) or search by airport name
            </p>
          </div>

          {/* Recent/Popular Airports (optional future feature) */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              Argentina airports (AD/LAD) and worldwide ICAO airports supported
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
