import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#020617] overflow-hidden font-sans px-6">

      {/* Ambient glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 dark:opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full opacity-10 dark:opacity-5 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, #f43f5e 0%, transparent 70%)' }}
      />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">

        {/* Giant 404 */}
        <div className="relative select-none mb-2">
          <span
            className="font-black text-[clamp(6rem,20vw,10rem)] leading-none tracking-tighter"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #f43f5e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </span>
          {/* Subtle shadow underneath the number */}
          <span
            aria-hidden="true"
            className="absolute inset-0 font-black text-[clamp(6rem,20vw,10rem)] leading-none tracking-tighter blur-2xl opacity-30 select-none"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #f43f5e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center mb-6 shadow-inner">
          <i className="fa-solid fa-file-circle-question text-2xl text-indigo-500"></i>
        </div>

        {/* Heading */}
        <h1 className="font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight mb-3">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL or navigate back to safety.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 px-6 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5"
          >
            <i className="fa-solid fa-gauge-high"></i>
            Go to Dashboard
          </Link>
          <Link
            href="/invoices"
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5"
          >
            <i className="fa-solid fa-file-invoice"></i>
            Invoices
          </Link>
        </div>

        {/* Decorative dots grid */}
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-64 h-64 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Bottom label */}
      <p className="absolute bottom-6 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">
        MyInvoice &mdash; Error 404
      </p>
    </div>
  );
}
