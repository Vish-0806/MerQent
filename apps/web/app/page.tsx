import React from 'react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 md:p-24 bg-gradient-to-b from-[#0B0F19] via-[#0F172A] to-[#0B0F19]">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-slate-800 bg-slate-900/60 pb-6 pt-8 backdrop-blur-2xl md:static md:w-auto md:rounded-xl md:border md:bg-slate-900/40 md:p-4">
          MerQent&nbsp;
          <code className="font-mono font-bold text-blue-400">
            v1.0.0 (Phase 1 Master Architecture)
          </code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-[#0B0F19] via-[#0B0F19] md:static md:h-auto md:w-auto md:bg-none">
          <span className="flex place-items-center gap-2 p-8 md:p-0 text-slate-400">
            Post-Merger Integration Marketplace
          </span>
        </div>
      </div>

      <div className="relative flex flex-col items-center text-center my-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-6">
          <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          Enterprise B2B Architecture Grounded
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Unifying Post-Merger Expertise for{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400">
            Private Equity
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
          The specialized platform connecting private equity sponsors with vetted operators
          experienced in consolidating ERPs, organizational cultures, accounting systems, and TSA
          exits post-acquisition.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors">
          <h2 className="text-xl font-semibold text-white mb-2">Private Equity Firms</h2>
          <p className="text-sm text-slate-400">
            Post complex integration mandates with confidential entity masking. Access grounded AI
            matching across 21 domain parameters.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors">
          <h2 className="text-xl font-semibold text-white mb-2">PMI Consultants</h2>
          <p className="text-sm text-slate-400">
            Showcase verified ERP cutover experience, multi-deal track records, and availability
            bands with multi-tier verification.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors">
          <h2 className="text-xl font-semibold text-white mb-2">Realtime & AI Grounding</h2>
          <p className="text-sm text-slate-400">
            WebSockets collaboration, calendar scheduling, and zero-hallucination AI recommendations
            grounded in verified PostgreSQL records.
          </p>
        </div>
      </div>

      <footer className="w-full text-center py-8 text-xs text-slate-500 border-t border-slate-800/60 mt-16">
        MerQent Platform &bull; Node.js + NestJS + Next.js + PostgreSQL + Prisma + WebSockets &bull;
        All Rights Reserved
      </footer>
    </main>
  );
}
