import os
import base64
import requests
import json
import re
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Perplexity API Key from environment variables
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

if not PERPLEXITY_API_KEY:
    raise ValueError("PERPLEXITY_API_KEY environment variable not set")

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

def analyze_images(image_paths: List[str], metadata: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Analyze images using Perplexity AI to extract brand, color, product name, material, and other information.
    
    Args:
        image_paths: List of paths to images to analyze
        metadata: Optional dictionary with additional context (brand, model, etc.)
        
    Returns:
        Dictionary containing the analysis results
    """
    if metadata is None:
        metadata = {}
        
    # Convert images to base64
    images_base64 = []
    for image_path in image_paths:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            images_base64.append(encoded_string)
    
    # Create prompt with all images and metadata
    prompt = "日本語で回答してください。以下の製品画像を分析して、簡潔で魅力的な製品タイトルを作成してください。"
    
    # Add metadata context if available
    brand = metadata.get('brand', '')
    model = metadata.get('model_number', '')
    product_type = metadata.get('product_type', '')
    
    if brand:
        prompt += f"ブランド: {brand}。"
    if model:
        prompt += f"モデル番号: {model}。"
    if product_type:
        prompt += f"製品タイプ: {product_type}。"
        
    prompt += "\n\n各画像から以下の詳細を抽出してください：ブランド、色、製品名、素材、および画像に表示されているその他の関連情報。"
    prompt += "\n\n回答は以下のフィールドを持つJSONオブジェクトとしてフォーマットしてください：title（魅力的な製品タイトル）、brand（ブランド）、color（色）、product_type（製品タイプ）、material（素材）、key_features（主な特徴として配列）。"
    prompt += "\n\nJSONフォーマットのみで回答し、マークダウンやコードブロック（```）は使用しないでください。"
    
    # Add image references to prompt
    for i, img in enumerate(images_base64):
        prompt += f"\n\n[画像 {i+1}]"
    
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
                    {"type": "text", "text": prompt}
                ]
            }
        ]
    }
    
    # Add images to the content
    for img in images_base64:
        payload["messages"][0]["content"].append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{img}"
            }
        })
    
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
        return {
            "raw_response": parsed_analysis,
            "status": "success"
        }
    except json.JSONDecodeError:
        # If not JSON, return the raw text but notify of the parse error
        return {
            "raw_response": cleaned_analysis,
            "status": "success",
            "parse_error": "Failed to parse response as JSON"
        } 