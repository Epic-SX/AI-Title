# Category Lookup Feature

This feature integrates Perplexity AI with the category.xlsx file to automatically determine appropriate category numbers for products based on their characteristics.

## Overview

The category lookup system consists of several components:

1. **CategoryLookupService** - Core service for reading category data and AI integration
2. **Excel Data Service Integration** - Automatically adds category numbers to product data
3. **API Endpoints** - RESTful endpoints for category lookup operations
4. **Frontend Component** - User interface for manual category lookup

## Features

### 🤖 AI-Powered Category Classification
- Uses Perplexity AI to analyze product information
- Determines the most appropriate category number based on:
  - Product title
  - Brand
  - Product type
  - Color
  - Material
  - Size

### 📊 Category Database Integration
- Reads from `category.xlsx` file
- Supports keyword-based search as fallback
- Provides detailed category information

### 🔄 Automatic Integration
- Automatically adds category numbers to Excel exports
- Works with both single product and bulk processing
- Seamlessly integrates with existing workflow

## API Endpoints

### POST `/api/excel/category-lookup`
Look up category number for a product using AI.

**Request Body:**
```json
{
  "title": "Nike Air Force 1 ホワイト 26cm",
  "brand": "Nike",
  "product_type": "スニーカー",
  "color": "ホワイト",
  "size": "26cm"
}
```

**Response:**
```json
{
  "success": true,
  "category_number": "2084037554",
  "category_info": {
    "category_number": "2084037554",
    "main_category": "レディース",
    "sub_category": "シューズ",
    "item_type": "スニーカー",
    "specific_type": "一般",
    "brand": "Nike",
    "full_description": "レディース > シューズ > スニーカー > 一般"
  },
  "lookup_info": {
    "method": "ai",
    "confidence": "high"
  }
}
```

### POST `/api/excel/category-search`
Search categories by keywords.

**Request Body:**
```json
{
  "keywords": ["スニーカー", "Nike"]
}
```

### GET `/api/excel/category-info/<category_number>`
Get detailed information about a specific category number.

### GET `/api/excel/categories`
Get all available categories.

### GET `/api/excel/category-stats`
Get statistics about the category database.

## Usage Examples

### 1. Manual Category Lookup (Frontend)

1. Navigate to the "カテゴリ検索" tab
2. Enter product information:
   - Title (required)
   - Brand
   - Product type
   - Color
   - Material
   - Size
3. Click "カテゴリ番号を検索"
4. View the AI-determined category number and details

### 2. Automatic Integration (Backend)

The system automatically adds category numbers when:
- Processing individual products
- Running batch processing
- Exporting to Excel

### 3. Programmatic Usage

```python
from app.services.category_lookup_service import CategoryLookupService

# Initialize service
service = CategoryLookupService()

# Look up category for a product
product_info = {
    'title': 'Nike Air Force 1 ホワイト 26cm',
    'brand': 'Nike',
    'product_type': 'スニーカー',
    'color': 'ホワイト',
    'size': '26cm'
}

category_number, lookup_info = service.get_category_number_with_ai(product_info)
print(f"Category Number: {category_number}")
```

## Configuration

### Environment Variables

Make sure to set the following environment variable:

```bash
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### Category File

The system reads from `backend/category.xlsx` which should contain:
- Column 1: Category Number
- Column 2: Main Category
- Column 3: Sub Category
- Column 4: Item Type
- Column 5: Specific Type
- Column 6: Brand (optional)

## Testing

Run the test script to verify the implementation:

```bash
cd backend
python test_category_lookup.py
```

This will test:
- Category data loading
- Keyword search functionality
- AI category lookup
- Category statistics

## Error Handling

The system includes comprehensive error handling:

1. **API Key Missing**: Falls back to keyword-based search
2. **AI API Error**: Falls back to keyword-based search
3. **Category Not Found**: Returns null with error information
4. **File Not Found**: Logs error and continues without category data

## Performance Considerations

- AI requests are cached to avoid duplicate calls
- Fallback to keyword search when AI is unavailable
- Bulk processing includes category lookup for efficiency
- Timeout handling for AI API calls (15 seconds)

## Future Enhancements

Potential improvements:
- Category number validation
- Learning from user corrections
- Category hierarchy visualization
- Batch category lookup optimization
- Category usage analytics

## Troubleshooting

### Common Issues

1. **"Category file not found"**
   - Ensure `category.xlsx` exists in the backend directory
   - Check file permissions

2. **"PERPLEXITY_API_KEY not found"**
   - Set the environment variable
   - System will fall back to keyword search

3. **"AI classification error"**
   - Check internet connection
   - Verify API key validity
   - System will fall back to keyword search

4. **"No matching category found"**
   - Try different keywords
   - Check if product information is complete
   - Consider adding new categories to the database

### Debug Mode

Enable debug logging by setting the log level to DEBUG in your application configuration.






