'use client';

import { useEffect, useState } from 'react';

/**
 * This component helps solve hydration issues with form elements
 * by only rendering children after hydration is complete
 */
export default function FormHydrationFixer({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Set hydrated flag once component is mounted client-side
    setIsHydrated(true);
  }, []);

  // Only render children after client-side hydration
  if (!isHydrated) {
    return fallback;
  }

  return <>{children}</>;
} 