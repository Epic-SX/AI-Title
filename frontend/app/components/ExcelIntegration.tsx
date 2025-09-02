'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      excel: {
        addProduct: (productData: any) => Promise<any>;
        addProductsBulk: (products: any[]) => Promise<any>;
        classifyProduct: (productData: any) => Promise<any>;
        getSheetInfo: () => Promise<any>;
        testSample: () => Promise<any>;
        getMappingPreview: (productData: any) => Promise<any>;
      };
      startBackendServer: () => Promise<boolean>;
      stopBackendServer: () => Promise<void>;
      checkBackendHealth: () => Promise<boolean>;
      onShowExcelDialog: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

interface ProductData {
  タイトル: string;
  色: string;
  サイズ: string;
  ブランド: string;
  金額: number;
  ランク: string;
  コメント: string;
  [key: string]: any;
}

const ExcelIntegration: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'running' | 'stopped'>('unknown');
  const [productData, setProductData] = useState<ProductData>({
    タイトル: '',
    色: '',
    サイズ: '',
    ブランド: '',
    金額: 0,
    ランク: '3',
    コメント: '目立った傷や汚れなし'
  });
  const [classification, setClassification] = useState<string>('');
  const [sheetInfo, setSheetInfo] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true);
      checkBackendStatus();
      
      // Listen for Excel dialog events
      window.electronAPI.onShowExcelDialog(() => {
        console.log('Excel dialog event received');
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('show-excel-dialog');
      }
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkBackendStatus = async () => {
    if (!window.electronAPI) return;
    
    try {
      const isRunning = await window.electronAPI.checkBackendHealth();
      setBackendStatus(isRunning ? 'running' : 'stopped');
      addLog(`Backend status: ${isRunning ? 'Running' : 'Stopped'}`);
    } catch (error) {
      setBackendStatus('stopped');
      addLog(`Error checking backend: ${error}`);
    }
  };

  const startBackend = async () => {
    if (!window.electronAPI) return;
    
    setIsLoading(true);
    addLog('Starting backend server...');
    
    try {
      const success = await window.electronAPI.startBackendServer();
      if (success) {
        setBackendStatus('running');
        addLog('Backend server started successfully');
      } else {
        addLog('Failed to start backend server');
      }
    } catch (error) {
      addLog(`Error starting backend: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopBackend = async () => {
    if (!window.electronAPI) return;
    
    setIsLoading(true);
    addLog('Stopping backend server...');
    
    try {
      await window.electronAPI.stopBackendServer();
      setBackendStatus('stopped');
      addLog('Backend server stopped');
    } catch (error) {
      addLog(`Error stopping backend: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const classifyProduct = async () => {
    if (!window.electronAPI || !productData.タイトル) return;
    
    setIsLoading(true);
    addLog('Classifying product...');
    
    try {
      const result = await window.electronAPI.excel.classifyProduct(productData);
      if (result.success) {
        setClassification(result.category);
        addLog(`Product classified as: ${result.category}`);
      } else {
        addLog(`Classification failed: ${result.message}`);
      }
    } catch (error) {
      addLog(`Error classifying product: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getSheetInformation = async () => {
    if (!window.electronAPI) return;
    
    setIsLoading(true);
    addLog('Getting sheet information...');
    
    try {
      const result = await window.electronAPI.excel.getSheetInfo();
      if (result.success) {
        setSheetInfo(result.sheets);
        addLog('Sheet information retrieved');
      } else {
        addLog(`Failed to get sheet info: ${result.message}`);
      }
    } catch (error) {
      addLog(`Error getting sheet info: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSampleData = async () => {
    if (!window.electronAPI) return;
    
    setIsLoading(true);
    addLog('Testing with sample data...');
    
    try {
      const result = await window.electronAPI.excel.testSample();
      if (result.success) {
        addLog(`Sample data added successfully: ${result.message}`);
      } else {
        addLog(`Sample test failed: ${result.message}`);
      }
    } catch (error) {
      addLog(`Error testing sample: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addProductToExcel = async () => {
    if (!window.electronAPI || !productData.タイトル) {
      addLog('Title is required');
      return;
    }
    
    setIsLoading(true);
    addLog('Adding product to Excel...');
    
    try {
      const result = await window.electronAPI.excel.addProduct(productData);
      if (result.success) {
        addLog(`Product added successfully: ${result.message}`);
        // Reset form
        setProductData({
          タイトル: '',
          色: '',
          サイズ: '',
          ブランド: '',
          金額: 0,
          ランク: '3',
          コメント: '目立った傷や汚れなし'
        });
        setClassification('');
      } else {
        addLog(`Failed to add product: ${result.message}`);
      }
    } catch (error) {
      addLog(`Error adding product: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getMappingPreview = async () => {
    if (!window.electronAPI || !productData.タイトル) return;
    
    setIsLoading(true);
    addLog('Getting mapping preview...');
    
    try {
      const result = await window.electronAPI.excel.getMappingPreview(productData);
      if (result.success) {
        addLog(`Mapping preview: Sheet: ${result.sheet_name}`);
        if (result.measurement_text) {
          addLog(`Measurements: ${result.measurement_text}`);
        }
      } else {
        addLog(`Mapping preview failed: ${result.message}`);
      }
    } catch (error) {
      addLog(`Error getting mapping preview: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isElectron) {
    return (
      <Alert>
        <div>This component is only available in the Electron app.</div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Excel Integration Control Panel
            <Badge variant={backendStatus === 'running' ? 'default' : 'destructive'}>
              Backend: {backendStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={startBackend} 
              disabled={isLoading || backendStatus === 'running'}
              variant="outline"
            >
              Start Backend
            </Button>
            <Button 
              onClick={stopBackend} 
              disabled={isLoading || backendStatus === 'stopped'}
              variant="outline"
            >
              Stop Backend
            </Button>
            <Button 
              onClick={checkBackendStatus} 
              disabled={isLoading}
              variant="outline"
            >
              Check Status
            </Button>
            <Button 
              onClick={getSheetInformation} 
              disabled={isLoading || backendStatus !== 'running'}
              variant="outline"
            >
              Get Sheet Info
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Data Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">タイトル (Title)</Label>
              <Input
                id="title"
                value={productData.タイトル}
                onChange={(e) => handleInputChange('タイトル', e.target.value)}
                placeholder="商品タイトルを入力"
              />
            </div>
            <div>
              <Label htmlFor="brand">ブランド (Brand)</Label>
              <Input
                id="brand"
                value={productData.ブランド}
                onChange={(e) => handleInputChange('ブランド', e.target.value)}
                placeholder="ブランド名"
              />
            </div>
            <div>
              <Label htmlFor="color">色 (Color)</Label>
              <Input
                id="color"
                value={productData.色}
                onChange={(e) => handleInputChange('色', e.target.value)}
                placeholder="色"
              />
            </div>
            <div>
              <Label htmlFor="size">サイズ (Size)</Label>
              <Input
                id="size"
                value={productData.サイズ}
                onChange={(e) => handleInputChange('サイズ', e.target.value)}
                placeholder="サイズ"
              />
            </div>
            <div>
              <Label htmlFor="price">金額 (Price)</Label>
              <Input
                id="price"
                type="number"
                value={productData.金額}
                onChange={(e) => handleInputChange('金額', parseInt(e.target.value) || 0)}
                placeholder="価格"
              />
            </div>
            <div>
              <Label htmlFor="rank">ランク (Rank)</Label>
              <Input
                id="rank"
                value={productData.ランク}
                onChange={(e) => handleInputChange('ランク', e.target.value)}
                placeholder="ランク"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="comment">コメント (Comment)</Label>
            <Textarea
              id="comment"
              value={productData.コメント}
              onChange={(e) => handleInputChange('コメント', e.target.value)}
              placeholder="商品の状態など"
              rows={3}
            />
          </div>

          {classification && (
            <div>
              <Badge variant="secondary">
                Classification: {classification}
              </Badge>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={classifyProduct} 
              disabled={isLoading || !productData.タイトル || backendStatus !== 'running'}
              variant="outline"
            >
              Classify Product
            </Button>
            <Button 
              onClick={getMappingPreview} 
              disabled={isLoading || !productData.タイトル || backendStatus !== 'running'}
              variant="outline"
            >
              Preview Mapping
            </Button>
            <Button 
              onClick={addProductToExcel} 
              disabled={isLoading || !productData.タイトル || backendStatus !== 'running'}
              variant="default"
            >
              Add to Excel
            </Button>
            <Button 
              onClick={testSampleData} 
              disabled={isLoading || backendStatus !== 'running'}
              variant="secondary"
            >
              Test Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {sheetInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Excel Sheet Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(sheetInfo).map(([sheetName, info]: [string, any]) => (
                <div key={sheetName} className="p-3 border rounded">
                  <div className="font-medium">{sheetName}</div>
                  <div className="text-sm text-gray-600">
                    {info.header_count} headers
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No activity yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
          <Button 
            onClick={() => setLogs([])} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Clear Log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelIntegration; 