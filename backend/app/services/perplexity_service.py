import os
import base64
import requests
import json
import re
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv
from app.services.title_optimization_service import (
    generate_marketplace_variants, 
    validate_title_requirements,
    optimize_title_for_marketplace,
    perform_sc_data_quality_check
)

# Load environment variables
load_dotenv()

# Perplexity API Key from environment variables
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

if not PERPLEXITY_API_KEY:
    raise ValueError("PERPLEXITY_API_KEY environment variable not set")

# Product database for model number lookup (can be expanded with external APIs)
MODEL_NUMBER_DATABASE = {
    # Nike models
    "Air Force 1": "Nike Air Force 1",
    "AF1": "Nike Air Force 1", 
    "Air Max 90": "Nike Air Max 90",
    "Air Max 97": "Nike Air Max 97",
    "React": "Nike React",
    "Zoom": "Nike Zoom",
    "Dunk": "Nike Dunk",
    "Blazer": "Nike Blazer",
    
    # Adidas models
    "Stan Smith": "Adidas Stan Smith",
    "Ultraboost": "Adidas Ultraboost",
    "NMD": "Adidas NMD",
    "Superstar": "Adidas Superstar",
    "Gazelle": "Adidas Gazelle",
    "Yeezy": "Adidas Yeezy",
    
    # Converse models
    "Chuck Taylor": "Converse Chuck Taylor All Star",
    "All Star": "Converse All Star",
    "Chuck 70": "Converse Chuck 70",
    
    # Vans models
    "Old Skool": "Vans Old Skool",
    "Authentic": "Vans Authentic",
    "Era": "Vans Era",
    "Slip-On": "Vans Slip-On",
    
    # Fashion brands - common model patterns
    "Supreme": "Supreme",
    "Off-White": "Off-White",
    "BAPE": "A Bathing Ape",
    "Stone Island": "Stone Island",
    "CP Company": "C.P. Company",
}

# Brand aliases for better recognition
BRAND_ALIASES = {
    "ナイキ": "Nike",
    "アディダス": "Adidas", 
    "コンバース": "Converse",
    "バンズ": "Vans",
    "シュプリーム": "Supreme",
    "オフホワイト": "Off-White",
    "ベイプ": "BAPE",
    "ストーンアイランド": "Stone Island",
    "ユニクロ": "UNIQLO",
    "ジーユー": "GU",
    "無印良品": "MUJI",
    "ザラ": "ZARA",
    "エイチアンドエム": "H&M",
}

def derive_official_name_from_model(model_number: str, brand: str = "") -> Tuple[str, bool]:
    """
    Derive official product name from model number using database lookup and web search.
    
    Args:
        model_number: Model number or product code
        brand: Brand name for context
        
    Returns:
        Tuple of (official_name, found_in_database)
    """
    if not model_number or model_number.lower() in ['不明', 'unknown', '']:
        return model_number, False
    
    # Clean up model number
    clean_model = model_number.strip().upper()
    
    # Direct lookup in database
    for key, official_name in MODEL_NUMBER_DATABASE.items():
        if key.upper() in clean_model or clean_model in key.upper():
            return official_name, True
    
    # Brand-specific lookup
    if brand and brand.strip():
        clean_brand = normalize_brand_name(brand)
        brand_model_key = f"{clean_brand} {clean_model}"
        
        # Check if brand + model exists
        for key, official_name in MODEL_NUMBER_DATABASE.items():
            if clean_brand.upper() in key.upper() and any(part in key.upper() for part in clean_model.split()):
                return official_name, True
    
    # If no database match, try to enhance with Perplexity search
    try:
        enhanced_name = search_model_number_online(model_number, brand)
        if enhanced_name and enhanced_name != model_number:
            return enhanced_name, True
    except Exception as e:
        print(f"Error searching model number online: {e}")
    
    return model_number, False

