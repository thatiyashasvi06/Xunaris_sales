import React from 'react';
import xunarisFullLogoImg from '../../assets/xunaris-full-logo.png';
import xunarisIconImg from '../../assets/xunaris-icon.png';

export const XunarisLogo = ({ size = 'default', showText = true, className = '', iconOnly = false }) => {
  // If icon-only or showText is false, render the official glowing 'X' icon
  if (!showText || iconOnly) {
    const iconSize =
      size === 'xs'
        ? 'w-5 h-5'
        : size === 'sm'
        ? 'w-7 h-7'
        : size === 'lg'
        ? 'w-12 h-12'
        : size === 'xl'
        ? 'w-16 h-16'
        : 'w-9 h-9';

    return (
      <div className={`shrink-0 relative flex items-center justify-center ${className}`}>
        <img
          src={xunarisIconImg}
          alt="Xunaris Logo"
          className={`${iconSize} object-contain rounded-lg drop-shadow-[0_0_12px_rgba(0,198,255,0.45)]`}
        />
      </div>
    );
  }

  // Full Brand Logo Presentation with the official glowing Xunaris wordmark
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
    size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[12px]' : size === 'xl' ? 'text-xs' : 'text-[10px]';

  return (
    <div className={`flex flex-col gap-1 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <img
          src={xunarisFullLogoImg}
          alt="Xunaris Logo"
          className={`${logoHeight} w-auto object-contain drop-shadow-[0_0_12px_rgba(0,198,255,0.45)]`}
        />
        <span className="w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse shrink-0" />
      </div>
      <span className={`${subTextSize} font-bold tracking-widest text-slate-400 uppercase font-mono`}>
        HYRA CONNECT <span className="text-slate-600 font-normal">|</span> CRM
      </span>
    </div>
  );
};
