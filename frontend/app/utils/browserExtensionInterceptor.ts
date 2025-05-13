/**
 * Utility to clean browser extension attributes from DOM elements
 * This helps prevent hydration mismatches due to browser extensions
 * like form fillers or password managers that add attributes to inputs
 */

// Attributes commonly added by browser extensions
const BROWSER_EXTENSION_ATTRIBUTES = [
  'fdprocessedid',
  'data-lastpass-field-index',
  'data-lastpass-fieldid',
  'data-form-type',
  'data-hcaptcha-widget-id',
  'data-form-type-autodetect',
  'aria-autocomplete',
  'data-hermes-pointer-events-id'
];

/**
 * Removes browser extension attributes from an element and its children
 * @param element The DOM element to clean
 */
export function cleanBrowserExtensionAttributes(element: HTMLElement | Document = document) {
  if (!element) return;
  
  // Skip if not in browser environment
  if (typeof window === 'undefined') return;
  
  const process = (el: Element) => {
    // Remove known browser extension attributes
    BROWSER_EXTENSION_ATTRIBUTES.forEach(attr => {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
      }
    });
    
    // Process all children
    Array.from(el.children).forEach(child => process(child));
  };
  
  // Start processing from the root element
  if (element === document) {
    process(document.documentElement);
  } else {
    process(element as Element);
  }
}

/**
 * Creates a MutationObserver to clean browser extension attributes 
 * when new DOM elements are added
 */
export function setupBrowserExtensionInterceptor() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {}; // Return empty cleanup function
  }
  
  // Initial cleaning
  cleanBrowserExtensionAttributes();
  
  // Setup observer for future changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            cleanBrowserExtensionAttributes(node as HTMLElement);
          }
        });
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Return cleanup function
  return () => observer.disconnect();
} 