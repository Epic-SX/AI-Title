"""
Title optimization service for different marketplace character limits.
Based on manual requirements for character restrictions across various platforms.
"""

from typing import Dict, List, Tuple
import re

# Marketplace character limits based on common Japanese e-commerce platforms
MARKETPLACE_LIMITS = {
    'yahoo': {
        'title_max': 65,  # Yahoo Shopping title limit
        'description_max': 10000,
        'priority_fields': ['management_number', 'brand', 'product_type', 'color', 'size']
    },
    'rakuten': {
        'title_max': 127,  # Rakuten Ichiba title limit
        'description_max': 10000,
        'priority_fields': ['management_number', 'brand', 'product_type', 'color', 'size']
    },
    'amazon': {
        'title_max': 127,  # Amazon Japan title limit (updated from 150)
        'description_max': 2000,
        'priority_fields': ['brand', 'product_type', 'color', 'size', 'management_number']
    },
    'mercari': {
        'title_max': 80,  # Mercari title limit (updated from 40)
        'description_max': 1000,
        'priority_fields': ['brand', 'product_type', 'color']
    },
    'athena_default': {
        'title_max': 140,  # Athena system default (updated from 80)
        'description_max': 5000,
        'priority_fields': ['management_number', 'brand', 'product_type', 'color', 'size']
    }
}

def optimize_title_for_marketplace(
    title: str, 
    marketplace: str, 
    product_data: Dict[str, str]
) -> Tuple[str, bool]:
    """
    Optimize title for specific marketplace character limits.
    
    Args:
        title: Original title
        marketplace: Target marketplace ('yahoo', 'rakuten', 'amazon', 'mercari', 'athena_default')
        product_data: Dictionary containing product information
        
    Returns:
        Tuple of (optimized_title, was_truncated)
    """
    if marketplace not in MARKETPLACE_LIMITS:
        marketplace = 'athena_default'
    
    limits = MARKETPLACE_LIMITS[marketplace]
    max_length = limits['title_max']
    
    # Clean up the title first
    cleaned_title = clean_title_text(title)
    
    # If title is already within limits, return as-is
    if len(cleaned_title) <= max_length:
        return cleaned_title, False
    
    # Extract management number if present
    management_number = extract_management_number(cleaned_title)
    
    # Build optimized title based on priority fields
    priority_fields = limits['priority_fields']
    optimized_parts = []
    
    # Always include management number first if available
    if management_number:
        optimized_parts.append(management_number)
    
    # Add other fields based on priority
    for field in priority_fields:
        if field == 'management_number':
            continue  # Already added
            
        value = product_data.get(field, '').strip()
        if value and value != '不明' and value != 'Unknown':
            # Clean up the value
            value = clean_field_value(value)
            
            # Estimate remaining space
            current_length = len(' '.join(optimized_parts))
            remaining_space = max_length - current_length - 1  # -1 for space
            
            if len(value) <= remaining_space:
                optimized_parts.append(value)
            elif remaining_space > 5:  # Only add if meaningful space remains
                # Truncate value to fit
                truncated_value = value[:remaining_space-3] + '...'
                optimized_parts.append(truncated_value)
                break
    
    optimized_title = ' '.join(optimized_parts)
    
    # Final length check and truncation if necessary
    if len(optimized_title) > max_length:
        optimized_title = optimized_title[:max_length-3] + '...'
    
    # Final cleanup
    optimized_title = clean_title_text(optimized_title)
    
    return optimized_title, True

def clean_title_text(title: str) -> str:
    """Clean up title text according to Japanese SC data entry standards."""
    if not title:
        return title
    
    # Remove prohibited characters
    prohibited_chars = ['<', '>', '"', '&', "'", '\\', '/', '|', '*', '?', ':', ';']
    for char in prohibited_chars:
        title = title.replace(char, '')
    
    # Replace multiple spaces with single space
    title = re.sub(r'\s+', ' ', title)
    
    # Remove leading/trailing spaces
    title = title.strip()
    
    # Remove excessive parentheses
    title = re.sub(r'\(\s*\)', '', title)
    title = re.sub(r'\[\s*\]', '', title)
    
    # Clean up repeated punctuation
    title = re.sub(r'[.]{2,}', '...', title)
    title = re.sub(r'[-]{2,}', '-', title)
    
    return title

