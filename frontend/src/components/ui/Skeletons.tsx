import React from 'react';

export const SkeletonCard = () => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg animate-pulse">
      <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2"></div>
      <div className="h-4 bg-zinc-800 rounded w-1/2 mb-6"></div>
      <div className="flex justify-between mt-auto">
        <div className="h-8 bg-zinc-800 rounded w-24"></div>
        <div className="h-8 bg-zinc-800 rounded w-24"></div>
      </div>
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg animate-pulse">
      <div className="flex bg-zinc-800/50 p-4 border-b border-zinc-800">
        {Array(cols).fill(0).map((_, i) => (
          <div key={`th-${i}`} className="h-4 bg-zinc-700 rounded flex-1 mx-2"></div>
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={`tr-${i}`} className="flex p-4 border-b border-zinc-800/50">
          {Array(cols).fill(0).map((_, j) => (
            <div key={`td-${i}-${j}`} className="h-4 bg-zinc-800 rounded flex-1 mx-2"></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonText = ({ lines = 3 }) => {
  return (
    <div className="animate-pulse space-y-3">
      {Array(lines).fill(0).map((_, i) => (
        <div key={i} className={`h-4 bg-zinc-800 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}></div>
      ))}
    </div>
  );
};
