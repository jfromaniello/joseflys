"use client";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm border-2"
      style={{
        background:
          "linear-gradient(to bottom right, oklch(0.65 0.15 230), oklch(0.55 0.15 230))",
        borderColor: "oklch(0.7 0.15 230)",
        color: "white",
      }}
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
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      <span className="hidden sm:inline">Print</span>
      <span className="sm:hidden">Print</span>
    </button>
  );
}
