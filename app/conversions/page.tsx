"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import { Navigation } from "../components/Navigation";
import {
  categories,
  getAllConversions,
  type Category,
} from "@/lib/unitConversions";

function ConversionCalculator() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [category, setCategory] = useState<Category>(
    (searchParams.get("cat") as Category) || "distance"
  );
  const [value, setValue] = useState<string>(
    searchParams.get("val") || "100"
  );
  const [fromUnit, setFromUnit] = useState<string>(
    searchParams.get("from") || categories.distance.units[0].symbol
  );
  const [shareSuccess, setShareSuccess] = useState(false);

  // Update URL when inputs change
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("cat", category);
    if (value) params.set("val", value);
    if (fromUnit) params.set("from", fromUnit);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [category, value, fromUnit, router]);

  // Update fromUnit when category changes if current unit is invalid
  useEffect(() => {
    const currentCategory = categories[category];
    const isValidUnit = currentCategory.units.some(
      (u) => u.symbol === fromUnit
    );
    if (!isValidUnit) {
      setFromUnit(currentCategory.units[0].symbol);
    }
  }, [category, fromUnit]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: "Aviation Unit Converter",
      text: `Convert ${value} ${fromUnit} - Aviation Unit Converter`,
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      console.log("Share cancelled or failed");
    }
  };

  const numValue = parseFloat(value);
  const results = !isNaN(numValue)
    ? getAllConversions(numValue, fromUnit, category)
    : [];

  const currentCategory = categories[category];

  return (
    <PageLayout>
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-800/50 backdrop-blur-sm border border-gray-700">
              <svg
                className="w-9 h-9"
                fill="none"
                stroke="oklch(0.65 0.15 230)"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold"
              style={{ color: "white" }}
            >
              José&apos;s Unit Converter
            </h1>
          </div>
          <p
            className="text-base sm:text-lg mb-4"
            style={{ color: "oklch(0.58 0.02 240)" }}
          >
            Aviation unit conversions inspired by the Jeppesen CR-3
          </p>
          <Navigation currentPage="conversions" />
      </div>

      <main className="w-full max-w-3xl">
        {/* Main Calculator Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 mb-8 shadow-2xl">
          {/* Category Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <label
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: "oklch(0.7 0.15 230)" }}
              >
                Category
                <Tooltip content="Select the type of units you want to convert" />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(categories) as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    category === cat
                      ? "shadow-lg scale-105"
                      : "hover:scale-105 active:scale-95"
                  }`}
                  style={{
                    backgroundColor:
                      category === cat
                        ? "oklch(0.65 0.15 230)"
                        : "oklch(0.25 0.02 240)",
                    color: category === cat ? "white" : "oklch(0.72 0.015 240)",
                    borderWidth: "2px",
                    borderColor:
                      category === cat
                        ? "oklch(0.7 0.15 230)"
                        : "oklch(0.35 0.02 240)",
                  }}
                >
                  {categories[cat].name}
                </button>
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <label
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: "oklch(0.7 0.15 230)" }}
              >
                Convert From
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Value Input */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                    placeholder="100"
                    step="any"
                  />
                </div>
              </div>

              {/* Unit Selection */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Unit
                </label>
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer"
                >
                  {currentCategory.units.map((unit) => (
                    <option key={unit.symbol} value={unit.symbol}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "oklch(0.7 0.15 230)" }}
                >
                  Results
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((result, idx) => {
                  const unitInfo = currentCategory.units.find(
                    (u) => u.symbol === result.unit
                  );
                  return (
                    <div
                      key={idx}
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        {unitInfo?.name}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {result.value.toFixed(2)}
                        </span>
                        <span
                          className="text-lg font-medium"
                          style={{ color: "oklch(0.72 0.015 240)" }}
                        >
                          {result.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Share Button */}
          <div className="text-center mt-6">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: "oklch(0.65 0.15 230)",
                color: "oklch(0.145 0.02 240)",
              }}
            >
              {shareSuccess ? (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
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
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share Result
                </>
              )}
            </button>
          </div>
        </div>

      </main>

      <Footer description="Aviation Unit Converter - Convert distances, speeds, fuel, temperature, weight, and pressure units" />
    </PageLayout>
  );
}

export default function ConversionsPage() {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div
              className="text-lg font-medium"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Loading calculator...
            </div>
          </div>
        </PageLayout>
      }
    >
      <ConversionCalculator />
    </Suspense>
  );
}
