'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CopyIcon, DownloadIcon, CheckIcon } from 'lucide-react';

interface MacroExportCardProps {
  macroData: any;
}

export default function MacroExportCard({ macroData }: MacroExportCardProps) {
  const [jsonCopied, setJsonCopied] = useState(false);
  const [csvCopied, setCsvCopied] = useState(false);
  
  // If macroData is empty, provide default structure with the results data
  const exportData = macroData || {
    status: "未検出",
  };
  
  // Format data as JSON for export
  const getJsonData = () => {
    return JSON.stringify(exportData, null, 2);
  };
  
  // Convert data to CSV format
  const getCsvData = () => {
    if (!exportData) return 'status\n未検出';
    
    // Extract keys for CSV header
    const entries = Object.entries(exportData);
    if (entries.length === 0) return 'status\n未検出';
    
    // Build CSV content
    const headers = entries.map(([key]) => key).join(',');
    const values = entries.map(([_, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
    
    return `${headers}\n${values}`;
  };
  
  // Copy JSON to clipboard
  const copyJson = () => {
    navigator.clipboard.writeText(getJsonData());
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };
  
  // Copy CSV to clipboard
  const copyCsv = () => {
    navigator.clipboard.writeText(getCsvData());
    setCsvCopied(true);
    setTimeout(() => setCsvCopied(false), 2000);
  };
  
  // Download JSON file
  const downloadJson = () => {
    const blob = new Blob([getJsonData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Download CSV file
  const downloadCsv = () => {
    const blob = new Blob([getCsvData()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          {exportData.status || "未検出"}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={copyJson}
          >
            {jsonCopied ? (
              <CheckIcon className="h-4 w-4 mr-2" />
            ) : (
              <CopyIcon className="h-4 w-4 mr-2" />
            )}
            JSONをコピー
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={downloadJson}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            JSONをダウンロード
          </Button>
        </div>
        
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={copyCsv}
          >
            {csvCopied ? (
              <CheckIcon className="h-4 w-4 mr-2" />
            ) : (
              <CopyIcon className="h-4 w-4 mr-2" />
            )}
            CSVをコピー
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={downloadCsv}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            CSVをダウンロード
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        ※ このデータを使用して自社システム「アテナ」に出品することができます。CSVまたはJSONをコピーし、出品マクロにペーストしてください。
      </p>
    </div>
  );
} 