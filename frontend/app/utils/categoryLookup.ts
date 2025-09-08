/**
 * Category Lookup Utility
 * This utility handles automatic category lookup for products in the Electron app
 */

interface ProductData {
  title?: string;
  タイトル?: string;
  brand?: string;
  ブランド?: string;
  product_type?: string;
  商品タイプ?: string;
  color?: string;
  色?: string;
  size?: string;
  サイズ?: string;
  [key: string]: any;
}

interface CategoryInfo {
  number?: string;
  main_category?: string;
  sub_category?: string;
  item_type?: string;
  specific_type?: string;
  brand?: string;
  full_description?: string;
}

interface CategoryLookupResult {
  success: boolean;
  category?: CategoryInfo;
  message?: string;
}

/**
 * Lookup category for a product using the backend API
 */
export async function lookupProductCategory(productData: ProductData): Promise<CategoryLookupResult> {
  try {
    // Check if we're in Electron environment
    const electronAPI = getElectronAPI();
    if (typeof window !== 'undefined' && electronAPI?.category) {
      console.log('[CATEGORY] Looking up category for product:', productData.title || productData.タイトル);
      
      const result = await electronAPI.category.lookup(productData);
      
      if (result.success && result.category) {
        console.log('[CATEGORY] Category found:', result.category);
        return {
          success: true,
          category: result.category
        };
      } else {
        console.log('[CATEGORY] No category found:', result.message);
        return {
          success: false,
          message: result.message || 'No category found'
        };
      }
    } else {
      console.log('[CATEGORY] Not in Electron environment, skipping category lookup');
      return {
        success: false,
        message: 'Not in Electron environment'
      };
    }
  } catch (error) {
    console.error('[CATEGORY] Error during category lookup:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Enhance product result with category information
 */
export async function enhanceResultWithCategory(result: any): Promise<any> {
  try {
    // Extract product data for category lookup
    const productData: ProductData = {
      title: result.title || result.raw_response?.title,
      タイトル: result.title || result.raw_response?.title,
      brand: result.brand || result.detected_brand || result.raw_response?.brand,
      ブランド: result.brand || result.detected_brand || result.raw_response?.brand,
      product_type: result.product_type || result.item_type || result.raw_response?.product_type,
      商品タイプ: result.product_type || result.item_type || result.raw_response?.product_type,
      color: result.color || result.detected_color || result.raw_response?.color,
      色: result.color || result.detected_color || result.raw_response?.color,
      size: result.size || result.detected_size || result.raw_response?.size,
      サイズ: result.size || result.detected_size || result.raw_response?.size
    };

    // Lookup category
    const categoryResult = await lookupProductCategory(productData);
    
    if (categoryResult.success && categoryResult.category) {
      // Add category to result
      const enhancedResult = {
        ...result,
        category: categoryResult.category
      };

      // Also add to raw_response if it exists
      if (enhancedResult.raw_response) {
        enhancedResult.raw_response.category = categoryResult.category;
      }

      console.log('[CATEGORY] Enhanced result with category:', enhancedResult.category);
      return enhancedResult;
    } else {
      console.log('[CATEGORY] Could not enhance result with category:', categoryResult.message);
      return result;
    }
  } catch (error) {
    console.error('[CATEGORY] Error enhancing result with category:', error);
    return result;
  }
}

/**
 * Enhance multiple results with category information
 */
export async function enhanceResultsWithCategory(results: any[]): Promise<any[]> {
  console.log(`[CATEGORY] Enhancing ${results.length} results with category information`);
  
  const enhancedResults = await Promise.all(
    results.map(async (result) => {
      return await enhanceResultWithCategory(result);
    })
  );

  console.log('[CATEGORY] Enhanced all results with category information');
  return enhancedResults;
}

/**
 * Get category information by category number
 */
export async function getCategoryInfo(categoryNumber: string): Promise<CategoryLookupResult> {
  try {
    const electronAPI = getElectronAPI();
    if (typeof window !== 'undefined' && electronAPI?.category) {
      console.log('[CATEGORY] Getting category info for:', categoryNumber);
      
      const result = await electronAPI.category.getInfo(categoryNumber);
      
      if (result.success && result.category) {
        return {
          success: true,
          category: result.category
        };
      } else {
        return {
          success: false,
          message: result.message || 'Category not found'
        };
      }
    } else {
      return {
        success: false,
        message: 'Not in Electron environment'
      };
    }
  } catch (error) {
    console.error('[CATEGORY] Error getting category info:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search categories by keywords
 */
export async function searchCategories(keywords: string[]): Promise<CategoryLookupResult> {
  try {
    const electronAPI = getElectronAPI();
    if (typeof window !== 'undefined' && electronAPI?.category) {
      console.log('[CATEGORY] Searching categories with keywords:', keywords);
      
      const result = await electronAPI.category.search(keywords);
      
      if (result.success && result.categories) {
        return {
          success: true,
          category: result.categories[0] // Return first match
        };
      } else {
        return {
          success: false,
          message: result.message || 'No categories found'
        };
      }
    } else {
      return {
        success: false,
        message: 'Not in Electron environment'
      };
    }
  } catch (error) {
    console.error('[CATEGORY] Error searching categories:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Type-safe access to electronAPI
const getElectronAPI = () => {
  return (window as any).electronAPI;
};
