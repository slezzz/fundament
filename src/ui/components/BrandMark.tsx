export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="16" height="16" rx="2" fill="var(--ink)" />
      <rect x="4" y="3" width="8" height="3" fill="var(--bg)" />
      <rect x="4" y="3" width="3" height="8" fill="var(--bg)" />
      <rect x="4" y="7" width="5" height="2" fill="var(--bg)" />
      <rect x="4" y="12" width="8" height="2" fill="var(--clay)" />
    </svg>
  );
}
