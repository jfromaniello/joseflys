interface FooterProps {
  description: string;
}

export function Footer({ description }: FooterProps) {
  return (
    <footer className="text-center mt-8 print-footer">
      <p
        className="text-sm mb-3"
        style={{ color: "oklch(0.52 0.015 240)" }}
      >
        {description}
      </p>
      <div className="flex items-center justify-center gap-2 text-sm">
        <span style={{ color: "oklch(0.52 0.015 240)" }}>
          Feedback or kudos?
        </span>
        <a
          href="https://twitter.com/jfroma"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:brightness-125"
          style={{ color: "oklch(0.65 0.15 230)" }}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          @jfroma
        </a>
      </div>
    </footer>
  );
}
