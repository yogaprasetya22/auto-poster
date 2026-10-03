import React from 'react';

interface SkeletonContainerProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SkeletonContainer: React.FC<SkeletonContainerProps> = ({
  isLoading,
  children,
  className = '',
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div
      className={`animate-pulse pointer-events-none select-none
        [&_p]:!bg-slate-200 [&_p]:!text-transparent [&_p]:!rounded-md [&_p]:!border-transparent
        [&_h1]:!bg-slate-200 [&_h1]:!text-transparent [&_h1]:!rounded-md [&_h1]:!border-transparent
        [&_h2]:!bg-slate-200 [&_h2]:!text-transparent [&_h2]:!rounded-md [&_h2]:!border-transparent
        [&_h3]:!bg-slate-200 [&_h3]:!text-transparent [&_h3]:!rounded-md [&_h3]:!border-transparent
        [&_span]:!bg-slate-200 [&_span]:!text-transparent [&_span]:!rounded-md [&_span]:!border-transparent
        [&_a]:!bg-white/80 [&_a]:!border-slate-200/60
        [&_button]:!bg-slate-200 [&_button]:!text-transparent [&_button]:!border-transparent
        [&_img]:!opacity-0 [&_img]:!bg-slate-200
        [&_svg]:!opacity-0
        dark:[&_p]:!bg-slate-700
        dark:[&_h1]:!bg-slate-700
        dark:[&_h2]:!bg-slate-700
        dark:[&_h3]:!bg-slate-700
        dark:[&_span]:!bg-slate-700
        dark:[&_button]:!bg-slate-700
        dark:[&_img]:!bg-slate-700
        ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};
