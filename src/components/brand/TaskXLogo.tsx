type Props = { size?: number; withWordmark?: boolean; className?: string };

export function TaskXMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TaskX"
    >
      <defs>
        <linearGradient id="taskx-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.78 0.16 270)" />
          <stop offset="100%" stopColor="oklch(0.55 0.14 240)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#taskx-g)" />
      <rect x="1" y="1" width="30" height="30" rx="8" stroke="oklch(1 0 0 / 0.18)" />
      <path
        d="M9.5 16.4l4.1 4.1 9-9"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TaskXLogo({ size = 28, withWordmark = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <TaskXMark size={size} />
      {withWordmark && (
        <span className="text-[1.05rem] leading-none">
          Task<span className="text-primary">X</span>
        </span>
      )}
    </span>
  );
}
