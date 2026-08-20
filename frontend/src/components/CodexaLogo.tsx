'use client';

import React from 'react';

interface CodexaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export default function CodexaLogo({
  size = 'md',
  showText = true,
  layout = 'horizontal',
  className = '',
}: CodexaLogoProps) {
  const sizeMap = {
    sm: { img: 'w-7 h-7 rounded-lg', text: 'text-base font-black tracking-[0.2em]' },
    md: { img: 'w-9 h-9 rounded-xl', text: 'text-xl font-black tracking-[0.2em]' },
    lg: { img: 'w-14 h-14 rounded-2xl', text: 'text-3xl font-black tracking-[0.25em]' },
    xl: { img: 'w-20 h-20 rounded-2xl', text: 'text-4xl font-black tracking-[0.25em]' },
  };

  const { img, text } = sizeMap[size];

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center justify-center text-center group ${className}`}>
        <div className={`relative overflow-hidden shrink-0 shadow-[0_0_24px_rgba(191,69,7,0.3)] border border-[#bf4507]/40 group-hover:scale-105 transition-transform mb-3 ${img}`}>
          <img src="/logo.png" alt="Codexa Logo" className="w-full h-full object-cover" />
        </div>
        {showText && (
          <span className={`text-white font-sans ${text}`}>
            CODEXA
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className={`relative overflow-hidden shrink-0 shadow-[0_0_16px_rgba(191,69,7,0.25)] border border-[#bf4507]/40 group-hover:scale-105 transition-transform ${img}`}>
        <img src="/logo.png" alt="Codexa Logo" className="w-full h-full object-cover" />
      </div>
      {showText && (
        <span className={`text-white font-sans ${text}`}>
          CODEXA
        </span>
      )}
    </div>
  );
}
