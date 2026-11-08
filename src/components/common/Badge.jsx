import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold'
  };

  const variantClasses = {
    // Default & neutrals
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    dark: 'bg-slate-900 text-white',

    // Statuses
    new: 'bg-blue-50 text-blue-700 border border-blue-200',
    contacted: 'bg-purple-50 text-purple-700 border border-purple-200',
    qualified: 'bg-amber-50 text-amber-700 border border-amber-200',
    proposal: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    converted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    lost: 'bg-rose-50 text-rose-700 border border-rose-200',

    // Priorities
    urgent: 'bg-red-500 text-white shadow-sm font-bold animate-pulse',
    high: 'bg-rose-50 text-rose-700 border border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    low: 'bg-slate-100 text-slate-600 border border-slate-200',

    // Approvals
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
    correction: 'bg-orange-50 text-orange-700 border border-orange-200',

    // Payroll Types
    xunaris_payroll: 'bg-blue-900 text-blue-100 border border-blue-700 font-bold',
    partner_payroll: 'bg-teal-800 text-teal-100 border border-teal-600 font-bold',

    // AI
    ai_live: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    ai_demo: 'bg-amber-100 text-amber-800 border border-amber-300 font-mono text-[11px]'
  };

  const selectedVariant = variantClasses[variant.toLowerCase()] || variantClasses.default;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${selectedVariant} ${className}`}>
      {children}
    </span>
  );
};
