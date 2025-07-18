import os
import uuid
import base64
import json
import traceback
import re
import time
import tempfile
import shutil
from flask import (
    Blueprint, request, jsonify, current_app
)
from werkzeug.utils import secure_filename
from app.services.perplexity_service import (
    analyze_images, 
    analyze_single_image,
    process_batch_with_review_filter
)
from app.utils.file_utils import scan_directory_for_product_images, group_images_by_product_id

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
            'has_scale': data.get('has_scale', False),
            'product_id': data.get('product_id', '')  # Include product ID from frontend
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

@bp.route('/batch-process', methods=['POST', 'OPTIONS'])
def batch_process():
    """
    Process a batch of up to 2000 products identified by their product IDs in image filenames.
    Images with the same base ID (e.g., 1503050030649, 1503050030649_1, 1503050030649_2) 
    will be processed together as one product.
    """
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return '', 200
    
    start_time = time.time()
    print(f"[BATCH] Starting batch processing at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get JSON data
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Check if directory_path is provided (new method)
    directory_path = data.get('directory_path')
    image_paths = data.get('image_paths', [])
    
    if directory_path:
        try:
            print(f"[BATCH] Scanning directory: {directory_path}")
            # Scan directory for images
            image_paths = scan_directory_for_product_images(directory_path)
            print(f"[BATCH] Found {len(image_paths)} images in directory: {directory_path}")
        except Exception as e:
            print(f"[BATCH] Directory scanning error: {str(e)}")
            return jsonify({"error": f"Directory scanning error: {str(e)}"}), 400
    
    # Ensure we have images to process
    if not image_paths:
        return jsonify({"error": "No image paths provided or found in directory"}), 400
    
    # Group images by product ID
    print(f"[BATCH] Grouping {len(image_paths)} images by product ID")
    product_groups = group_images_by_product_id(image_paths)
    print(f"[BATCH] Found {len(product_groups)} unique products")
    
    # Limit to 2000 products maximum
    MAX_PRODUCTS = 2000
    if len(product_groups) > MAX_PRODUCTS:
        print(f"[BATCH] Limiting processing to first {MAX_PRODUCTS} products")
        # Take only the first 2000 products
        limited_groups = dict(list(product_groups.items())[:MAX_PRODUCTS])
        product_groups = limited_groups
    
    # Start processing products
    results = []
    processed_count = 0
    error_count = 0
    
    print(f"[BATCH] Starting to process {len(product_groups)} products")
    
    for product_id, product_image_paths in product_groups.items():
        try:
            processed_count += 1
            print(f"[BATCH] Processing product {processed_count}/{len(product_groups)}: {product_id} ({len(product_image_paths)} images)")
            
            # Create metadata for this product
            metadata = {
                'product_id': product_id,
                'image_count': len(product_image_paths),
                'batch_index': processed_count
            }
            
            # Analyze all images for this product together
            analysis_result = analyze_images(product_image_paths, metadata)
            
            # Extract the main result
            if 'raw_response' in analysis_result:
                main_result = analysis_result['raw_response']
                
                # Ensure the product ID is in the title
                if isinstance(main_result, dict) and 'title' in main_result:
                    title = main_result['title']
                    if not title.startswith(product_id):
                        main_result['title'] = f"{product_id} {title}"
                
                results.append({
                    'product_id': product_id,
                    'image_count': len(product_image_paths),
                    'image_paths': product_image_paths,
                    'result': main_result,
                    'status': 'success',
                    'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
                })
            else:
                results.append({
                    'product_id': product_id,
                    'image_count': len(product_image_paths),
                    'image_paths': product_image_paths,
                    'result': {'title': f"{product_id} 解析エラー", 'error': 'No analysis result'},
                    'status': 'error',
                    'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
                })
                error_count += 1
                
        except Exception as e:
            error_count += 1
            print(f"[BATCH] Error processing product {product_id}: {str(e)}")
            results.append({
                'product_id': product_id,
                'image_count': len(product_image_paths),
                'image_paths': product_image_paths,
                'result': {'title': f"{product_id} 処理エラー", 'error': str(e)},
                'status': 'error',
                'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
            })
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # Create completion summary
    summary = {
        'total_products': len(product_groups),
        'processed_successfully': processed_count - error_count,
        'errors': error_count,
        'total_images': len(image_paths),
        'processing_time_seconds': round(total_time, 2),
        'average_time_per_product': round(total_time / len(product_groups), 2) if len(product_groups) > 0 else 0,
        'started_at': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time)),
        'completed_at': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)),
        'status': 'completed'
    }
    
    print(f"[BATCH] Batch processing completed!")
    print(f"[BATCH] Summary: {processed_count - error_count}/{processed_count} products processed successfully")
    print(f"[BATCH] Total time: {total_time:.2f} seconds")
    
    return jsonify({
        'status': 'completed',
        'summary': summary,
        'results': results
    })

