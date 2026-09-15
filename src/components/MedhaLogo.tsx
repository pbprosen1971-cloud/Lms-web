import React from 'react';

interface MedhaLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  withBackground?: boolean;
}

/**
 * MedhaLogo - Updated brand logo featuring the continuous stylized 'M' monogram
 * with origami blue inner fold, crisp white ribbon paths, and verified checkmark badge.
 */
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
        <defs>
          <linearGradient id="medhaLogoBgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00a854" />
            <stop offset="100%" stopColor="#008f45" />
          </linearGradient>
          <linearGradient id="medhaLogoFoldGrad" x1="100" y1="90" x2="250" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="medhaLogoRightGrad" x1="230" y1="220" x2="360" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="medhaLogoBadgeGrad" x1="320" y1="310" x2="420" y2="430" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="60%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <filter id="medhaLogoShadow" x="270" y="270" width="180" height="180" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* 1. Rounded Square Background */}
        <rect width="512" height="512" rx="115" fill="url(#medhaLogoBgGrad)" />

        {/* 2. The Blue Origami Fold */}
        <path
          d="M 112 118 C 112 105 125 96 138 103 L 260 220 L 230 250 L 112 135 Z"
          fill="url(#medhaLogoFoldGrad)"
        />

        {/* 3. The Continuous Tubular 'M' Shape */}
        <g strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M 100 335 L 100 125 C 100 102 124 92 142 108 L 335 305"
            stroke="#ffffff"
            strokeWidth="42"
            fill="none"
          />
          <path
            d="M 230 220 L 340 115"
            stroke="url(#medhaLogoRightGrad)"
            strokeWidth="42"
            fill="none"
          />
          <path
            d="M 345 125 L 345 285"
            stroke="#ffffff"
            strokeWidth="42"
            fill="none"
          />
        </g>

        {/* 4. Lower-right Verified Checkmark Badge */}
        <circle cx="368" cy="368" r="68" fill="#ffffff" filter="url(#medhaLogoShadow)" />
        <circle cx="368" cy="368" r="56" fill="url(#medhaLogoBadgeGrad)" />
        <path
          d="M 336 368 L 358 390 L 404 336"
          stroke="#ffffff"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  // Icon only (for embedding inside a styled colored container with proper colors & transparency)
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="medhaLogoFoldGradIcon" x1="100" y1="90" x2="250" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="medhaLogoRightGradIcon" x1="230" y1="220" x2="360" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="medhaLogoBadgeGradIcon" x1="320" y1="310" x2="420" y2="430" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="60%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <filter id="medhaLogoShadowIcon" x="270" y="270" width="180" height="180" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Blue Origami Fold */}
      <path
        d="M 112 118 C 112 105 125 96 138 103 L 260 220 L 230 250 L 112 135 Z"
        fill="url(#medhaLogoFoldGradIcon)"
      />

      {/* Continuous 'M' Shape */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M 100 335 L 100 125 C 100 102 124 92 142 108 L 335 305"
          stroke="currentColor"
          strokeWidth="42"
          fill="none"
        />
        <path
          d="M 230 220 L 340 115"
          stroke="url(#medhaLogoRightGradIcon)"
          strokeWidth="42"
          fill="none"
        />
        <path
          d="M 345 125 L 345 285"
          stroke="currentColor"
          strokeWidth="42"
          fill="none"
        />
      </g>

      {/* Lower-right Verified Checkmark Badge */}
      <circle cx="368" cy="368" r="68" fill="#ffffff" filter="url(#medhaLogoShadowIcon)" />
      <circle cx="368" cy="368" r="56" fill="url(#medhaLogoBadgeGradIcon)" />
      <path
        d="M 336 368 L 358 390 L 404 336"
        stroke="#ffffff"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
