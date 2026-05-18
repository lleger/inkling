// Inkling brand mark and wordmark.
// The mark is a teardrop atop a stem on a 96×96 grid. The drop carries the
// user's chosen accent (--color-accent, already theme-aware); the stem is
// always ink (currentColor, inherits from text). Locked silhouette: tear.
// Spec lives in the design handoff at `Inkling Brand Lock.html`.

type InklingMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function InklingMark({ size = 24, className, title }: InklingMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="42" y="51" width="12" height="40" rx="6" fill="currentColor" />
      <path
        d="M 48 5 C 48 5, 34 21, 34 29 a 14 14 0 0 0 28 0 C 62 21, 48 5, 48 5 Z"
        fill="var(--color-accent)"
      />
    </svg>
  );
}

type InklingWordmarkProps = {
  size?: number;
  className?: string;
};

// "[mark] Inkling" — the mark sits on the text baseline (stem bottom = baseline),
// like an oversized capital. The viewBox is cropped to remove the 5u of empty
// space below the stem so the SVG's bottom edge IS the stem bottom; combined
// with align-items: baseline this lands the stem on the baseline of "Inkling".
export function InklingWordmark({ size = 28, className }: InklingWordmarkProps) {
  const markSize = size * 1.1;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: size * 0.18,
        fontFamily: 'var(--font-brand-serif), "Fraunces", "Times New Roman", serif',
        fontSize: size,
        fontWeight: 500,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={markSize}
        height={markSize * (91 / 96)}
        viewBox="0 0 96 91"
        aria-hidden="true"
        style={{ display: "inline-block" }}
      >
        <rect x="42" y="51" width="12" height="40" rx="6" fill="currentColor" />
        <path
          d="M 48 5 C 48 5, 34 21, 34 29 a 14 14 0 0 0 28 0 C 62 21, 48 5, 48 5 Z"
          fill="var(--color-accent)"
        />
      </svg>
      <span>Inkling</span>
    </span>
  );
}
