/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * 1. bKash Official Vector Logo
 * Features the authentic 'bKash' typography and official 6-facet origami bird symbol.
 */
export const BkashLogo: React.FC<{ className?: string }> = ({ className = "h-7 w-auto" }) => (
  <svg
    viewBox="0 0 160 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="bKash Logo"
  >
    {/* bKash Wordmark */}
    <g transform="translate(6, 32)">
      <text
        fontFamily="'Century Gothic', 'Segoe UI', Arial, sans-serif"
        fontSize="28"
        fontWeight="800"
        fill="#222222"
        letterSpacing="-0.8"
      >
        b<tspan fill="#222222" fontWeight="700">Kash</tspan>
      </text>
      <text
        x="80"
        y="-2"
        fontFamily="'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
        fontSize="12"
        fontWeight="700"
        fill="#E2136E"
      >
        বিকাশ
      </text>
    </g>

    {/* Official Origami Bird Symbol (6 faceted geometric polygons) */}
    <g transform="translate(108, 3) scale(0.92)">
      {/* Front upper wing */}
      <polygon points="12,14 42,16 24,32 10,24" fill="#E2136E" />
      {/* Central body */}
      <polygon points="24,32 42,16 48,25 32,42" fill="#C1105A" />
      {/* Head / Beak */}
      <polygon points="42,16 52,19 48,25" fill="#D82A6D" />
      {/* Lower wing / tail */}
      <polygon points="32,42 16,45 20,35" fill="#990B47" />
      <polygon points="20,35 32,42 24,32" fill="#E2136E" />
      {/* Leading light facet */}
      <polygon points="2,16 12,14 10,24" fill="#EA3A85" />
    </g>
  </svg>
);

/**
 * 2. Nagad Official Vector Logo
 * Features the signature postal runner swirl and bold Bengali 'নগদ' wordmark.
 */
export const NagadLogo: React.FC<{ className?: string }> = ({ className = "h-7 w-auto" }) => (
  <svg
    viewBox="0 0 165 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Nagad Logo"
  >
    <defs>
      <linearGradient id="nagadBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F99F1B" />
        <stop offset="45%" stopColor="#F15A24" />
        <stop offset="100%" stopColor="#ED1C24" />
      </linearGradient>
    </defs>

    {/* Dynamic Gradient Swirl with Postal Runner */}
    <g transform="translate(4, 4)">
      <circle cx="20" cy="20" r="19" fill="url(#nagadBrandGradient)" />
      {/* Radiant yellow swirl highlight */}
      <path
        d="M20,4 C29,4 37,12 37,20 C37,25 34,29 30,32 C26,28 23,22 23,16 C23,10 26,6 20,4 Z"
        fill="#FFD200"
        opacity="0.9"
      />
      {/* White shine accent */}
      <path
        d="M5,20 C5,11 12,4 20,4 C16,9 14,15 16,21 C17,26 21,30 20,36 C12,36 5,28 5,20 Z"
        fill="#FFFFFF"
        opacity="0.25"
      />
      {/* Running Postman Silhouette */}
      <g transform="translate(11.5, 9) scale(0.62)" fill="#FFFFFF">
        <circle cx="12" cy="5.5" r="3" />
        <path d="M11,9.5 L15,17.5 L18,25 L15,25 L12,18 L9,25 L6,25 L10,15.5 L8,11.5 Z" />
        <path d="M7,11.5 Q4,14.5 6,17.5 Q9,18.5 10,14.5 Z" />
        <line x1="3" y1="13.5" x2="19" y2="9.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="2" y="13.5" width="3" height="3.5" rx="0.8" fill="#FFFFFF" />
      </g>
    </g>

    {/* Bengali 'নগদ' Typography and Subtitle */}
    <g transform="translate(52, 2)">
      <text
        x="0"
        y="27"
        fontFamily="'Hind Siliguri', 'Kalpurush', 'Noto Sans Bengali', sans-serif"
        fontSize="29"
        fontWeight="900"
        fill="#ED1C24"
        letterSpacing="0.4"
      >
        নগদ
      </text>
      <text
        x="1"
        y="39"
        fontFamily="'Hind Siliguri', 'Kalpurush', sans-serif"
        fontSize="7"
        fontWeight="700"
        fill="#404040"
        letterSpacing="-0.2"
      >
        ডাক বিভাগের ডিজিটাল লেনদেন
      </text>
    </g>
  </svg>
);

/**
 * 3. Rocket (DBBL) Official Vector Logo
 * Features Dutch-Bangla Bank's iconic purple brand style, origami jet plane, and dual English/Bengali typography.
 */
export const RocketLogo: React.FC<{ className?: string }> = ({ className = "h-7 w-auto" }) => (
  <svg
    viewBox="0 0 160 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Rocket DBBL Logo"
  >
    {/* DBBL Rocket Flying Paper Jet Symbol */}
    <g transform="translate(102, 6) scale(0.68)">
      <path d="M42,2 L2,24 L18,27 L42,2 Z" fill="#FFFFFF" />
      <path d="M18,27 L22,38 L28,30 L42,2 Z" fill="#E8D5EC" />
      <path d="M28,30 L42,2 L18,27 Z" fill="#FFFFFF" />
    </g>

    {/* English 'ROCKET' Tag */}
    <text
      x="8"
      y="15"
      fontFamily="Arial, sans-serif"
      fontSize="9.5"
      fontWeight="900"
      fill="#FFFFFF"
      letterSpacing="1.8"
    >
      ROCKET
    </text>

    {/* Bold Bengali 'রকেট' */}
    <text
      x="7"
      y="32"
      fontFamily="'Hind Siliguri', 'Kalpurush', sans-serif"
      fontSize="19"
      fontWeight="900"
      fill="#FFFFFF"
      letterSpacing="0.8"
    >
      রকেট
    </text>

    {/* Dutch-Bangla Bank Subtitle */}
    <text
      x="7"
      y="41"
      fontFamily="'Hind Siliguri', sans-serif"
      fontSize="6"
      fontWeight="600"
      fill="#F2E6F5"
    >
      ডাচ-বাংলা ব্যাংক মোবাইল ব্যাংকিং
    </text>
  </svg>
);

