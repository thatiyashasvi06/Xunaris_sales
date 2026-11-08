import React from 'react';

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Subtle Tech Grid overlay matching xunaris.com */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60" />

      {/* Floating Animated Gradient Orb 1 (Xunaris Blue) */}
      <div
        className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#0063f2]/15 via-[#6366f1]/10 to-transparent blur-3xl animate-float-slow"
      />

      {/* Floating Animated Gradient Orb 2 (Xunaris Emerald / Mint) */}
      <div
        className="absolute -bottom-40 -left-40 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#00d084]/12 via-[#0063f2]/10 to-transparent blur-3xl animate-float-reverse"
      />

      {/* Floating Animated Gradient Orb 3 (Xunaris Indigo / Purple Center Glow) */}
      <div
        className="absolute top-1/3 left-1/4 w-[420px] h-[420px] rounded-full bg-gradient-to-r from-[#6366f1]/8 via-[#00c6ff]/8 to-transparent blur-3xl animate-pulse-glow"
      />

      {/* Subtle Floating Star / Dust Accents */}
      <div className="absolute top-20 left-[15%] w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-ping" />
      <div className="absolute top-1/2 right-[10%] w-2 h-2 rounded-full bg-emerald-400/30 animate-pulse" />
      <div className="absolute bottom-24 left-[35%] w-1.5 h-1.5 rounded-full bg-indigo-400/40 animate-ping" />
    </div>
  );
};