def clean_field_value(value: str) -> str:
    """Clean up individual field values."""
    if not value:
        return value
    
    # Remove extra spaces
    value = re.sub(r'\s+', ' ', value).strip()
    
    # Remove parentheses with only spaces
    value = re.sub(r'\(\s*\)', '', value)
    
    # Capitalize first letter if it's all lowercase
    if value.islower():
        value = value.capitalize()
    
    return value

def extract_management_number(title: str) -> str:
    """Extract management number from title."""
    # Look for 13-digit numbers (standard management number format)
    match = re.search(r'\b(\d{13})\b', title)
    if match:
        return match.group(1)
    
    # Look for 12-digit numbers (alternative format)
    match = re.search(r'\b(\d{12})\b', title)
    if match:
        return match.group(1)
    
    # Look for Japanese product codes with letters and numbers
    # Format: ABC1234567890 or similar
    match = re.search(r'\b([A-Z]{2,4}\d{8,12})\b', title)
    if match:
        return match.group(1)
    
    # Look for hyphenated product codes
    # Format: ABC-123-456-789
    match = re.search(r'\b([A-Z0-9]+(?:-[A-Z0-9]+){2,})\b', title)
    if match:
        return match.group(1)
    
    # Fallback to any digit sequence at the beginning
    match = re.search(r'^(\d+)', title.strip())
    if match:
        return match.group(1)
    
    return ''

def validate_title_requirements(title: str, marketplace: str = 'athena_default') -> Dict[str, any]:
    """
    Validate title against marketplace requirements.
    
    Returns:
        Dict with validation results
    """
    if marketplace not in MARKETPLACE_LIMITS:
        marketplace = 'athena_default'
    
    limits = MARKETPLACE_LIMITS[marketplace]
    max_length = limits['title_max']
    
    # Basic validation
    is_valid = len(title) <= max_length
    has_management_number = bool(extract_management_number(title))
    
    # Additional Japanese SC data entry validations
    validation_issues = []
    
    # Check for prohibited characters (common in Japanese e-commerce)
    prohibited_chars = ['<', '>', '"', '&', "'", '\\', '/', '|', '*', '?', ':', ';']
    found_prohibited = [char for char in prohibited_chars if char in title]
    if found_prohibited:
        validation_issues.append(f"禁止文字が含まれています: {', '.join(found_prohibited)}")
    
    # Check for consecutive spaces
    if '  ' in title:
        validation_issues.append("連続したスペースが含まれています")
    
    # Check for leading/trailing spaces
    if title != title.strip():
        validation_issues.append("先頭または末尾にスペースが含まれています")
    
    # Check for required elements based on marketplace
    if marketplace in ['yahoo', 'rakuten', 'athena_default'] and not has_management_number:
        validation_issues.append("管理番号が必要です")
    
    # Check for minimum length
    min_length = 10 if marketplace in ['amazon', 'mercari'] else 15
    if len(title) < min_length:
        validation_issues.append(f"タイトルが短すぎます (最小{min_length}文字)")
    
    # Check for excessive special characters
    special_char_count = len([c for c in title if not c.isalnum() and not c.isspace() and c not in ['-', '(', ')']])
    if special_char_count > 5:
        validation_issues.append("特殊文字が多すぎます")
    
    result = {
        'is_valid': is_valid and len(validation_issues) == 0,
        'current_length': len(title),
        'max_length': max_length,
        'over_limit_by': max(0, len(title) - max_length),
        'has_management_number': has_management_number,
        'marketplace': marketplace,
        'validation_issues': validation_issues,
        'character_analysis': {
            'has_prohibited_chars': len(found_prohibited) > 0,
            'has_consecutive_spaces': '  ' in title,
            'has_leading_trailing_spaces': title != title.strip(),
            'special_char_count': special_char_count
        }
    }
    
    return result

