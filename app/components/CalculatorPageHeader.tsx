interface CalculatorPageHeaderProps {
  title: string;
  description: string;
  subtitle?: string; // Optional dynamic subtitle (e.g., user-entered flight description)
}

export function CalculatorPageHeader({
  title,
  description,
  subtitle,
}: CalculatorPageHeaderProps) {
  return (
    <div className="text-center mb-6 sm:mb-8 print:mb-3 max-w-3xl mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 print:text-xl" style={{ color: "white" }}>
        {title}
        {subtitle && (
          <span className="block mt-1.5 text-xl sm:text-2xl font-normal" style={{ color: "oklch(0.75 0.15 230)" }}>
            {subtitle}
          </span>
        )}
      </h1>
      <p
        className="text-sm sm:text-base leading-relaxed print:hidden"
        style={{ color: "oklch(0.7 0.02 240)" }}
      >
        {description}
      </p>
    </div>
  );
}
