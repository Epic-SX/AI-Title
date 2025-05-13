import os
import uuid
import base64
import json
import traceback
from flask import (
    Blueprint, request, jsonify, current_app
)
from werkzeug.utils import secure_filename
from app.services.perplexity_service import analyze_images

bp = Blueprint('images', __name__, url_prefix='/api')

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/images/analyze', methods=['POST'])
def upload_and_analyze():
    """
    Upload and analyze images to extract product information using Perplexity AI.
    """
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400
    
    files = request.files.getlist('images')
    
    if not files or files[0].filename == '':
        return jsonify({"error": "No images provided"}), 400
    
    # Check if all files are allowed
    for file in files:
        if not allowed_file(file.filename):
            return jsonify({"error": f"File {file.filename} has an invalid extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    # Save all files
    image_paths = []
    for file in files:
        unique_filename = str(uuid.uuid4()) + secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        image_paths.append(file_path)
    
    try:
        # Analyze images using Perplexity AI
        analysis_result = analyze_images(image_paths)
        
        # Clean up uploaded files after analysis
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)
        
        return jsonify(analysis_result)
    
    except Exception as e:
        # Clean up uploaded files if there was an error
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)
        
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@bp.route('/generate-title', methods=['POST', 'OPTIONS'])
def generate_title():
    """
    Generate title based on uploaded images from JSON data.
    """
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return '', 200
    
    # Get JSON data
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Check if product_images field exists and has content
    if 'product_images' not in data or not data['product_images']:
        return jsonify({"error": "No images provided in product_images field"}), 400
    
    # Extract base64 images
    base64_images = data['product_images']
    
    # Save images to temporary files
    image_paths = []
    for i, img_data in enumerate(base64_images):
        # Skip any empty strings
        if not img_data:
            continue
            
        # Remove data URL prefix if present
        if ',' in img_data:
            img_data = img_data.split(',', 1)[1]
            
        try:
            # Decode base64 image
            img_binary = base64.b64decode(img_data)
            
            # Save to file
            unique_filename = f"{uuid.uuid4()}.jpg"
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            with open(file_path, 'wb') as f:
                f.write(img_binary)
                
            image_paths.append(file_path)
        except Exception as e:
            return jsonify({"error": f"画像処理エラー: {str(e)}"}), 400
    
    if not image_paths:
        return jsonify({"error": "有効な画像が提供されていません"}), 400
        
    try:
        # Extract metadata for context
        metadata = {
            'brand': data.get('brand', ''),
            'model_number': data.get('model_number', ''),
            'product_type': data.get('product_type', ''),
            'color': data.get('color', ''),
            'has_scale': data.get('has_scale', False)
        }
        
        # Analyze images using Perplexity AI with metadata
        analysis_result = analyze_images(image_paths, metadata)
        
        # Clean up uploaded files after analysis
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)
        
        return jsonify(analysis_result)
    
    except Exception as e:
        # Clean up uploaded files if there was an error
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)
                
        error_msg = f"タイトル生成中にエラーが発生しました: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        
        return jsonify({
            "error": error_msg,
            "status": "error",
            "traceback": traceback.format_exc()
        }), 500 