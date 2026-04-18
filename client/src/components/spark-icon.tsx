type SparkIconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface SparkIconProps {
  size?: SparkIconSize;
  className?: string;
  decorative?: boolean;
}

const SIZE_CLASS: Record<SparkIconSize, string> = {
  xs: "text-[11px] leading-none",
  sm: "text-xs leading-none",
  md: "text-sm leading-none",
  lg: "text-base leading-none",
  xl: "text-xl leading-none",
};

export function SparkIcon({ size = "sm", className = "", decorative = false }: SparkIconProps) {
  const sizeClass = SIZE_CLASS[size];
  const ariaProps = decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": "spark" };
  return (
    <span
      className={`inline-block ${sizeClass} ${className}`}
      {...ariaProps}
    >
      ⚡
    </span>
  );
}
