'use client';

import React from 'react';
import ResultCard from './ResultCard';

interface GenerationResult {
  title: string;
  brand?: string;
  model?: string;
  product_type?: string;
  keywords?: string[];
  product_features?: string[];
}

interface ResultsListProps {
  results: GenerationResult[];
  isMultipleProducts?: boolean;
}

export default function ResultsList({ results, isMultipleProducts = false }: ResultsListProps) {
  return (
    <div className="space-y-6">
      {results.length > 0 ? (
        results.map((result, index) => (
          <ResultCard 
            key={index}
            title={result.title}
            detectedBrand={result.brand}
            detectedModel={result.model}
            itemType={result.product_type}
            result={result}
            index={index}
            isProductVariant={isMultipleProducts}
          />
        ))
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          生成されたタイトルはありません
        </div>
      )}
    </div>
  );
} 