@bp.route('/batch-process-files', methods=['POST', 'OPTIONS'])
def batch_process_files():
    """
    Process a batch of uploaded files, grouping them by product ID extracted from filenames.
    """
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return '', 200
    
    start_time = time.time()
    print(f"[BATCH-FILES] Starting batch file processing at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if files were uploaded
    if 'files' not in request.files:
        return jsonify({"error": "No files uploaded"}), 400
    
    files = request.files.getlist('files')
    
    if not files or len(files) == 0:
        return jsonify({"error": "No files provided"}), 400
    
    print(f"[BATCH-FILES] Received {len(files)} files")
    
    # Check file count limit
    MAX_FILES = 2000
    if len(files) > MAX_FILES:
        return jsonify({"error": f"Too many files. Maximum allowed: {MAX_FILES}"}), 400
    
    # Check total size limit (500MB)
    MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500MB
    total_size = sum(file.content_length or 0 for file in files if file.content_length)
    
    if total_size > MAX_TOTAL_SIZE:
        return jsonify({"error": f"Total file size too large. Maximum allowed: {MAX_TOTAL_SIZE / (1024*1024):.0f}MB"}), 400
    
    print(f"[BATCH-FILES] Total file size: {total_size / (1024*1024):.2f}MB")
    
    # Check if all files are allowed
    for file in files:
        if not allowed_file(file.filename):
            print(f"[BATCH-FILES] Invalid file extension: {file.filename}")
            return jsonify({"error": f"File {file.filename} has an invalid extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    # Save all files to temporary location with better error handling
    image_paths = []
    try:
        for file in files:
            unique_filename = str(uuid.uuid4()) + secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            try:
                file.save(file_path)
                image_paths.append(file_path)
                print(f"[BATCH-FILES] Saved file: {file.filename} as {unique_filename}")
            except Exception as e:
                print(f"[BATCH-FILES] Error saving file {file.filename}: {str(e)}")
                # Continue with other files
        
        print(f"[BATCH-FILES] Successfully saved {len(image_paths)} of {len(files)} files")
        
        if len(image_paths) == 0:
            return jsonify({"error": "Could not save any of the uploaded files"}), 500
    
    except Exception as e:
        print(f"[BATCH-FILES] Error during file saving: {str(e)}")
        return jsonify({"error": f"Error saving files: {str(e)}"}), 500
    
    # Extract metadata if provided
    metadata_json = request.form.get('metadata', '{}')
    try:
        metadata = json.loads(metadata_json)
        print(f"[BATCH-FILES] Metadata: {metadata}")
    except Exception as e:
        metadata = {}
        print(f"[BATCH-FILES] Error parsing metadata: {str(e)}")
    
    # Group images by product ID extracted from filenames
    print(f"[BATCH-FILES] Grouping {len(image_paths)} images by product ID")
    try:
        product_groups = group_images_by_product_id(image_paths)
        print(f"[BATCH-FILES] Found {len(product_groups)} unique products")
    except Exception as e:
        print(f"[BATCH-FILES] Error grouping images: {str(e)}")
        # Clean up uploaded files
        for path in image_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
        return jsonify({"error": f"Error grouping images: {str(e)}"}), 500
    
    # Start processing products
    results = {}
    processed_count = 0
    total_products = len(product_groups)
    
    # Limit to 2000 products
    product_groups_list = list(product_groups.items())[:2000]
    print(f"[BATCH-FILES] Processing {len(product_groups_list)} products (limit: 2000)")
    
    # Process the products
    for product_id, product_images in product_groups_list:
        process_start = time.time()
        print(f"[BATCH-FILES] Processing product {processed_count+1}/{len(product_groups_list)}: {product_id} with {len(product_images)} images")
        
        try:
            # Add product ID to metadata - this is crucial for title generation
            product_metadata = metadata.copy()
            product_metadata['product_id'] = product_id
            
            # Analyze images for this product
            analysis_result = analyze_images(product_images, product_metadata)
            
            # Store the result with the product ID
            results[product_id] = {
                "status": "success",
                "result": analysis_result,
                "image_count": len(product_images),
                "processing_time": round(time.time() - process_start, 2)
            }
            print(f"[BATCH-FILES] Successfully processed product {product_id} in {round(time.time() - process_start, 2)}s")
            
        except Exception as e:
            error_msg = f"Product {product_id} processing error: {str(e)}"
            print(f"[BATCH-FILES] {error_msg}")
            print(traceback.format_exc())
            
            results[product_id] = {
                "status": "error",
                "error": error_msg,
                "traceback": traceback.format_exc(),
                "processing_time": round(time.time() - process_start, 2)
            }
        
        processed_count += 1
    
    # Clean up uploaded files after processing
    for path in image_paths:
        if os.path.exists(path):
            try:
                os.remove(path)
                print(f"[BATCH-FILES] Removed temporary file: {path}")
            except Exception as e:
                print(f"[BATCH-FILES] Error removing file {path}: {str(e)}")
    
    total_time = round(time.time() - start_time, 2)
    print(f"[BATCH-FILES] Completed batch file processing in {total_time}s. Processed {processed_count}/{total_products} products.")
    
    return jsonify({
        "status": "success",
        "processed_count": processed_count,
        "total_products": total_products,
        "total_time_seconds": total_time,
        "results": results
    }) 

@bp.route('/analyze-batch-with-review', methods=['POST'])
def analyze_batch_with_review():
    """Analyze multiple images and filter for manual review"""
    try:
        # Check if files are present
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files selected'}), 400
        
        # Create temporary directory for uploaded files
        temp_dir = tempfile.mkdtemp()
        image_paths = []
        metadata_list = []
        
        try:
            for i, file in enumerate(files):
                if file.filename == '':
                    continue
                    
                # Save uploaded file
                filename = secure_filename(file.filename)
                filepath = os.path.join(temp_dir, filename)
                file.save(filepath)
                image_paths.append(filepath)
                
                # Extract product ID from filename
                product_id = extract_product_id_from_filename(filename)
                metadata_list.append({'product_id': product_id})
            
            if not image_paths:
                return jsonify({'error': 'No valid images found'}), 400
            
            # Process with review filtering
            result = process_batch_with_review_filter(image_paths, metadata_list)
            
            return jsonify({
                'success': True,
                'total_processed': result['total_processed'],
                'auto_approved_count': result['auto_approved_count'],
                'needs_review_count': result['review_summary']['total_for_review'],
                'auto_approved_products': result['auto_approved'],
                'manual_review_summary': result['review_summary'],
                'message': f"処理完了: {result['auto_approved_count']}個自動承認, {result['review_summary']['total_for_review']}個要確認"
            })
            
        finally:
            # Clean up temporary files
            shutil.rmtree(temp_dir, ignore_errors=True)
            
    except Exception as e:
        print(f"Error in batch analysis with review: {str(e)}")
        return jsonify({
            'error': f'Analysis failed: {str(e)}'
        }), 500 