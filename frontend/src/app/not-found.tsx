import React from 'react';
import Link from 'next/link';
import { Ghost, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl shadow-2xl relative overflow-hidden max-w-lg w-full">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
        <Ghost className="w-24 h-24 text-zinc-800 mx-auto mb-6" />
        <h1 className="text-6xl font-black text-white tracking-tighter mb-2">404</h1>
        <h2 className="text-xl font-bold text-zinc-300 mb-6">Page Not Found</h2>
        <p className="text-zinc-500 mb-8 font-medium">
          The page you are looking for does not exist or has been moved to another universe.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-zinc-200 transition-transform hover:scale-105 active:scale-95">
          <ArrowLeft className="w-4 h-4" /> Go Home
        </Link>
      </div>
    </div>
  );
}
