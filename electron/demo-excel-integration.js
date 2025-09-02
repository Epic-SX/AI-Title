/**
 * Demo script showing how to use the Excel API integration in Electron
 * This file demonstrates how to call the backend APIs from the renderer process
 */

// Example usage in a frontend component or script
class ExcelIntegrationDemo {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.backendRunning = false;
  }

  // Check if we're running in Electron
  checkElectronEnvironment() {
    if (!this.isElectron) {
      console.log('❌ Not running in Electron environment');
      return false;
    }
    console.log('✅ Electron environment detected');
    return true;
  }

  // Start the backend server
  async startBackend() {
    if (!this.checkElectronEnvironment()) return;

    try {
      console.log('🚀 Starting backend server...');
      const success = await window.electronAPI.startBackendServer();
      
      if (success) {
        this.backendRunning = true;
        console.log('✅ Backend server started successfully');
      } else {
        console.log('❌ Failed to start backend server');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error starting backend:', error);
      return false;
    }
  }

  // Check backend health
  async checkBackendHealth() {
    if (!this.checkElectronEnvironment()) return false;

    try {
      const isHealthy = await window.electronAPI.checkBackendHealth();
      this.backendRunning = isHealthy;
      console.log(`🔍 Backend health check: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
      return isHealthy;
    } catch (error) {
      console.error('❌ Error checking backend health:', error);
      return false;
    }
  }

  // Get Excel sheet information
  async getSheetInfo() {
    if (!this.checkElectronEnvironment() || !this.backendRunning) return;

    try {
      console.log('📊 Getting Excel sheet information...');
      const result = await window.electronAPI.excel.getSheetInfo();
      
      if (result.success) {
        console.log('✅ Sheet information retrieved:');
        Object.entries(result.sheets).forEach(([sheetName, info]) => {
          console.log(`  📋 ${sheetName}: ${info.header_count} headers`);
        });
        return result.sheets;
      } else {
        console.log('❌ Failed to get sheet info:', result.message);
      }
    } catch (error) {
      console.error('❌ Error getting sheet info:', error);
    }
  }

  // Classify a product
  async classifyProduct(productData) {
    if (!this.checkElectronEnvironment() || !this.backendRunning) return;

    try {
      console.log('🏷️ Classifying product:', productData.タイトル || productData.title);
      const result = await window.electronAPI.excel.classifyProduct(productData);
      
      if (result.success) {
        console.log(`✅ Product classified as: ${result.category}`);
        return result.category;
      } else {
        console.log('❌ Classification failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error classifying product:', error);
    }
  }

  // Add a product to Excel
  async addProduct(productData) {
    if (!this.checkElectronEnvironment() || !this.backendRunning) return;

    try {
      console.log('📝 Adding product to Excel:', productData.タイトル || productData.title);
      const result = await window.electronAPI.excel.addProduct(productData);
      
      if (result.success) {
        console.log('✅ Product added successfully:', result.message);
        return true;
      } else {
        console.log('❌ Failed to add product:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error adding product:', error);
      return false;
    }
  }

  // Test with sample data
  async testSampleData() {
    if (!this.checkElectronEnvironment() || !this.backendRunning) return;

    try {
      console.log('🧪 Testing with sample data...');
      const result = await window.electronAPI.excel.testSample();
      
      if (result.success) {
        console.log('✅ Sample data test successful:', result.message);
        return true;
      } else {
        console.log('❌ Sample data test failed:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error testing sample data:', error);
      return false;
    }
  }

  // Get mapping preview
  async getMappingPreview(productData) {
    if (!this.checkElectronEnvironment() || !this.backendRunning) return;

    try {
      console.log('👀 Getting mapping preview for:', productData.タイトル || productData.title);
      const result = await window.electronAPI.excel.getMappingPreview(productData);
      
      if (result.success) {
        console.log('✅ Mapping preview:');
        console.log(`  📋 Target sheet: ${result.sheet_name}`);
        if (result.measurement_text) {
          console.log(`  📏 Measurements: ${result.measurement_text}`);
        }
        console.log('  🗂️ Mapped data:', result.mapped_data);
        return result;
      } else {
        console.log('❌ Mapping preview failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error getting mapping preview:', error);
    }
  }

  // Run a complete demo
  async runDemo() {
    console.log('🎬 Starting Excel Integration Demo...');
    console.log('=======================================');

    // Check environment
    if (!this.checkElectronEnvironment()) {
      console.log('❌ Demo can only run in Electron environment');
      return;
    }

    // Check backend health first
    await this.checkBackendHealth();

    // Start backend if not running
    if (!this.backendRunning) {
      console.log('🚀 Backend not running, starting...');
      await this.startBackend();
      
      // Wait a bit for startup
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.checkBackendHealth();
    }

    if (!this.backendRunning) {
      console.log('❌ Cannot continue demo without backend');
      return;
    }

    // Get sheet information
    await this.getSheetInfo();

    // Test sample data
    console.log('\n🧪 Testing sample data...');
    await this.testSampleData();

    // Test custom product data
    console.log('\n📝 Testing custom product...');
    const customProduct = {
      タイトル: "デニムパンツ メンズ ブルー",
      ブランド: "UNIQLO",
      色: "ブルー", 
      サイズ: "M",
      金額: 2500,
      ランク: "2",
      コメント: "ほぼ新品"
    };

    // Classify the product
    const category = await this.classifyProduct(customProduct);
    
    // Get mapping preview
    await this.getMappingPreview(customProduct);
    
    // Add the product (commented out to prevent actual Excel modification)
    // await this.addProduct(customProduct);

    console.log('\n✅ Demo completed successfully!');
    console.log('=======================================');
  }
}

// Usage example:
// const demo = new ExcelIntegrationDemo();
// demo.runDemo();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExcelIntegrationDemo;
}

// Example of how to use in a React component:
/*
import React, { useEffect, useState } from 'react';

const ExcelIntegrationComponent = () => {
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const demoInstance = new ExcelIntegrationDemo();
      setDemo(demoInstance);
    }
  }, []);

  const handleRunDemo = async () => {
    if (demo) {
      await demo.runDemo();
    }
  };

  const handleAddProduct = async () => {
    if (demo) {
      const productData = {
        タイトル: "サンプル商品 テストブランド",
        ブランド: "テストブランド",
        色: "レッド",
        サイズ: "L",
        金額: 1500
      };
      await demo.addProduct(productData);
    }
  };

  return (
    <div>
      <h2>Excel Integration</h2>
      <button onClick={handleRunDemo}>Run Demo</button>
      <button onClick={handleAddProduct}>Add Sample Product</button>
    </div>
  );
};

export default ExcelIntegrationComponent;
*/ 