/**
 * 4. Upay (UCB Fintech) Official Vector Logo
 * Features the signature smiling two-tone arch and Upay typography.
 */
export const UpayLogo: React.FC<{ className?: string }> = ({ className = "h-7 w-auto" }) => (
  <svg
    viewBox="0 0 150 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Upay Logo"
  >
    {/* Smiling 'U' Brand Mark */}
    <g transform="translate(6, 4)">
      {/* Left Yellow Dot */}
      <circle cx="10" cy="8" r="4.8" fill="#FFC800" />
      {/* Right Blue Dot */}
      <circle cx="28" cy="8" r="4.8" fill="#005BAA" />

      {/* Smiling U Curve (Yellow Left / Blue Right) */}
      <path
        d="M5,16 C5,26 11,33.5 19,33.5 C27,33.5 33,26 33,16 L25,16 C25,22 22.5,26.5 19,26.5 C15.5,26.5 13,22 13,16 Z"
        fill="#005BAA"
      />
      <path
        d="M5,16 C5,26 11,33.5 19,33.5 L19,26.5 C15.5,26.5 13,22 13,16 Z"
        fill="#FFC800"
      />
    </g>

    {/* Upay Typography (Bengali & English) */}
    <g transform="translate(50, 4)">
      <text
        x="0"
        y="25"
        fontFamily="'Hind Siliguri', 'Kalpurush', sans-serif"
        fontSize="24"
        fontWeight="900"
        fill="#005BAA"
        letterSpacing="0.4"
      >
        উপায়
      </text>
      <text
        x="2"
        y="38"
        fontFamily="'Century Gothic', Arial, sans-serif"
        fontSize="11"
        fontWeight="800"
        fill="#4B5563"
        letterSpacing="0.8"
      >
        upay
      </text>
    </g>
  </svg>
);

/**
 * PaymentPartnersBar Component
 * Renders all 4 official payment partners horizontally aligned with consistent dimensions,
 * brand color borders, hover animations, and tailored background color schemes.
 */
export const PaymentPartnersBar: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {/* 1. bKash Partner Card */}
      <div
        id="payment-partner-bkash"
        className="w-32 sm:w-36 h-12 sm:h-13 bg-white rounded-xl shadow-sm border border-[#E2136E]/20 hover:border-[#E2136E] hover:shadow-md hover:shadow-[#E2136E]/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-default select-none px-3 py-1.5 flex items-center justify-center group"
        title="bKash (বিকাশ) - অনুমোদিত পেমেন্ট পার্টনার"
      >
        <BkashLogo className="h-7 sm:h-8 w-full max-w-[120px] object-contain transition-transform duration-200 group-hover:scale-105" />
      </div>

      {/* 2. Nagad Partner Card */}
      <div
        id="payment-partner-nagad"
        className="w-32 sm:w-36 h-12 sm:h-13 bg-white rounded-xl shadow-sm border border-[#ED1C24]/20 hover:border-[#ED1C24] hover:shadow-md hover:shadow-[#ED1C24]/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-default select-none px-3 py-1.5 flex items-center justify-center group"
        title="Nagad (নগদ) - ডাক বিভাগের ডিজিটাল লেনদেন"
      >
        <NagadLogo className="h-7 sm:h-8 w-full max-w-[120px] object-contain transition-transform duration-200 group-hover:scale-105" />
      </div>

      {/* 3. Rocket Partner Card (DBBL Purple Brand Theme) */}
      <div
        id="payment-partner-rocket"
        className="w-32 sm:w-36 h-12 sm:h-13 bg-gradient-to-r from-[#8C3494] to-[#711E79] rounded-xl shadow-sm border border-[#A845B2]/40 hover:border-[#C060CB] hover:shadow-md hover:shadow-[#8C3494]/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-default select-none px-2.5 py-1 flex items-center justify-center group"
        title="Rocket (রকেট) - ডাচ-বাংলা ব্যাংক মোবাইল ব্যাংকিং"
      >
        <RocketLogo className="h-8 sm:h-8.5 w-full max-w-[125px] object-contain transition-transform duration-200 group-hover:scale-105" />
      </div>

      {/* 4. Upay Partner Card */}
      <div
        id="payment-partner-upay"
        className="w-32 sm:w-36 h-12 sm:h-13 bg-white rounded-xl shadow-sm border border-[#005BAA]/20 hover:border-[#005BAA] hover:shadow-md hover:shadow-[#005BAA]/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-default select-none px-3 py-1.5 flex items-center justify-center group"
        title="Upay (উপায়) - ইউসিবি ফিনটেক কোম্পানি"
      >
        <UpayLogo className="h-7 sm:h-8 w-full max-w-[115px] object-contain transition-transform duration-200 group-hover:scale-105" />
      </div>
    </div>
  );
};

export default PaymentPartnersBar;

