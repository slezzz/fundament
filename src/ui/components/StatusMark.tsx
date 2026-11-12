import type { StatusCopy } from "../lib/status";

export type SentinelPose = "block" | "open" | "rest" | "alert";

interface Props {
  tone: StatusCopy["tone"];
  /** block = Protected (crossed X); open = allowlisted (spears together). */
  pose?: SentinelPose;
}

/** Degrees from vertical. Crossed ≈ 40°, together ≈ 6°. */
const SPEAR: Record<SentinelPose, number> = {
  rest: 14,
  open: 6,
  block: 40,
  alert: 50,
};

export function poseFromStatus(
  tone: StatusCopy["tone"],
  allowlisted: boolean,
): SentinelPose {
  if (allowlisted) return "open";
  if (tone === "safe") return "block";
  if (tone === "warn" || tone === "danger") return "alert";
  return "rest";
}

export function StatusMark({ tone, pose }: Props) {
  const resolved = pose ?? (tone === "safe" ? "block" : tone === "warn" || tone === "danger" ? "alert" : "rest");
  const angle = SPEAR[resolved];

  return (
    <div className={`mark mark-${tone} mark-pose-${resolved}`} aria-hidden="true">
      <svg
        className="sentinels"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(32 32)">
          <g className="spear" style={{ transform: `rotate(${-angle}deg)` }}>
            <SpearGlyph />
          </g>
          <g className="spear" style={{ transform: `rotate(${angle}deg)` }}>
            <SpearGlyph />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Outline spear along +Y shaft, tip at −Y. Pivot at the crossing. */
function SpearGlyph() {
  return (
    <g>
      <path d="M0 -28 C3.1 -21.5 3.4 -16.2 0 -13.6 C-3.4 -16.2 -3.1 -21.5 0 -28 Z" />
      <line x1="0" y1="-25.5" x2="0" y2="-15.5" />
      <path d="M-3.2 -14.6 L0 -13.2 L3.2 -14.6" />
      <circle cx="0" cy="-13.4" r="1.35" />
      <path d="M-0.5 -12.6 C-4.2 -10.5 -5.4 -6.8 -4.2 -2.8" opacity="0.55" />
      <path d="M0.5 -12.6 C4.2 -10.5 5.4 -6.8 4.2 -2.8" opacity="0.55" />
      <line x1="0" y1="-11.8" x2="0" y2="20" />
      <line x1="-2.1" y1="17.4" x2="2.1" y2="17.4" />
      <line x1="-2.1" y1="19.2" x2="2.1" y2="19.2" />
      <path d="M0 26.2 L2.15 20.4 H-2.15 Z" />
    </g>
  );
}
