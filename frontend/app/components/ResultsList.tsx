'use client';

import { useState } from 'react';
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
}

export default function ResultsList({ results }: ResultsListProps) {
  return (
    <div className="space-y-6">
      {results.length > 0 ? (
        results.map((result, index) => (
          <ResultCard 
            key={index}
            result={result}
            index={index}
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