def search_model_number_online(model_number: str, brand: str = "") -> str:
    """
    Search for official product name using Perplexity API.
    
    Args:
        model_number: Model number to search
        brand: Brand context
        
    Returns:
        Official product name if found
    """
    search_query = f"What is the official product name for {brand} {model_number}" if brand else f"What is the official product name for model {model_number}"
    
    prompt = f"""Please provide the exact official product name for the following:
Model Number: {model_number}
Brand: {brand if brand else 'Unknown'}

Instructions:
1. If this is a known product, provide the official commercial name
2. Include the brand name in the response if identified
3. Be specific and accurate
4. If unsure, just return the original model number
5. Respond in the format: "Official Name: [product name]" or "Unknown: [original model]"

Search Query: {search_query}"""

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "sonar",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse the response
            if "Official Name:" in content:
                official_name = content.split("Official Name:")[1].strip().split('\n')[0]
                return official_name
            elif "Unknown:" not in content:
                # If response doesn't contain "Unknown:", use the response as official name
                return content.strip().split('\n')[0]
                
    except Exception as e:
        print(f"Error in online model search: {e}")
    
    return model_number

def normalize_brand_name(brand: str) -> str:
    """
    Normalize brand name using aliases.
    """
    if not brand:
        return ""
    
    clean_brand = brand.strip()
    
    # Check Japanese aliases
    if clean_brand in BRAND_ALIASES:
        return BRAND_ALIASES[clean_brand]
    
    return clean_brand

