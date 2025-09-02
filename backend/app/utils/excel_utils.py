"""
Excel utility functions for the PL出品マクロ.xlsm file management.
"""

import pandas as pd
from openpyxl import load_workbook
from typing import Dict, List, Optional, Any
import re
import os

def validate_excel_file(file_path: str) -> tuple[bool, str]:
    """
    Validate if the Excel file exists and is accessible.
    
    Args:
        file_path: Path to the Excel file
        
    Returns:
        Tuple of (is_valid: bool, message: str)
    """
    try:
        if not os.path.exists(file_path):
            return False, f"File does not exist: {file_path}"
        
        # Try to open with pandas first (faster)
        try:
            excel_file = pd.ExcelFile(file_path)
            sheet_count = len(excel_file.sheet_names)
            return True, f"Valid Excel file with {sheet_count} sheets"
        except Exception as e:
            return False, f"Cannot read Excel file: {str(e)}"
            
    except Exception as e:
        return False, f"Error validating file: {str(e)}"

def get_sheet_headers(file_path: str, sheet_name: str) -> tuple[bool, List[str], str]:
    """
    Get the headers from a specific sheet.
    
    Args:
        file_path: Path to the Excel file
        sheet_name: Name of the sheet
        
    Returns:
        Tuple of (success: bool, headers: List[str], message: str)
    """
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=0)
        headers = [str(col) for col in df.columns]
        return True, headers, f"Successfully read {len(headers)} headers"
    except Exception as e:
        return False, [], f"Error reading headers: {str(e)}"

def backup_excel_file(file_path: str, backup_suffix: str = "_backup") -> tuple[bool, str]:
    """
    Create a backup of the Excel file.
    
    Args:
        file_path: Path to the original Excel file
        backup_suffix: Suffix to add to the backup file name
        
    Returns:
        Tuple of (success: bool, backup_path_or_message: str)
    """
    try:
        if not os.path.exists(file_path):
            return False, f"Original file does not exist: {file_path}"
        
        # Create backup file path
        base_path, ext = os.path.splitext(file_path)
        backup_path = f"{base_path}{backup_suffix}{ext}"
        
        # If backup already exists, add timestamp
        if os.path.exists(backup_path):
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = f"{base_path}{backup_suffix}_{timestamp}{ext}"
        
        # Copy the file
        import shutil
        shutil.copy2(file_path, backup_path)
        
        return True, backup_path
        
    except Exception as e:
        return False, f"Error creating backup: {str(e)}"

def clean_data_value(value: Any) -> Any:
    """
    Clean and standardize data values for Excel insertion.
    
    Args:
        value: Value to clean
        
    Returns:
        Cleaned value
    """
    if value is None:
        return ""
    
    if isinstance(value, str):
        # Remove excessive whitespace
        value = re.sub(r'\s+', ' ', value).strip()
        
        # Remove problematic characters for Excel
        value = value.replace('\x00', '')  # Null characters
        
        # Handle special cases
        if value.lower() in ['none', 'null', 'nan']:
            return ""
    
    return value

def format_measurement_value(value: Any, unit: str = "cm") -> str:
    """
    Format measurement values consistently.
    
    Args:
        value: Measurement value (number or string)
        unit: Unit of measurement (default: "cm")
        
    Returns:
        Formatted measurement string
    """
    if value is None or value == "":
        return ""
    
    try:
        # Try to convert to number
        if isinstance(value, str):
            # Extract number from string
            match = re.search(r'(\d+(?:\.\d+)?)', value)
            if match:
                num_value = float(match.group(1))
            else:
                return str(value)  # Return original if no number found
        else:
            num_value = float(value)
        
        # Format as integer if it's a whole number
        if num_value == int(num_value):
            return f"{int(num_value)}{unit}"
        else:
            return f"{num_value:.1f}{unit}"
            
    except (ValueError, TypeError):
        return str(value)

