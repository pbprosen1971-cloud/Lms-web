import React from 'react';

interface MedhaLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  withBackground?: boolean;
}

export default function MedhaLogo({
  className = 'h-6 w-6',
  withBackground = false,
  ...props
}: MedhaLogoProps) {
  if (withBackground) {
    return (
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        {/* Background rounded container */}
        <rect width="512" height="512" rx="96" fill="#38B262" />
        {/* Exam sheet card */}
        <rect
          x="144"
          y="108"
          width="224"
          height="296"
          rx="48"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Top header line */}
        <line x1="184" y1="160" x2="328" y2="160" stroke="#FFFFFF" strokeWidth="8" />
        {/* Middle question lines */}
        <line x1="192" y1="188" x2="236" y2="188" stroke="#FFFFFF" strokeWidth="8" />
        <line x1="276" y1="188" x2="320" y2="188" stroke="#FFFFFF" strokeWidth="8" />
        <line x1="192" y1="214" x2="236" y2="214" stroke="#FFFFFF" strokeWidth="8" />
        <line x1="276" y1="214" x2="320" y2="214" stroke="#FFFFFF" strokeWidth="8" />
        {/* Middle divider line */}
        <line x1="184" y1="248" x2="328" y2="248" stroke="#FFFFFF" strokeWidth="8" />
        {/* Bottom marked bubble */}
        <circle cx="217" cy="316" r="17" fill="#FFFFFF" />
        {/* Bottom checkmark */}
        <path
          d="M 252 316 L 280 344 L 332 280"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Icon only (for embedding inside a styled colored container with currentColor / white)
  return (
    <svg
      viewBox="130 94 252 324"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Exam sheet card */}
      <rect
        x="144"
        y="108"
        width="224"
        height="296"
        rx="48"
        fill="none"
        stroke="currentColor"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top header line */}
      <line x1="184" y1="160" x2="328" y2="160" stroke="currentColor" strokeWidth="8" />
      {/* Middle question lines */}
      <line x1="192" y1="188" x2="236" y2="188" stroke="currentColor" strokeWidth="8" />
      <line x1="276" y1="188" x2="320" y2="188" stroke="currentColor" strokeWidth="8" />
      <line x1="192" y1="214" x2="236" y2="214" stroke="currentColor" strokeWidth="8" />
      <line x1="276" y1="214" x2="320" y2="214" stroke="currentColor" strokeWidth="8" />
      {/* Middle divider line */}
      <line x1="184" y1="248" x2="328" y2="248" stroke="currentColor" strokeWidth="8" />
      {/* Bottom marked bubble */}
      <circle cx="217" cy="316" r="17" fill="currentColor" />
      {/* Bottom checkmark */}
      <path
        d="M 252 316 L 280 344 L 332 280"
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
