'use client';

import { useMemo, useState } from "react";
import { CropArea } from "@/lib/chartCutter";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ImageUploader } from "./components/ImageUploader";
import { ImageCropper } from "./components/ImageCropper";
import { ImageScaler } from "./components/ImageScaler";

const steps = [
  { id: 1, title: "Upload source image", description: "Original chart or photo" },
  { id: 2, title: "Define crop", description: "Select the usable area" },
  { id: 3, title: "Scale & export", description: "Set DPI and download" },
] as const;

type StepId = (typeof steps)[number]["id"];

export function ChartCutterClient() {
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);

  const canGoBack = currentStep > 1;

  const handleImageUpload = (imageDataUrl: string) => {
    if (imageDataUrl) {
      setUploadedImage(imageDataUrl);
      setCropArea(null);
      setCurrentStep(2);
    } else {
      resetAll();
    }
  };

  const handleCropComplete = (area: CropArea) => {
    setCropArea(area);
    setCurrentStep(3);
  };

  const handleDownloadComplete = () => {
    setTimeout(() => {
      if (typeof window !== "undefined") {
        const restart = window.confirm("Process another chart?");
        if (restart) {
          resetAll();
        }
      }
    }, 400);
  };

  const resetAll = () => {
    setUploadedImage(null);
    setCropArea(null);
    setCurrentStep(1);
  };

  const stepLabel = useMemo(() => steps.find((step) => step.id === currentStep)?.title, [currentStep]);

  return (
    <PageLayout currentPage="chart-cutter">
      <CalculatorPageHeader
        title="Chart Cutter"
        description="Crop scanned charts or cockpit photos, overlay centimeter guides, and export the final cutout with exact DPI metadata for predictable printing."
      />

      <main className="w-full max-w-4xl print-hide-footer">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Guided workflow</p>
              <h2 className="text-2xl font-semibold text-white">{stepLabel}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = currentStep > step.id;
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-semibold transition-all ${
                        isActive
                          ? "border-sky-500 bg-sky-500/20 text-white"
                          : isCompleted
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                          : "border-slate-800 bg-slate-900 text-slate-500"
                      }`}
                    >
                      {step.id}
                    </div>
                    <div className="hidden text-sm md:block">
                      <p className={`font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>{step.title}</p>
                      <p className="text-xs text-slate-500">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden h-px w-12 bg-slate-800 md:block" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          {currentStep === 1 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
              <header className="mb-6 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Step 1</p>
                <h3 className="text-2xl font-semibold text-white">Load your chart or panel photo</h3>
                <p className="mt-2 text-sm text-slate-400">Drag the image into the drop zone or select it from disk.</p>
              </header>
              <ImageUploader currentImage={uploadedImage} onImageUpload={handleImageUpload} />
            </div>
          )}

          {currentStep === 2 && uploadedImage && (
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
              <header className="text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Step 2</p>
                <h3 className="text-2xl font-semibold text-white">Mark the useful area</h3>
                <p className="mt-2 text-sm text-slate-400">The crop keeps the original pixels—no resampling occurs.</p>
              </header>
              <ImageCropper
                imageSrc={uploadedImage}
                onCropComplete={handleCropComplete}
                initialCrop={cropArea || undefined}
              />
            </div>
          )}

          {currentStep === 3 && uploadedImage && cropArea && (
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
              <header className="text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Step 3</p>
                <h3 className="text-2xl font-semibold text-white">Set the print scale and export</h3>
                <p className="mt-2 text-sm text-slate-400">DPI only changes the physical size on paper—the pixels stay untouched.</p>
              </header>
              <ImageScaler imageSrc={uploadedImage} cropArea={cropArea} onDownload={handleDownloadComplete} />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-[0.45em] text-slate-500">Runs fully offline</div>
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev))}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-500 cursor-pointer"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-500 cursor-pointer"
            >
              Reset workflow
            </button>
          </div>
        </div>
      </main>

      <Footer description="Crop once, embed precise DPI metadata, and print charts at a predictable size directly from your browser." />
    </PageLayout>
  );
}
