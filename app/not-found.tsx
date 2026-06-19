import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative flex flex-col justify-center items-center bg-slate-50 dark:bg-[#020617] px-6 min-h-screen overflow-hidden font-sans">

      {/* Ambient glow blobs */}
      <div
        aria-hidden="true"
        className="top-0 left-1/2 absolute opacity-20 dark:opacity-10 blur-3xl rounded-full w-[700px] h-[400px] -translate-x-1/2 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="right-0 bottom-0 absolute opacity-10 dark:opacity-5 blur-3xl rounded-full w-[400px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #f43f5e 0%, transparent 70%)' }}
      />

      {/* Card */}
      <div className="z-10 relative flex flex-col items-center w-full max-w-lg text-center">

        {/* Giant 404 */}
        <div className="relative mb-2 select-none">
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
            className="absolute inset-0 opacity-30 blur-2xl font-black text-[clamp(6rem,20vw,10rem)] leading-none tracking-tighter select-none"
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
        <div className="flex justify-center items-center bg-indigo-500/10 dark:bg-indigo-500/20 shadow-inner mb-6 rounded-2xl w-16 h-16">
          <i className="text-indigo-500 text-2xl fa-solid fa-file-circle-question"></i>
        </div>

        {/* Heading */}
        <h1 className="mb-3 font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="mb-8 max-w-sm text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL or navigate back to safety.
        </p>

        {/* Actions */}
        <div className="flex sm:flex-row flex-col justify-center gap-3 w-full">
          <Link
            href="/dashboard"
            className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25 shadow-lg px-6 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5"
          >
            <i className="fa-solid fa-gauge-high"></i>
            Go to Dashboard
          </Link>
        </div>

        {/* Decorative dots grid */}
        <div
          aria-hidden="true"
          className="-right-32 -bottom-32 absolute opacity-[0.04] dark:opacity-[0.06] w-64 h-64"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Bottom label */}
      <p className="bottom-6 absolute font-bold text-[10px] text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">
        MyInvoice &mdash; Error 404
      </p>
    </div>
  );
}
