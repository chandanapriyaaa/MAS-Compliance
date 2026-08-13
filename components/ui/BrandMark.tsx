/** Compliance-shield brand mark. Single accent, crisp at small sizes. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 2.5 26 6.2v9.3c0 6.6-4.3 11.6-10 13.9-5.7-2.3-10-7.3-10-13.9V6.2L16 2.5Z"
        fill="var(--blue)"
      />
      <path
        d="M16 2.5 26 6.2v9.3c0 6.6-4.3 11.6-10 13.9-5.7-2.3-10-7.3-10-13.9V6.2L16 2.5Z"
        fill="url(#bm)"
        fillOpacity="0.25"
      />
      <path
        d="m11.2 16.2 3.2 3.2 6.4-6.6"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="bm" x1="16" y1="2.5" x2="16" y2="29.4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
