/**
 * Utility to suppress React hydration warnings for browser-added attributes
 * like fdprocessedid which are added by some form processing extensions
 */
export function suppressHydrationWarnings() {
  if (typeof window !== 'undefined') {
    // Save the original console.error
    const originalConsoleError = console.error;
    
    // Override console.error to filter out hydration warnings for known attributes
    console.error = (...args: any[]) => {
      // Check if this is a hydration warning about mismatched attributes
      if (
        args.length > 0 && 
        typeof args[0] === 'string' && 
        (
          args[0].includes('Hydration failed because the initial UI does not match what was rendered on the server') ||
          args[0].includes('Warning: Text content did not match') ||
          args[0].includes('Warning: An error occurred during hydration') ||
          args[0].includes('There was an error while hydrating')
        )
      ) {
        // Check if it's specifically about fdprocessedid
        if (
          args.some(arg => 
            typeof arg === 'string' && 
            (arg.includes('fdprocessedid') || arg.includes('data-lastpass'))
          )
        ) {
          // Ignore this specific hydration warning
          return;
        }
      }
      
      // Call the original console.error for all other cases
      originalConsoleError.apply(console, args);
    };
  }
} 