'use client';

import React, { useRef, useState, useEffect } from 'react';

interface ResponsiveInvoiceWrapperProps {
  children: React.ReactNode;
}

export function ResponsiveInvoiceWrapper({ children }: ResponsiveInvoiceWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState('auto');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const parentWidth = container.clientWidth;
      const baseWidth = 800; // InvoicePreview base width in px
      const baseHeight = 1130; // InvoicePreview approximate base height in px

      if (parentWidth < baseWidth) {
        const newScale = parentWidth / baseWidth;
        setScale(newScale);
        setHeight(`${baseHeight * newScale}px`);
      } else {
        setScale(1);
        setHeight('auto');
      }
    };

    // Run once on mount
    handleResize();

    // Use ResizeObserver for responsive resizing
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center items-start overflow-hidden py-2">
      <div
        className="origin-top transition-all duration-300 ease-out"
        style={{
          transform: `scale(${scale})`,
          width: '800px', // Maintain standard base width
          minWidth: '800px',
          height: height === 'auto' ? 'auto' : height,
          marginBottom: scale < 1 ? `calc(-1130px * (1 - ${scale}))` : '0px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default ResponsiveInvoiceWrapper;
