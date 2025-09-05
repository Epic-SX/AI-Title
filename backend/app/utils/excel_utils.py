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

def get_predefined_sheet_headers() -> Dict[str, List[str]]:
    """
    Get the predefined sheet headers that match the PL出品マクロ.xlsm file structure.
    
    Returns:
        Dictionary mapping sheet names to their header lists
    """
    return {
        "トップス": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "パンツ": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "スカート": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "ワンピース": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "オールインワン": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "スカートスーツ": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "パンツスーツ": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "アンサンブル": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "靴": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "ブーツ": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "ベルト": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "ネクタイ縦横": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "帽子": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "バッグ": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "ネックレス": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ],
        "サングラス": [
            "カテゴリ", "管理番号", "タイトル", "文字数", "付属品", "ランク", "コメント", 
            "素材", "色", "サイズ", "着丈", "　肩幅", "身幅", "袖丈", "梱包サイズ", 
            "梱包記号", "美品", "ブランド", "フリー", "袖", "もの", "男女", 
            "採寸1", "ラック", "金額", "股上", "股下", "ウエスト", "もも幅", "裾幅", "総丈", "ヒップ", "仕入先", "仕入日", "原価"
        ]
    }

def convert_product_data_to_excel_format(product_data: Dict, sheet_name: str) -> List:
    """
    Convert product data to Excel row format matching the predefined headers.
    
    Args:
        product_data: Dictionary containing product information
        sheet_name: Target sheet name
        
    Returns:
        List of values in the correct order for the sheet headers
    """
    headers = get_predefined_sheet_headers().get(sheet_name, [])
    if not headers:
        return []
    
    row_data = []
    for header in headers:
        value = product_data.get(header, "")
        # Convert None to empty string
        if value is None:
            value = ""
        row_data.append(value)
    
    return row_data

def map_image_data_to_excel_format(image_data: Dict) -> Dict:
    """
    Map data from the image format to Excel format.
    Handles the specific data structure shown in the user's image.
    
    Args:
        image_data: Dictionary containing data in the format from the image
        
    Returns:
        Dictionary in Excel format
    """
    # Extract data from image format
    title = image_data.get('タイトル', '') or image_data.get('title', '')
    brand = image_data.get('ブランド', '') or image_data.get('brand', '')
    product_type = image_data.get('もの', '') or image_data.get('product_type', '')
    color = image_data.get('色', '') or image_data.get('color', '')
    size = image_data.get('サイズ', '') or image_data.get('size', '')
    material = image_data.get('素材', '') or image_data.get('material', '')
    accessories = image_data.get('付属品', '') or image_data.get('accessories', '')
    rank = image_data.get('ランク', '') or image_data.get('rank', '')
    
    # Handle rank conversion (from image: "ランクA" -> "3")
    if rank == "ランクA":
        rank = "3"
    elif rank == "ランクB":
        rank = "2"
    elif rank == "ランクC":
        rank = "1"
    
    # Handle material conversion (from image: "未検出" -> "不明")
    if material == "未検出" or not material:
        material = "不明"
    
    # Create Excel format data
    excel_data = {
        "カテゴリ": "",  # Will be set by AI classification
        "管理番号": image_data.get('管理番号', ''),
        "タイトル": title,
        "文字数": len(title) if title else 0,
        "付属品": accessories if accessories else "無",
        "ランク": rank if rank else "3",  # Default to 3 if not specified
        "コメント": image_data.get('コメント', '') or image_data.get('comment', ''),
        "素材": material,
        "色": color,
        "サイズ": size,
        "着丈": image_data.get('着丈') or None,
        "　肩幅": image_data.get('肩幅') or image_data.get('　肩幅') or None,
        "身幅": image_data.get('身幅') or None,
        "袖丈": image_data.get('袖丈') or None,
        "股上": image_data.get('股上') or None,
        "股下": image_data.get('股下') or None,
        "ウエスト": image_data.get('ウエスト') or None,
        "もも幅": image_data.get('もも幅') or None,
        "裾幅": image_data.get('裾幅') or None,
        "総丈": image_data.get('総丈') or None,
        "ヒップ": image_data.get('ヒップ') or None,
        "梱包サイズ": image_data.get('梱包サイズ', '') or "通常",
        "梱包記号": image_data.get('梱包記号', '') or "◇",
        "美品": image_data.get('美品', ''),
        "ブランド": brand,
        "フリー": image_data.get('フリー', '') or image_data.get('free_text', ''),
        "袖": image_data.get('袖', '') or image_data.get('sleeve', ''),
        "もの": product_type,
        "男女": image_data.get('男女', '') or image_data.get('gender', ''),
        "採寸1": image_data.get('採寸1', '') or image_data.get('measurement1', ''),
        "ラック": image_data.get('ラック', '') or image_data.get('rack', ''),
        "金額": image_data.get('金額') or image_data.get('売値') or image_data.get('price') or None,
        "仕入先": image_data.get('仕入先', '') or image_data.get('supplier', ''),
        "仕入日": image_data.get('仕入日', '') or image_data.get('purchase_date', ''),
        "原価": image_data.get('原価') or image_data.get('cost_price') or None
    }
    
    return excel_data 