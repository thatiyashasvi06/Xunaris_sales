import React from 'react';
import hyraFullLogoImg from '../../assets/hyra-full-logo.png';

export const HyraLogo = ({ size = 'default', showText = true, className = '', iconOnly = false }) => {
  const logoHeight =
    size === 'xs'
      ? 'h-5'
      : size === 'sm'
      ? 'h-6'
      : size === 'lg'
      ? 'h-10'
      : size === 'xl'
      ? 'h-12'
      : 'h-8';

  const subTextSize =
    size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[11px]' : size === 'xl' ? 'text-xs' : 'text-[10px]';

  if (!showText || iconOnly) {
    return (
      <div className={`shrink-0 relative flex items-center justify-center ${className}`}>
        <img
          src={hyraFullLogoImg}
          alt="HYRA Connect Logo"
          className={`${logoHeight} w-auto object-contain drop-shadow-[0_0_12px_rgba(0,198,255,0.45)]`}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <img
          src={hyraFullLogoImg}
          alt="HYRA Connect Logo"
          className={`${logoHeight} w-auto object-contain drop-shadow-[0_0_12px_rgba(0,198,255,0.45)]`}
        />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
      </div>
      <span className={`${subTextSize} font-bold tracking-widest text-cyan-300/80 uppercase font-mono`}>
        AI Talent &bull; Staffing Network
      </span>
    </div>
  );
};