def clean_json_response(text):
    """
    Cleans a JSON response that might be wrapped in markdown code blocks.
    """
    # Remove code block markers if present
    code_block_pattern = r"```(?:json)?(.*?)```"
    match = re.search(code_block_pattern, text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    
    return text

def process_color_information(color_text: str) -> str:
    """
    Process color information to add "系" to color descriptions.
    
    Args:
        color_text: Original color text
        
    Returns:
        Processed color text with "系" added to color names
    """
    if not color_text or color_text in ['不明', 'Unknown', '']:
        return color_text
    
    # List of color names that should have "系" added
    color_names = [
        '赤', '青', '黄', '緑', '黒', '白', '灰', '茶', '紫', '橙', 'オレンジ', 
        'ピンク', 'ネイビー', 'ベージュ', 'カーキ', 'ワイン', 'ブラウン', 'グレー', 
        'ブルー', 'レッド', 'イエロー', 'グリーン', 'ホワイト', 'ブラック', 'パープル',
        'ゴールド', 'シルバー', 'ライトブルー', 'ダークブルー', 'ライトグリーン',
        'ダークグリーン', 'ライトグレー', 'ダークグレー', 'オフホワイト', 'クリーム',
        'マスタード', 'ライム', 'ターコイズ', 'コーラル', 'ミント', 'ラベンダー',
        'ピーチ', 'スカイブルー', 'ロイヤルブルー', 'エメラルドグリーン', 'チャコール',
        'アイボリー', 'ベビーピンク', 'ライトピンク', 'ダークピンク', 'ワインレッド',
        'ライトブラウン', 'ダークブラウン', 'キャメル', 'モカ', 'エクリュ'
    ]
    
    processed_color = color_text
    
    # Add "系" to each color name if not already present
    for color_name in color_names:
        # Check if the color name exists in the text and doesn't already have "系"
        pattern = r'\b' + re.escape(color_name) + r'(?!系)\b'
        if re.search(pattern, processed_color):
            processed_color = re.sub(pattern, color_name + '系', processed_color)
    
    return processed_color

def format_listing_data(parsed_analysis: Dict[str, Any], product_id: str) -> Dict[str, Any]:
    """
    Format the parsed analysis data according to the listing format requirements.
    
    Args:
        parsed_analysis: The parsed analysis from AI
        product_id: Product ID/management number
        
    Returns:
        Formatted data for listing
    """
    # Process color information to add "系"
    color = process_color_information(parsed_analysis.get('color', ''))
    
    # Format the listing data according to the requirements
    formatted_data = {
        'management_number': product_id,
        'brand': parsed_analysis.get('brand', ''),
        'product_type': parsed_analysis.get('product_type', ''),
        'color': color,
        'size': parsed_analysis.get('size', ''),
        'material': parsed_analysis.get('material', ''),
        'title': parsed_analysis.get('title', ''),
        'key_features': parsed_analysis.get('key_features', []),
        'confidence_scores': parsed_analysis.get('confidence_scores', {})
    }
    
    return formatted_data

def format_comprehensive_listing_data(parsed_analysis: Dict[str, Any], product_id: str) -> Dict[str, Any]:
    """
    Format the parsed analysis data according to the comprehensive listing format requirements.
    This format includes all fields required for the full listing system.
    
    Args:
        parsed_analysis: The parsed analysis from AI
        product_id: Product ID/management number
        
    Returns:
        Comprehensive formatted data for listing with all required fields
    """
    # Process color information to add "系"
    color = process_color_information(parsed_analysis.get('color', ''))
    
    # Derive official name from model number if available
    model_number = parsed_analysis.get('model_number', '')
    brand = parsed_analysis.get('brand', '')
    official_name, found_in_db = derive_official_name_from_model(model_number, brand)
    
    # Enhanced title with official name if found
    title = parsed_analysis.get('title', '')
    if found_in_db and official_name != model_number:
        # If we found an official name, enhance the title
        if model_number and model_number not in title:
            title = f"{title} {official_name}"
        elif not any(part in title for part in official_name.split()):
            title = f"{official_name} {title}"
    
    # Format the comprehensive listing data
    comprehensive_data = {
        'カテゴリ': '',  # To be filled based on product_type
        '管理番号': product_id,
        'タイトル': title,
        '付属品': '',
        'ラック': '',
        'ランク': '',
        '型番': official_name if found_in_db else model_number,  # Use official name or original model
        'コメント': '',
        '仕立て・収納': '',
        '素材': parsed_analysis.get('material', ''),
        '色': color,
        'サイズ': parsed_analysis.get('size', ''),
        'トップス': '',
        'パンツ': '',
        'スカート': '',
        'ワンピース': '',
        'スカートスーツ': '',
        'パンツスーツ': '',
        '靴': '',
        'ブーツ': '',
        'スニーカー': '',
        'ベルト': '',
        'ネクタイ縦横': '',
        '帽子': '',
        'バッグ': '',
        'ネックレス': '',
        'サングラス': '',
        'あまり': '',
        '出品日': '',
        '出品URL': '',
        '原価': '',
        '売値': '',
        '梱包サイズ': '',
        '仕入先': '',
        '仕入日': '',
        'ID': product_id,
        'ブランド': normalize_brand_name(brand),  # Use normalized brand name
        'シリーズ名': '',
        '原産国': ''
    }
    
    # Auto-fill category based on product type
    product_type = parsed_analysis.get('product_type', '').lower()
    category_mapping = {
        'tシャツ': 'トップス',
        'シャツ': 'トップス',
        'ブラウス': 'トップス',
        'セーター': 'トップス',
        'ニット': 'トップス',
        'ジャケット': 'トップス',
        'コート': 'トップス',
        'パンツ': 'パンツ',
        'ジーンズ': 'パンツ',
        'チノ': 'パンツ',
        'スラックス': 'パンツ',
        'スカート': 'スカート',
        'ミニスカート': 'スカート',
        'ロングスカート': 'スカート',
        'ワンピース': 'ワンピース',
        'ドレス': 'ワンピース',
        '靴': '靴',
        'シューズ': '靴',
        'パンプス': '靴',
        'ヒール': '靴',
        'ブーツ': 'ブーツ',
        'スニーカー': 'スニーカー',
        'ベルト': 'ベルト',
        'ネクタイ': 'ネクタイ縦横',
        '帽子': '帽子',
        'キャップ': '帽子',
        'ハット': '帽子',
        'バッグ': 'バッグ',
        'ハンドバッグ': 'バッグ',
        'トートバッグ': 'バッグ',
        'リュック': 'バッグ',
        'ネックレス': 'ネックレス',
        'サングラス': 'サングラス',
        'メガネ': 'サングラス'
    }
    
    # Find matching category
    detected_category = ''
    for keyword, category in category_mapping.items():
        if keyword in product_type:
            detected_category = category
            break
    
    if detected_category:
        comprehensive_data['カテゴリ'] = detected_category
        # Also set the specific category field
        if detected_category in comprehensive_data:
            comprehensive_data[detected_category] = '1'  # Mark as present
    
    return comprehensive_data

def analyze_single_image(image_path: str, metadata: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Analyze a single image using Perplexity AI.
    
    Args:
        image_path: Path to the image to analyze
        metadata: Optional dictionary with additional context (brand, model, etc.)
        
    Returns:
        Dictionary containing the analysis results
    """
    if metadata is None:
        metadata = {}
    
    # Convert image to base64
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Get product ID from metadata (extracted from filename)
    product_id = metadata.get('product_id', '')
    
    # Create enhanced prompt for better brand and size detection
    prompt = """日本語で回答してください。以下の製品画像を詳細に分析して、正確な商品情報を抽出してください。

重要な指示：
1. ブランド名の検出を最優先してください。画像内のロゴ、タグ、刻印、パッケージなどからブランド名を必ず探してください。
2. サイズ情報を詳細に検出してください。画像内の表示、タグ、ラベル、測定スケールなどからサイズを抽出してください。
3. 色は具体的で正確な色名を使用し、必ず「系」をつけてください（例：ネイビー系、ベージュ系、オフホワイト系等）。複数の色がある場合は「赤系×グレー系 ボーダー」のように表現してください。
4. 素材は画像から判断できる場合は具体的に記載してください。
5. タイトルには管理番号を含めないでください。ブランド名、商品名、色、サイズのみを含めてください。

ブランド検出のヒント：
- 衣類：タグ、ラベル、刺繍、プリント
- 靴：インソール、アウトソール、タン、ヒール部分
- バッグ：金具、ファスナー、内側タグ
- アクセサリー：刻印、ホールマーク
- 電子機器：本体表示、ロゴ

サイズ検出のヒント：
- 衣類：サイズタグ、洗濯表示タグ
- 靴：インソール、箱、タグ
- その他：製品ラベル、パッケージ、測定スケール"""

    # Add metadata context if available
    brand = metadata.get('brand', '')
    model = metadata.get('model_number', '')
    product_type = metadata.get('product_type', '')
    
    if brand:
        prompt += f"\n\n既知のブランド情報: {brand}"
    if model:
        prompt += f"\n既知のモデル番号: {model}"
    if product_type:
        prompt += f"\n既知の製品タイプ: {product_type}"
        
    prompt += """\n\n回答は以下のフィールドを持つJSONオブジェクトとしてフォーマットしてください：
- title: 魅力的な製品タイトル（ブランド名、商品名、色、サイズを含む。管理番号は含めない）
- brand: ブランド名（必ず画像から検出を試みる、不明な場合は"不明"）
- color: 色（具体的な色名に「系」をつける。複数色の場合は「赤系×グレー系」のように表現。不明な場合は"不明"）
- product_type: 製品タイプ（例：Tシャツ、スニーカー、バッグ等）
- material: 素材（判断可能な場合、不明な場合は"不明"）
- size: サイズ（必ず画像から検出を試みる、不明な場合は"不明"）
- key_features: 主な特徴（配列形式）
- confidence_scores: 各項目の確信度（brand_confidence, size_confidence, color_confidence）

JSONフォーマットのみで回答し、マークダウンやコードブロック（```）は使用しないでください。"""
    
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "sonar",  # Using a valid Perplexity model that can process images
        "messages": [
            {
                "role": "user", 
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{encoded_string}"
                        }
                    }
                ]
            }
        ]
    }
    
    response = requests.post(
        "https://api.perplexity.ai/chat/completions",
        headers=headers,
        json=payload
    )
    
    if response.status_code != 200:
        raise Exception(f"Error from Perplexity API: {response.text}")
    
    result = response.json()
    
    # Extract the analysis from the response
    analysis = result["choices"][0]["message"]["content"]
    
    # Clean up potential markdown/code block formatting
    cleaned_analysis = clean_json_response(analysis)
    
    # Try to parse the response as JSON
    try:
        parsed_analysis = json.loads(cleaned_analysis)
        
        # Process color information to ensure "系" is added
        if 'color' in parsed_analysis:
            parsed_analysis['color'] = process_color_information(parsed_analysis['color'])
        
        # Ensure product ID is included at the beginning of the title
        if product_id and len(product_id) >= 10:  # Ensure it's a valid product ID
            original_title = parsed_analysis.get("title", "")
            
            # Remove any existing product ID from the title to avoid duplication
            # Check if the title already contains the product ID
            if product_id in original_title:
                # Remove the product ID from wherever it appears in the title
                cleaned_title = original_title.replace(product_id, "").strip()
                # Remove any leading/trailing spaces or separators
                cleaned_title = cleaned_title.lstrip("- ").rstrip("- ").strip()
            else:
                cleaned_title = original_title
            
            # Always place product ID at the beginning
            parsed_analysis["title"] = f"{product_id} {cleaned_title}"
        
        return parsed_analysis
    except json.JSONDecodeError:
        # If not JSON, return the raw text but notify of the parse error
        fallback_title = "解析エラー"
        if product_id and len(product_id) >= 10:
            fallback_title = f"{product_id} {fallback_title}"
            
        return {
            "title": fallback_title,
            "brand": "不明",
            "color": "不明", 
            "product_type": "不明",
            "material": "不明",
            "size": "不明",
            "raw_text": cleaned_analysis,
            "parse_error": "Failed to parse response as JSON"
        }

def analyze_images(image_paths: List[str], metadata: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Analyze images using Perplexity AI to extract brand, color, product name, material, and other information.
    
    Args:
        image_paths: List of paths to images to analyze
        metadata: Optional dictionary with additional context (brand, model, etc.)
        
    Returns:
        Dictionary containing the analysis results with manual review flagging
    """
    if metadata is None:
        metadata = {}
    
    # Get product ID from metadata (extracted from filename)
    product_id = metadata.get('product_id', '')
    
    # Create enhanced prompt for better brand and size detection with model number focus
    prompt = """日本語で回答してください。以下の製品画像を詳細に分析して、正確な商品情報を抽出してください。

重要な指示：
1. ブランド名の検出を最優先してください。画像内のロゴ、タグ、刻印、パッケージなどからブランド名を必ず探してください。
2. 型番・モデル番号を詳細に検出してください。画像内の表示、タグ、ラベル、製品本体からモデル番号を抽出してください。
3. サイズ情報を詳細に検出してください。画像内の表示、タグ、ラベル、測定スケールなどからサイズを抽出してください。
4. 色は具体的で正確な色名を使用し、必ず「系」をつけてください（例：ネイビー系、ベージュ系、オフホワイト系等）。複数の色がある場合は「赤系×グレー系 ボーダー」のように表現してください。
5. 素材は画像から判断できる場合は具体的に記載してください。
6. タイトルには管理番号を含めないでください。ブランド名、商品名、色、サイズのみを含めてください。
7. 複数の画像がある場合は、すべての画像を総合的に分析して一つの商品として情報を抽出してください。

ブランド検出のヒント：
- 衣類：タグ、ラベル、刺繍、プリント
- 靴：インソール、アウトソール、タン、ヒール部分
- バッグ：金具、ファスナー、内側タグ
- アクセサリー：刻印、ホールマーク
- 電子機器：本体表示、ロゴ

型番・モデル番号検出のヒント：
- 製品本体への刻印や印字
- タグやラベルの表示
- パッケージや箱の記載
- アルファベットと数字の組み合わせ（例：AF-1、NMD-R1、CTxxxx等）

サイズ検出のヒント：
- 衣類：サイズタグ、洗濯表示タグ
- 靴：インソール、箱、タグ
- その他：製品ラベル、パッケージ、測定スケール"""

    # Add metadata context if available
    brand = metadata.get('brand', '')
    model = metadata.get('model_number', '')
    product_type = metadata.get('product_type', '')
    
    if brand:
        prompt += f"\n\n既知のブランド情報: {brand}"
    if model:
        prompt += f"\n既知のモデル番号: {model}"
    if product_type:
        prompt += f"\n既知の製品タイプ: {product_type}"
        
    # Add information about multiple images if applicable
    if len(image_paths) > 1:
        prompt += f"\n\n注意: {len(image_paths)}枚の画像が提供されています。すべての画像を総合的に分析して、一つの商品として最も正確で魅力的なタイトルを生成してください。"
        
    prompt += """\n\n回答は以下のフィールドを持つJSONオブジェクトとしてフォーマットしてください：
- title: 魅力的な製品タイトル（ブランド名、商品名、色、サイズを含む。管理番号は含めない）
- brand: ブランド名（必ず画像から検出を試みる、不明な場合は"不明"）
- model_number: 型番・モデル番号（画像から検出できた場合、不明な場合は"不明"）
- color: 色（具体的な色名に「系」をつける。複数色の場合は「赤系×グレー系」のように表現。不明な場合は"不明"）
- product_type: 製品タイプ（例：Tシャツ、スニーカー、バッグ等）
- material: 素材（判断可能な場合、不明な場合は"不明"）
- size: サイズ（必ず画像から検出を試みる、不明な場合は"不明"）
- key_features: 主な特徴（配列形式）
- confidence_scores: 各項目の確信度（brand_confidence, size_confidence, color_confidence, model_confidence）

JSONフォーマットのみで回答し、マークダウンやコードブロック（```）は使用しないでください。"""
    
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prepare content array with text prompt and all images
    content = [{"type": "text", "text": prompt}]
    
    # Add all images to the content
    for i, image_path in enumerate(image_paths):
        try:
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encoded_string}"
                    }
                })
        except Exception as e:
            print(f"Error processing image {image_path}: {str(e)}")
            continue
    
    payload = {
        "model": "sonar",  # Using a valid Perplexity model that can process images
        "messages": [
            {
                "role": "user", 
                "content": content
            }
        ]
    }
    
    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise Exception(f"Error from Perplexity API: {response.text}")
        
        result = response.json()
        
        # Extract the analysis from the response
        analysis = result["choices"][0]["message"]["content"]
        
        # Clean up potential markdown/code block formatting
        cleaned_analysis = clean_json_response(analysis)
        
        # Try to parse the response as JSON
        try:
            parsed_analysis = json.loads(cleaned_analysis)
            
            # Process color information to ensure "系" is added
            if 'color' in parsed_analysis:
                parsed_analysis['color'] = process_color_information(parsed_analysis['color'])
            
            # Enhance brand name using aliases
            if 'brand' in parsed_analysis:
                parsed_analysis['brand'] = normalize_brand_name(parsed_analysis['brand'])
            
            # Try to derive official name from model number
            model_number = parsed_analysis.get('model_number', '')
            brand = parsed_analysis.get('brand', '')
            if model_number and model_number != '不明':
                official_name, found_in_db = derive_official_name_from_model(model_number, brand)
                if found_in_db:
                    parsed_analysis['official_product_name'] = official_name
                    # Enhance the title with official name if not already present
                    current_title = parsed_analysis.get('title', '')
                    if official_name not in current_title and brand in official_name:
                        parsed_analysis['title'] = f"{current_title} ({official_name})"
            
            # Ensure product ID is included at the beginning of the title
            if product_id and len(product_id) >= 10:  # Ensure it's a valid product ID
                original_title = parsed_analysis.get("title", "")
                
                # Remove any existing product ID from the title to avoid duplication
                # Check if the title already contains the product ID
                if product_id in original_title:
                    # Remove the product ID from wherever it appears in the title
                    cleaned_title = original_title.replace(product_id, "").strip()
                    # Remove any leading/trailing spaces or separators
                    cleaned_title = cleaned_title.lstrip("- ").rstrip("- ").strip()
                else:
                    cleaned_title = original_title
                
                # Always place product ID at the beginning
                parsed_analysis["title"] = f"{product_id} {cleaned_title}"
            
            # Format the data for listing
            formatted_data = format_listing_data(parsed_analysis, product_id)
            
            # Format comprehensive listing data
            comprehensive_listing_data = format_comprehensive_listing_data(parsed_analysis, product_id)
            
            # Generate marketplace title variants
            marketplace_variants = generate_marketplace_variants(
                parsed_analysis.get("title", ""), 
                formatted_data
            )
            
            # Add title validation for the main title
            title_validation = validate_title_requirements(
                parsed_analysis.get("title", ""), 
                'athena_default'
            )
            
            # Perform SC data quality check
            data_quality = perform_sc_data_quality_check(formatted_data)
            
            return {
                "raw_response": parsed_analysis,
                "formatted_data": formatted_data,
                "comprehensive_listing_data": comprehensive_listing_data,
                "marketplace_variants": marketplace_variants,
                "title_validation": title_validation,
                "data_quality": data_quality,
                "status": "success"
            }
            
        except json.JSONDecodeError:
            # If not JSON, return the raw text but notify of the parse error
            fallback_title = "解析エラー"
            if product_id and len(product_id) >= 10:
                fallback_title = f"{product_id} {fallback_title}"
            
            # Create basic formatted data
            formatted_data = {
                'management_number': product_id,
                'brand': '不明',
                'product_type': '不明',
                'color': '不明',
                'size': '不明',
                'material': '不明',
                'title': fallback_title
            }
            
            # Create comprehensive listing data for fallback
            comprehensive_listing_data = format_comprehensive_listing_data({
                'brand': '不明',
                'product_type': '不明',
                'color': '不明',
                'size': '不明',
                'material': '不明',
                'title': fallback_title
            }, product_id)
            
            marketplace_variants = generate_marketplace_variants(fallback_title, formatted_data)
            title_validation = validate_title_requirements(fallback_title, 'athena_default')
            data_quality = perform_sc_data_quality_check(formatted_data)
                
            return {
                "raw_response": {
                    "title": fallback_title,
                    "brand": "不明",
                    "color": "不明", 
                    "product_type": "不明",
                    "material": "不明",
                    "size": "不明",
                    "raw_text": cleaned_analysis,
                    "parse_error": "Failed to parse response as JSON"
                },
                "formatted_data": formatted_data,
                "comprehensive_listing_data": comprehensive_listing_data,
                "marketplace_variants": marketplace_variants,
                "title_validation": title_validation,
                "data_quality": data_quality,
                "status": "success"
            }
            
    except Exception as e:
        print(f"Error during API call: {str(e)}")
        fallback_title = "API エラー"
        if product_id and len(product_id) >= 10:
            fallback_title = f"{product_id} {fallback_title}"
        
        # Create basic formatted data
        formatted_data = {
            'management_number': product_id,
            'brand': '不明',
            'product_type': '不明',
            'color': '不明',
            'size': '不明',
            'material': '不明',
            'title': fallback_title
        }
        
        # Create comprehensive listing data for fallback
        comprehensive_listing_data = format_comprehensive_listing_data({
            'brand': '不明',
            'product_type': '不明',
            'color': '不明',
            'size': '不明',
            'material': '不明',
            'title': fallback_title
        }, product_id)
        
        marketplace_variants = generate_marketplace_variants(fallback_title, formatted_data)
        title_validation = validate_title_requirements(fallback_title, 'athena_default')
        data_quality = perform_sc_data_quality_check(formatted_data)
            
        return {
            "raw_response": {
                "title": fallback_title,
                "brand": "不明",
                "color": "不明", 
                "product_type": "不明",
                "material": "不明",
                "size": "不明",
                "error": str(e)
            },
            "formatted_data": formatted_data,
            "comprehensive_listing_data": comprehensive_listing_data,
            "marketplace_variants": marketplace_variants,
            "title_validation": title_validation,
            "data_quality": data_quality,
            "status": "error",
            "error": str(e)
        } 

def filter_for_manual_review(analysis_results: List[Dict[str, Any]], image_paths: List[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Filter products that need manual review (unknown brand or size) and prepare them for visual confirmation.
    
    Args:
        analysis_results: List of analysis results from analyze_images
        image_paths: List of corresponding image paths
        
    Returns:
        Tuple of (auto_approved_products, products_needing_review)
    """
    auto_approved = []
    needs_review = []
    
    for i, result in enumerate(analysis_results):
        raw_response = result.get('raw_response', {})
        brand = raw_response.get('brand', '').strip()
        size = raw_response.get('size', '').strip()
        
        # Check if brand or size is unknown
        brand_unknown = not brand or brand in ['不明', 'Unknown', '']
        size_unknown = not size or size in ['不明', 'Unknown', '']
        
        if brand_unknown or size_unknown:
            # Add to manual review with image information
            review_case = {
                'product_data': result,
                'image_path': image_paths[i] if i < len(image_paths) else None,
                'review_reasons': [],
                'needs_human_confirmation': True
            }
            
            # Add specific reasons for review
            if brand_unknown:
                review_case['review_reasons'].append('ブランド不明')
            if size_unknown:
                review_case['review_reasons'].append('サイズ不明')
                
            needs_review.append(review_case)
        else:
            auto_approved.append(result)
    
    return auto_approved, needs_review

def display_manual_review_summary(needs_review: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Create a summary of products that need manual review for display to humans.
    
    Args:
        needs_review: List of products needing manual review
        
    Returns:
        Summary information for human review
    """
    if not needs_review:
        return {
            'total_for_review': 0,
            'message': '手動確認が必要な商品はありません。すべての商品が自動承認されました。'
        }
    
    summary = {
        'total_for_review': len(needs_review),
        'message': f'{len(needs_review)}個の商品が手動確認を必要としています。',
        'review_cases': []
    }
    
    for case in needs_review:
        product_data = case['product_data']
        raw_response = product_data.get('raw_response', {})
        
        review_info = {
            'title': raw_response.get('title', '不明な商品'),
            'brand': raw_response.get('brand', '不明'),
            'size': raw_response.get('size', '不明'),
            'color': raw_response.get('color', '不明'),
            'product_type': raw_response.get('product_type', '不明'),
            'image_path': case.get('image_path'),
            'reasons': case.get('review_reasons', []),
            'confidence_scores': raw_response.get('confidence_scores', {})
        }
        
        summary['review_cases'].append(review_info)
    
    return summary

def process_batch_with_review_filter(image_paths: List[str], metadata_list: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Process a batch of images and filter for manual review.
    
    Args:
        image_paths: List of image paths to analyze
        metadata_list: Optional list of metadata for each image
        
    Returns:
        Dictionary with auto-approved products and manual review cases
    """
    if metadata_list is None:
        metadata_list = [{}] * len(image_paths)
    
    # Analyze all images
    analysis_results = []
    for i, image_path in enumerate(image_paths):
        try:
            metadata = metadata_list[i] if i < len(metadata_list) else {}
            result = analyze_images([image_path], metadata)
            analysis_results.append(result)
        except Exception as e:
            # Create error result for failed analysis
            error_result = {
                'raw_response': {
                    'title': f'解析エラー: {os.path.basename(image_path)}',
                    'brand': '不明',
                    'size': '不明',
                    'color': '不明',
                    'product_type': '不明',
                    'error': str(e)
                },
                'status': 'error'
            }
            analysis_results.append(error_result)
    
    # Filter for manual review
    auto_approved, needs_review = filter_for_manual_review(analysis_results, image_paths)
    
    # Create review summary
    review_summary = display_manual_review_summary(needs_review)
    
    return {
        'auto_approved': auto_approved,
        'auto_approved_count': len(auto_approved),
        'needs_review': needs_review,
        'review_summary': review_summary,
        'total_processed': len(analysis_results)
    } 