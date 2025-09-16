"""
Category lookup service for determining category numbers based on product information
using the category.xlsx file and Perplexity AI.
"""

import pandas as pd
import os
import requests
import json
import logging
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logger
logger = logging.getLogger(__name__)

class CategoryLookupService:
    def __init__(self, category_file_path: str = None):
        if category_file_path is None:
            # Use absolute path relative to this file's directory
            current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            category_file_path = os.path.join(current_dir, "category.xlsx")
        
        self.category_file_path = category_file_path
        self.category_data = None
        self.perplexity_api_key = os.getenv("PERPLEXITY_API_KEY")
        
        # Load category data
        self._load_category_data()
    
    def _load_category_data(self):
        """Load category data from Excel file."""
        try:
            if not os.path.exists(self.category_file_path):
                print(f"⚠️ Category file not found: {self.category_file_path}")
                return
            
            # Read the Excel file - the first row contains the actual data, not headers
            df = pd.read_excel(self.category_file_path, header=None)
            
            # The first row is actually data, so we need to handle it properly
            # Based on the structure we saw: [category_number, main_category, sub_category, item_type, specific_type, brand, ...]
            df.columns = ['category_number', 'main_category', 'sub_category', 'item_type', 'specific_type', 'brand', 'other1', 'other2', 'other3']
            
            # Remove rows with all NaN values
            df = df.dropna(how='all')
            
            # Fill NaN values with empty strings
            df = df.fillna('')
            
            # Convert category_number to string for consistency
            df['category_number'] = df['category_number'].astype(str)
            
            self.category_data = df
            logger.info(f"[SUCCESS] Loaded {len(df)} category entries from {self.category_file_path}")
            logger.info(f"[DATA] Category data preview: {df.head(3).to_dict('records')}")
            
        except Exception as e:
            logger.error(f"[ERROR] Error loading category data: {str(e)}")
            self.category_data = None
    
    def get_category_by_number(self, category_number: str) -> Optional[Dict]:
        """Get category information by category number."""
        if self.category_data is None:
            return None
        
        try:
            # Search for exact match
            matches = self.category_data[self.category_data['category_number'].astype(str) == str(category_number)]
            
            if not matches.empty:
                row = matches.iloc[0]
                return {
                    'category_number': str(row['category_number']),
                    'main_category': str(row['main_category']),
                    'sub_category': str(row['sub_category']),
                    'item_type': str(row['item_type']),
                    'specific_type': str(row['specific_type']),
                    'brand': str(row['brand']),
                    'full_description': f"{row['main_category']} > {row['sub_category']} > {row['item_type']} > {row['specific_type']}"
                }
            
            return None
            
        except Exception as e:
            print(f"❌ Error getting category by number: {str(e)}")
            return None
    
    def search_categories_by_keywords(self, keywords: List[str]) -> List[Dict]:
        """Search categories by keywords."""
        if self.category_data is None:
            return []
        
        try:
            results = []
            keywords_lower = [kw.lower() for kw in keywords]
            
            for _, row in self.category_data.iterrows():
                # Create searchable text from all relevant columns
                searchable_text = f"{row['main_category']} {row['sub_category']} {row['item_type']} {row['specific_type']} {row['brand']}".lower()
                
                # Check if any keyword matches
                if any(keyword in searchable_text for keyword in keywords_lower):
                    results.append({
                        'category_number': str(row['category_number']),
                        'main_category': str(row['main_category']),
                        'sub_category': str(row['sub_category']),
                        'item_type': str(row['item_type']),
                        'specific_type': str(row['specific_type']),
                        'brand': str(row['brand']),
                        'full_description': f"{row['main_category']} > {row['sub_category']} > {row['item_type']} > {row['specific_type']}",
                        'match_score': sum(1 for keyword in keywords_lower if keyword in searchable_text)
                    })
            
            # Sort by match score (descending)
            results.sort(key=lambda x: x['match_score'], reverse=True)
            
            return results[:10]  # Return top 10 matches
            
        except Exception as e:
            print(f"❌ Error searching categories: {str(e)}")
            return []
    
    def get_category_number_with_ai(self, product_info: Dict) -> Tuple[Optional[str], Dict]:
        """
        Use Perplexity AI to determine the most appropriate category number for a product.
        
        Args:
            product_info: Dictionary containing product information (title, brand, product_type, etc.)
            
        Returns:
            Tuple of (category_number, ai_response_info)
        """
        if not self.perplexity_api_key:
            print("⚠️ PERPLEXITY_API_KEY not found, using keyword-based search")
            return self._fallback_category_search(product_info), {'method': 'fallback', 'reason': 'no_api_key'}
        
        try:
            # Prepare product information for AI analysis
            title = product_info.get('title', '') or product_info.get('タイトル', '')
            brand = product_info.get('brand', '') or product_info.get('ブランド', '')
            product_type = product_info.get('product_type', '') or product_info.get('もの', '')
            color = product_info.get('color', '') or product_info.get('色', '')
            material = product_info.get('material', '') or product_info.get('素材', '')
            
            # Create AI prompt for category classification
            ai_prompt = f"""以下の商品情報を分析して、最も適切なカテゴリ番号を特定してください。

商品情報:
- タイトル: {title}
- ブランド: {brand}
- 商品タイプ: {product_type}
- 色: {color}
- 素材: {material}

利用可能なカテゴリ例:
- アンティーク、コレクション > 雑貨 > キーホルダー
- レディース > トップス > シャツ
- メンズ > ボトムス > パンツ
- レディース > シューズ > パンプス
- バッグ、小物 > バッグ > ハンドバッグ
- アクセサリー > ジュエリー > ネックレス

指示:
1. 商品の特徴を分析してください
2. 最も適切なカテゴリ番号を特定してください
3. カテゴリ番号のみを回答してください（例: 2084037554）
4. 確信度が低い場合は「不明」と回答してください

カテゴリ番号:"""

            # Call Perplexity AI API
            headers = {
                "Authorization": f"Bearer {self.perplexity_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "sonar",
                "messages": [
                    {
                        "role": "user",
                        "content": ai_prompt
                    }
                ]
            }
            
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"].strip()
                
                # Extract category number from AI response
                category_number = self._extract_category_number(ai_response)
                
                if category_number:
                    # Verify the category number exists in our data
                    category_info = self.get_category_by_number(category_number)
                    if category_info:
                        logger.info(f"[AI] Classified product as category: {category_number} - {category_info['full_description']}")
                        logger.info(f"[PRODUCT] Details: Title='{title}', Brand='{brand}', Type='{product_type}'")
                        logger.info(f"[AI] Response: {ai_response}")
                        return category_number, {
                            'method': 'ai',
                            'ai_response': ai_response,
                            'category_info': category_info,
                            'confidence': 'high' if '不明' not in ai_response else 'low'
                        }
                    else:
                        print(f"⚠️ AI suggested category number {category_number} not found in database")
                        return self._fallback_category_search(product_info), {
                            'method': 'fallback',
                            'reason': 'ai_category_not_found',
                            'ai_response': ai_response
                        }
                else:
                    print(f"⚠️ Could not extract category number from AI response: {ai_response}")
                    return self._fallback_category_search(product_info), {
                        'method': 'fallback',
                        'reason': 'no_category_number_extracted',
                        'ai_response': ai_response
                    }
            else:
                print(f"⚠️ Perplexity API error: {response.status_code}")
                return self._fallback_category_search(product_info), {
                    'method': 'fallback',
                    'reason': 'api_error',
                    'error_code': response.status_code
                }
                
        except Exception as e:
            print(f"❌ Error in AI category classification: {str(e)}")
            return self._fallback_category_search(product_info), {
                'method': 'fallback',
                'reason': 'ai_error',
                'error': str(e)
            }
    
    def _extract_category_number(self, ai_response: str) -> Optional[str]:
        """Extract category number from AI response."""
        import re
        
        # Look for patterns like "2084037554" or "カテゴリ番号: 2084037554"
        patterns = [
            r'(\d{10})',  # 10-digit number
            r'カテゴリ番号[：:]\s*(\d+)',
            r'(\d{10,})',  # 10+ digit number
        ]
        
        for pattern in patterns:
            match = re.search(pattern, ai_response)
            if match:
                return match.group(1)
        
        return None
    
    def _fallback_category_search(self, product_info: Dict) -> Optional[str]:
        """Fallback method using keyword-based search."""
        try:
            # Extract keywords from product information
            keywords = []
            
            title = product_info.get('title', '') or product_info.get('タイトル', '')
            brand = product_info.get('brand', '') or product_info.get('ブランド', '')
            product_type = product_info.get('product_type', '') or product_info.get('もの', '')
            
            # Add keywords from title
            if title:
                keywords.extend(title.split())
            
            # Add brand as keyword
            if brand and brand != '不明':
                keywords.append(brand)
            
            # Add product type as keyword
            if product_type and product_type != '不明':
                keywords.append(product_type)
            
            # Search for matching categories
            matches = self.search_categories_by_keywords(keywords)
            
            if matches:
                best_match = matches[0]
                logger.info(f"[FALLBACK] Found category: {best_match['category_number']} - {best_match['full_description']}")
                logger.info(f"[KEYWORDS] Used: {keywords}")
                logger.info(f"[MATCHES] Top 3: {[{'number': m['category_number'], 'description': m['full_description'], 'score': m['match_score']} for m in matches[:3]]}")
                return best_match['category_number']
            
            logger.warning("[WARNING] No matching category found in fallback search")
            logger.info(f"[KEYWORDS] Used: {keywords}")
            return None
            
        except Exception as e:
            print(f"❌ Error in fallback category search: {str(e)}")
            return None
    
    def get_all_categories(self) -> List[Dict]:
        """Get all available categories."""
        if self.category_data is None:
            return []
        
        try:
            categories = []
            for _, row in self.category_data.iterrows():
                categories.append({
                    'category_number': str(row['category_number']),
                    'main_category': str(row['main_category']),
                    'sub_category': str(row['sub_category']),
                    'item_type': str(row['item_type']),
                    'specific_type': str(row['specific_type']),
                    'brand': str(row['brand']),
                    'full_description': f"{row['main_category']} > {row['sub_category']} > {row['item_type']} > {row['specific_type']}"
                })
            
            return categories
            
        except Exception as e:
            print(f"❌ Error getting all categories: {str(e)}")
            return []
    
    def get_category_statistics(self) -> Dict:
        """Get statistics about the category data."""
        if self.category_data is None:
            return {'error': 'No category data loaded'}
        
        try:
            stats = {
                'total_categories': len(self.category_data),
                'main_categories': self.category_data['main_category'].nunique(),
                'sub_categories': self.category_data['sub_category'].nunique(),
                'item_types': self.category_data['item_type'].nunique(),
                'brands': self.category_data['brand'].nunique(),
                'main_category_counts': self.category_data['main_category'].value_counts().to_dict(),
                'top_brands': self.category_data['brand'].value_counts().head(10).to_dict()
            }
            
            return stats
            
        except Exception as e:
            return {'error': f'Error calculating statistics: {str(e)}'}
