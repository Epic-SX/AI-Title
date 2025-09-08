/**
 * React Hook for Category Lookup
 * Provides easy access to category lookup functionality in React components
 */

import { useState, useCallback } from 'react';
import { lookupProductCategory, enhanceResultWithCategory, enhanceResultsWithCategory, getCategoryInfo, searchCategories } from '../utils/categoryLookup';

interface CategoryInfo {
  number?: string;
  main_category?: string;
  sub_category?: string;
  item_type?: string;
  specific_type?: string;
  brand?: string;
  full_description?: string;
}

interface UseCategoryLookupReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  lookupCategory: (productData: any) => Promise<CategoryInfo | null>;
  enhanceResult: (result: any) => Promise<any>;
  enhanceResults: (results: any[]) => Promise<any[]>;
  getCategory: (categoryNumber: string) => Promise<CategoryInfo | null>;
  searchCategories: (keywords: string[]) => Promise<CategoryInfo | null>;
  
  // Utilities
  clearError: () => void;
}

export function useCategoryLookup(): UseCategoryLookupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: any) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    setError(errorMessage);
    console.error('[useCategoryLookup] Error:', errorMessage);
  }, []);

  const lookupCategory = useCallback(async (productData: any): Promise<CategoryInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await lookupProductCategory(productData);
      
      if (result.success && result.category) {
        return result.category;
      } else {
        setError(result.message || 'No category found');
        return null;
      }
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const enhanceResult = useCallback(async (result: any): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const enhancedResult = await enhanceResultWithCategory(result);
      return enhancedResult;
    } catch (err) {
      handleError(err);
      return result; // Return original result on error
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const enhanceResults = useCallback(async (results: any[]): Promise<any[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const enhancedResults = await enhanceResultsWithCategory(results);
      return enhancedResults;
    } catch (err) {
      handleError(err);
      return results; // Return original results on error
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const getCategory = useCallback(async (categoryNumber: string): Promise<CategoryInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCategoryInfo(categoryNumber);
      
      if (result.success && result.category) {
        return result.category;
      } else {
        setError(result.message || 'Category not found');
        return null;
      }
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const searchCategoriesByKeywords = useCallback(async (keywords: string[]): Promise<CategoryInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await searchCategories(keywords);
      
      if (result.success && result.category) {
        return result.category;
      } else {
        setError(result.message || 'No categories found');
        return null;
      }
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  return {
    // State
    loading,
    error,
    
    // Actions
    lookupCategory,
    enhanceResult,
    enhanceResults,
    getCategory,
    searchCategories: searchCategoriesByKeywords,
    
    // Utilities
    clearError
  };
}

