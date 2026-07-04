'use client';

import React, { useRef, useState, useEffect } from 'react';

interface ResponsiveInvoiceWrapperProps {
  children: React.ReactNode;
}

export function ResponsiveInvoiceWrapper({ children }: ResponsiveInvoiceWrapperProps) {
  return (
    <div className="w-full overflow-x-auto py-2 custom-scrollbar">
      <div className="mx-auto w-[800px] min-w-[800px] print:w-auto print:min-w-0">
        {children}
      </div>
    </div>
  );
}

export default ResponsiveInvoiceWrapper;
