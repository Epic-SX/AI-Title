/**
 * Test script to verify category integration in Electron app
 * This script can be run in the Electron DevTools console to test category functionality
 */

// Test category lookup functionality
async function testCategoryIntegration() {
  console.log('🧪 Testing Category Integration in Electron App');
  console.log('================================================');
  
  // Check if we're in Electron environment
  if (!window.electronAPI) {
    console.error('❌ Not running in Electron environment');
    return;
  }
  
  console.log('✅ Electron environment detected');
  
  // Test 1: Check backend health
  console.log('\n🔍 Test 1: Checking backend health...');
  try {
    const healthStatus = await window.electronAPI.checkBackendHealth();
    console.log(`Backend health: ${healthStatus ? '✅ Healthy' : '❌ Unhealthy'}`);
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
  }
  
  // Test 2: Test category lookup
  console.log('\n🔍 Test 2: Testing category lookup...');
  const testProductData = {
    title: "earth music&ecology × GREMLINS コラボTシャツ ブラック 系 Mサイズ",
    brand: "earth music&ecology",
    product_type: "Tシャツ",
    color: "ブラック",
    size: "M"
  };
  
  try {
    const categoryResult = await window.electronAPI.category.lookup(testProductData);
    if (categoryResult && categoryResult.success) {
      console.log('✅ Category lookup successful:');
      console.log('  Category Number:', categoryResult.category?.number);
      console.log('  Full Description:', categoryResult.category?.full_description);
      console.log('  Main Category:', categoryResult.category?.main_category);
      console.log('  Sub Category:', categoryResult.category?.sub_category);
    } else {
      console.log('⚠️ Category lookup failed:', categoryResult?.message);
    }
  } catch (error) {
    console.error('❌ Category lookup error:', error);
  }
  
  // Test 3: Test result enhancement
  console.log('\n🔍 Test 3: Testing result enhancement...');
  const testResult = {
    title: "earth music&ecology × GREMLINS コラボTシャツ ブラック 系 Mサイズ",
    brand: "earth music&ecology",
    product_type: "Tシャツ",
    color: "ブラック",
    size: "M"
  };
  
  try {
    const enhanceResult = await window.electronAPI.category.enhanceResult(testResult);
    if (enhanceResult && enhanceResult.success) {
      console.log('✅ Result enhancement successful:');
      console.log('  Enhanced result has category:', !!enhanceResult.result?.category);
      if (enhanceResult.result?.category) {
        console.log('  Category Number:', enhanceResult.result.category.number);
        console.log('  Full Description:', enhanceResult.result.category.full_description);
      }
    } else {
      console.log('⚠️ Result enhancement failed:', enhanceResult?.message);
    }
  } catch (error) {
    console.error('❌ Result enhancement error:', error);
  }
  
  // Test 4: Test local image processing with category
  console.log('\n🔍 Test 4: Testing local image processing with category...');
  const testImageData = {
    product_images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'], // Mock base64 image
    product_id: 'test-123',
    brand: 'earth music&ecology',
    product_type: 'Tシャツ',
    color: 'ブラック',
    size: 'M'
  };
  
  try {
    const processResult = await window.electronAPI.processImagesLocally(testImageData);
    if (processResult && processResult.status === 'success') {
      console.log('✅ Local image processing successful:');
      console.log('  Results count:', processResult.results?.length);
      if (processResult.results && processResult.results.length > 0) {
        const firstResult = processResult.results[0];
        console.log('  First result has category:', !!firstResult?.category);
        if (firstResult?.category) {
          console.log('  Category Number:', firstResult.category.number);
          console.log('  Full Description:', firstResult.category.full_description);
        }
      }
    } else {
      console.log('⚠️ Local image processing failed');
    }
  } catch (error) {
    console.error('❌ Local image processing error:', error);
  }
  
  console.log('\n🎉 Category integration test completed!');
  console.log('================================================');
}

// Test category search functionality
async function testCategorySearch() {
  console.log('\n🔍 Testing Category Search...');
  
  try {
    const searchResult = await window.electronAPI.category.search(['Tシャツ', 'ブラック']);
    if (searchResult && searchResult.success) {
      console.log('✅ Category search successful:');
      console.log('  Found category:', searchResult.category?.full_description);
    } else {
      console.log('⚠️ Category search failed:', searchResult?.message);
    }
  } catch (error) {
    console.error('❌ Category search error:', error);
  }
}

// Test getting all categories
async function testGetAllCategories() {
  console.log('\n🔍 Testing Get All Categories...');
  
  try {
    const allCategories = await window.electronAPI.category.getAll();
    if (allCategories && allCategories.success) {
      console.log('✅ Get all categories successful:');
      console.log('  Categories count:', allCategories.categories?.length || 0);
    } else {
      console.log('⚠️ Get all categories failed:', allCategories?.message);
    }
  } catch (error) {
    console.error('❌ Get all categories error:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testCategoryIntegration();
  await testCategorySearch();
  await testGetAllCategories();
}

// Export functions for manual testing
window.testCategoryIntegration = testCategoryIntegration;
window.testCategorySearch = testCategorySearch;
window.testGetAllCategories = testGetAllCategories;
window.runAllTests = runAllTests;

console.log('🧪 Category Integration Test Script Loaded');
console.log('Available functions:');
console.log('  - testCategoryIntegration()');
console.log('  - testCategorySearch()');
console.log('  - testGetAllCategories()');
console.log('  - runAllTests()');
console.log('\nTo run all tests, execute: runAllTests()');