def extract_brand_from_title(title: str) -> str:
    """
    Extract brand name from product title using common patterns.
    
    Args:
        title: Product title
        
    Returns:
        Extracted brand name or empty string
    """
    if not title:
        return ""
    
    # Common brand patterns in Japanese product titles
    patterns = [
        r'◇\s*([A-Za-z\s]+[A-Za-z])',  # After ◇ symbol
        r'^([A-Za-z\s]+[A-Za-z])\s',    # At the beginning
        r'\s([A-Z][A-Za-z\s]*[A-Za-z])\s',  # Capitalized words
    ]
    
    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            brand = match.group(1).strip()
            # Filter out common non-brand words
            if brand.lower() not in ['size', 'color', 'new', 'used', 'vintage']:
                return brand
    
    return ""

def categorize_by_keywords(text: str, category_map: Dict[str, List[str]]) -> Optional[str]:
    """
    Categorize text based on keyword matching.
    
    Args:
        text: Text to categorize
        category_map: Dictionary mapping categories to keyword lists
        
    Returns:
        Category name or None if no match
    """
    if not text:
        return None
    
    text_lower = text.lower()
    
    # Score each category
    category_scores = {}
    
    for category, keywords in category_map.items():
        score = 0
        for keyword in keywords:
            if keyword.lower() in text_lower:
                # Give higher score for exact matches
                if keyword.lower() == text_lower:
                    score += 10
                else:
                    score += 1
        
        if score > 0:
            category_scores[category] = score
    
    # Return category with highest score
    if category_scores:
        return max(category_scores, key=category_scores.get)
    
    return None

def generate_management_number(product_data: Dict) -> str:
    """
    Generate or extract management number from product data.
    
    Args:
        product_data: Dictionary containing product information
        
    Returns:
        Management number string
    """
    # Check if management number already exists
    existing_number = product_data.get('管理番号') or product_data.get('management_number')
    if existing_number:
        return str(existing_number)
    
    # Try to extract from title
    title = product_data.get('タイトル') or product_data.get('title', '')
    if title:
        # Look for 13-digit numbers
        match = re.search(r'\b(\d{13})\b', title)
        if match:
            return match.group(1)
        
        # Look for 12-digit numbers
        match = re.search(r'\b(\d{12})\b', title)
        if match:
            return match.group(1)
    
    # Generate new number if none found (timestamp-based)
    from datetime import datetime
    timestamp = datetime.now().strftime("%y%m%d%H%M%S")
    return f"12{timestamp}1"  # 13 digits starting with 12

def validate_product_data(data: Dict, required_fields: List[str] = None) -> tuple[bool, List[str]]:
    """
    Validate product data before adding to Excel.
    
    Args:
        data: Product data dictionary
        required_fields: List of required field names
        
    Returns:
        Tuple of (is_valid: bool, error_messages: List[str])
    """
    errors = []
    
    # Default required fields
    if required_fields is None:
        required_fields = ['タイトル', 'title']  # Either Japanese or English title required
    
    # Check for at least one title field
    has_title = any(data.get(field) for field in ['タイトル', 'title'])
    if not has_title:
        errors.append("Title is required (タイトル or title field)")
    
    # Check for extremely long values that might break Excel
    for key, value in data.items():
        if isinstance(value, str) and len(value) > 32767:  # Excel cell character limit
            errors.append(f"Field '{key}' exceeds Excel character limit")
    
    # Check for invalid data types
    for key, value in data.items():
        if value is not None and not isinstance(value, (str, int, float, bool)):
            errors.append(f"Field '{key}' has unsupported data type: {type(value)}")
    
    return len(errors) == 0, errors

def get_category_sheet_mapping() -> Dict[str, str]:
    """
    Get the mapping of category keywords to sheet names.
    
    Returns:
        Dictionary mapping category keywords to sheet names
    """
    return {
        'トップス': 'トップス',
        'パンツ': 'パンツ', 
        'スカート': 'スカート',
        'ワンピース': 'ワンピース',
        'オールインワン': 'オールインワン',
        'スカートスーツ': 'スカートスーツ',
        'パンツスーツ': 'パンツスーツ',
        'アンサンブル': 'アンサンブル',
        '靴': '靴',
        'ブーツ': 'ブーツ',
        'ベルト': 'ベルト',
        'ネクタイ': 'ネクタイ縦横',
        '帽子': '帽子',
        'バッグ': 'バッグ',
        'ネックレス': 'ネックレス',
        'サングラス': 'サングラス'
    } 