def generate_marketplace_variants(
    title: str, 
    product_data: Dict[str, str]
) -> Dict[str, Dict[str, any]]:
    """
    Generate title variants for all supported marketplaces.
    
    Returns:
        Dict with marketplace names as keys and title info as values
    """
    variants = {}
    
    for marketplace in MARKETPLACE_LIMITS.keys():
        optimized_title, was_truncated = optimize_title_for_marketplace(
            title, marketplace, product_data
        )
        
        validation = validate_title_requirements(optimized_title, marketplace)
        
        variants[marketplace] = {
            'title': optimized_title,
            'was_truncated': was_truncated,
            'validation': validation,
            'character_limit': MARKETPLACE_LIMITS[marketplace]['title_max']
        }
    
    return variants 

def perform_sc_data_quality_check(product_data: Dict[str, str]) -> Dict[str, any]:
    """
    Perform comprehensive data quality check for SC (Supply Chain) data entry.
    
    Args:
        product_data: Dictionary containing all product information
        
    Returns:
        Dict with quality assessment and recommendations
    """
    quality_score = 0
    max_score = 100
    issues = []
    recommendations = []
    
    # Check management number (20 points)
    management_number = product_data.get('management_number', '')
    if management_number and len(management_number) >= 10:
        quality_score += 20
    elif management_number:
        quality_score += 10
        issues.append("管理番号が短すぎます")
        recommendations.append("管理番号は10文字以上推奨")
    else:
        issues.append("管理番号が未設定です")
        recommendations.append("管理番号を必ず設定してください")
    
    # Check brand (15 points)
    brand = product_data.get('brand', '')
    if brand and brand != '不明' and brand != 'Unknown':
        quality_score += 15
    else:
        issues.append("ブランド名が未設定または不明です")
        recommendations.append("正確なブランド名を設定してください")
    
    # Check product type (15 points)
    product_type = product_data.get('product_type', '')
    if product_type and product_type != '不明' and product_type != 'Unknown':
        quality_score += 15
    else:
        issues.append("商品種別が未設定または不明です")
        recommendations.append("具体的な商品種別を設定してください")
    
    # Check color (10 points)
    color = product_data.get('color', '')
    if color and color != '不明' and color != 'Unknown':
        quality_score += 10
    else:
        issues.append("色が未設定または不明です")
        recommendations.append("可能な限り色を特定してください")
    
    # Check size (10 points)
    size = product_data.get('size', '')
    if size and size != '不明' and size != 'Unknown':
        quality_score += 10
    else:
        issues.append("サイズが未設定または不明です")
        recommendations.append("サイズ情報を確認してください")
    
    # Check material (10 points)
    material = product_data.get('material', '')
    if material and material != '不明' and material != 'Unknown':
        quality_score += 10
    else:
        issues.append("素材が未設定または不明です")
        recommendations.append("素材情報があれば設定してください")
    
    # Check title quality (20 points)
    title = product_data.get('title', '')
    if title:
        title_clean = clean_title_text(title)
        if len(title_clean) >= 20:
            quality_score += 10
        if not any(char in title_clean for char in ['<', '>', '"', '&']):
            quality_score += 5
        if extract_management_number(title_clean):
            quality_score += 5
        else:
            issues.append("タイトルに管理番号が含まれていません")
            recommendations.append("タイトルの先頭に管理番号を配置してください")
    else:
        issues.append("タイトルが設定されていません")
        recommendations.append("適切なタイトルを生成してください")
    
    # Determine quality grade
    if quality_score >= 90:
        grade = 'A'
        grade_description = '優秀'
    elif quality_score >= 75:
        grade = 'B'
        grade_description = '良好'
    elif quality_score >= 60:
        grade = 'C'
        grade_description = '普通'
    elif quality_score >= 40:
        grade = 'D'
        grade_description = '要改善'
    else:
        grade = 'F'
        grade_description = '不合格'
    
    return {
        'quality_score': quality_score,
        'max_score': max_score,
        'grade': grade,
        'grade_description': grade_description,
        'completion_rate': f"{quality_score}/{max_score} ({(quality_score/max_score)*100:.1f}%)",
        'issues': issues,
        'recommendations': recommendations,
        'field_completeness': {
            'management_number': bool(management_number),
            'brand': bool(brand and brand != '不明'),
            'product_type': bool(product_type and product_type != '不明'),
            'color': bool(color and color != '不明'),
            'size': bool(size and size != '不明'),
            'material': bool(material and material != '不明'),
            'title': bool(title)
        }
    } 