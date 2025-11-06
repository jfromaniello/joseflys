"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import { Navigation } from "../components/Navigation";
import { ShareButton } from "../components/ShareButton";
import {
  categories,
  getAllConversions,
  type Category,
} from "@/lib/unitConversions";

interface ConversionCalculatorClientProps {
  initialCategory: Category;
  initialValue: string;
  initialFromUnit: string;
}

export function ConversionCalculatorClient({
  initialCategory,
  initialValue,
  initialFromUnit,
}: ConversionCalculatorClientProps) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [value, setValue] = useState<string>(initialValue);
  const [fromUnit, setFromUnit] = useState<string>(initialFromUnit);

  // Update URL when inputs change
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("cat", category);
    if (value) params.set("val", value);
    if (fromUnit) params.set("from", fromUnit);

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [category, value, fromUnit]);

  // Handler for category change that validates and updates fromUnit if needed
  const handleCategoryChange = (newCategory: Category) => {
    const newCategoryData = categories[newCategory];
    const isValidUnit = newCategoryData.units.some(
      (u) => u.symbol === fromUnit
    );

    setCategory(newCategory);

    // If current unit is not valid in new category, reset to first unit
    if (!isValidUnit) {
      setFromUnit(newCategoryData.units[0].symbol);
    }
  };

  const numValue = parseFloat(value);
  const results = !isNaN(numValue)
    ? getAllConversions(numValue, fromUnit, category)
    : [];

  const currentCategory = categories[category];

  // Build OG image URL for download
  const hasParams = category || value || fromUnit;
  const ogImageUrl = hasParams
    ? `/api/og-conversions?cat=${category}&val=${value}&from=${fromUnit}`
    : undefined;

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
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                    category === cat
                      ? "shadow-lg"
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
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white h-[52px]"
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
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer h-[52px]"
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
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-3xl font-bold text-white text-right">
                          {new Intl.NumberFormat(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(result.value)}
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
          <div className="mt-6">
            <ShareButton
              shareData={{
                title: "Aviation Unit Converter",
                text: `Convert ${value} ${fromUnit} - Aviation Unit Converter`,
                url: typeof window !== "undefined" ? window.location.href : "",
              }}
              ogImageUrl={ogImageUrl}
            />
          </div>
        </div>

      </main>

      <Footer description="Aviation Unit Converter - Convert distances, speeds, fuel, temperature, weight, and pressure units" />
    </PageLayout>
  );
}
