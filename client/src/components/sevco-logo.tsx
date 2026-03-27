/**
 * SevcoLogo — Reusable SEVCO planet icon component.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  WARNING: Do NOT add overflow-hidden to the wrapper div of this        │
 * │  component, and do NOT reduce the padding (p-0.5 minimum). Doing so   │
 * │  will clip the edges of the planet image. The overflow-visible and     │
 * │  padding exist specifically to protect the logo from clipping when     │
 * │  surrounding layout changes.                                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Props:
 *   size       — pixel size of the square container (default 28)
 *   className  — extra classes applied to the <img> (e.g. "opacity-60")
 *   imgStyle   — inline styles applied to the <img> (e.g. drop-shadow filter)
 *   invert     — controls dark-mode inversion:
 *                  "dark"   (default) — adds `dark:invert` for auto dark-mode flip
 *                  "always"           — adds `invert` (always inverted)
 *                  "none"             — no invert class at all
 *   alt        — alt text for the image
 */
import planetBlack from "@assets/SEVCO_planet_icon_black_1774331331137.png";
import type { CSSProperties } from "react";

interface SevcoLogoProps {
  size?: number | string;
  className?: string;
  imgStyle?: CSSProperties;
  invert?: "dark" | "always" | "none";
  alt?: string;
}

export function SevcoLogo({
  size = 28,
  className = "",
  imgStyle,
  invert = "dark",
  alt = "SEVCO Planet",
}: SevcoLogoProps) {
  const px = typeof size === "number" ? `${size}px` : size;

  const invertClass =
    invert === "always" ? "invert" :
    invert === "dark"   ? "dark:invert" :
    "";

  return (
    /*
     * overflow-visible is intentional — DO NOT change to overflow-hidden.
     * p-0.5 buffer prevents the image from touching the container edge.
     */
    <div
      className="flex items-center justify-center shrink-0 overflow-visible p-0.5"
      style={{ width: px, height: px }}
    >
      <img
        src={planetBlack}
        alt={alt}
        className={`h-full w-full object-contain ${invertClass} ${className}`.trim()}
        style={imgStyle}
      />
    </div>
  );
}
