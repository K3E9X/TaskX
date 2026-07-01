type Props = { size?: number; withWordmark?: boolean; className?: string };

/**
 * TaskX mark — a shield-inscribed monogram.
 * Two crossed bars form an "X" that doubles as a security shield silhouette,
 * with a small accent notch suggesting a checkmark / scan target.
 */
export function TaskXMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TaskX"
    >
      <defs>
        <linearGradient id="taskx-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.18 0.03 210)" />
          <stop offset="100%" stopColor="oklch(0.11 0.02 220)" />
        </linearGradient>
        <linearGradient id="taskx-x1" x1="6" y1="8" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.88 0.14 195)" />
          <stop offset="100%" stopColor="oklch(0.72 0.15 195)" />
        </linearGradient>
        <linearGradient id="taskx-x2" x1="34" y1="8" x2="6" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.82 0.14 180)" />
          <stop offset="100%" stopColor="oklch(0.62 0.14 200)" />
        </linearGradient>
        <linearGradient id="taskx-edge" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.78 0.15 195 / 0.45)" />
          <stop offset="100%" stopColor="oklch(0.78 0.15 195 / 0.08)" />
        </linearGradient>
      </defs>

      {/* Shield-rounded tile */}
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#taskx-bg)" />
      <rect x="1.5" y="1.5" width="37" height="37" rx="9.5" stroke="url(#taskx-edge)" />

      {/* Subtle inner grid hint (security/precision) */}
      <g opacity="0.1" stroke="oklch(0.78 0.15 195)" strokeWidth="0.5">
        <path d="M20 4 V36" />
        <path d="M4 20 H36" />
      </g>

      {/* Two crossing bars forming the X */}
      <path
        d="M10 11 L29 30"
        stroke="url(#taskx-x1)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M30 11 L11 30"
        stroke="url(#taskx-x2)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />

      {/* Accent dot — scan target / status indicator */}
      <circle cx="31.5" cy="9" r="2.2" fill="oklch(0.88 0.14 195)" />
      <circle cx="31.5" cy="9" r="2.2" stroke="oklch(0.11 0.02 220)" strokeWidth="0.8" />
    </svg>
  );
}

export function TaskXLogo({ size = 28, withWordmark = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <TaskXMark size={size} />
      {withWordmark && (
        <span className="text-[1.05rem] leading-none flex items-baseline">
          <span>Task</span>
          <span
            className="ml-[1px] bg-gradient-to-br from-primary to-[oklch(0.72_0.14_180)] bg-clip-text text-transparent font-bold"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            X
          </span>
        </span>
      )}
    </span>
  );
}
