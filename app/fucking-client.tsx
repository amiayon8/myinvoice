"use client";

import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
// @ts-ignore
import NProgress from 'nprogress';

interface PreloaderProps {
  color?: string;
  showSpinner?: boolean;
}

export default function Preloader({ color = 'var(--primary)', showSpinner = false }: PreloaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: showSpinner, trickleSpeed: 200 });
  }, [showSpinner]);

  // Complete progress bar on route changes
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept pushState
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      NProgress.start();
      return originalPushState.apply(window.history, args);
    };

    // Intercept replaceState
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (...args) {
      NProgress.start();
      return originalReplaceState.apply(window.history, args);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: ${color};
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px ${color}, 0 0 5px ${color};
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}} />
  );
}
