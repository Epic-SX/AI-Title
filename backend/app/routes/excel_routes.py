"""
Excel routes for managing product data in the PL出品マクロ.xlsm file.
"""

from flask import Blueprint, request, jsonify
from app.services.excel_data_service import ExcelDataService
import os

excel_bp = Blueprint('excel', __name__)

# Initialize the Excel service
excel_service = ExcelDataService()

@excel_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for the backend server.
    """
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'Excel Data Service',
            'timestamp': __import__('datetime').datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@excel_bp.route('/excel/add-product', methods=['POST'])
def add_product_to_excel():
    """
    Add a single product to the appropriate sheet in the Excel file.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Add the data to Excel
        success, message = excel_service.add_data_to_excel(data)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Unexpected error: {str(e)}'
        }), 500

@excel_bp.route('/excel/add-products-bulk', methods=['POST'])
def add_products_bulk():
    """
    Add multiple products to the Excel file.
    """
    try:
        data = request.get_json()
        
        if not data or 'products' not in data:
            return jsonify({
                'success': False,
                'message': 'No products data provided'
            }), 400
        
        products = data['products']
        if not isinstance(products, list):
            return jsonify({
                'success': False,
                'message': 'Products must be a list'
            }), 400
        
        # Process bulk data
        success_count, failure_count, error_messages = excel_service.bulk_add_data(products)
        
        return jsonify({
            'success': True,
            'summary': {
                'total_processed': len(products),
                'successful': success_count,
                'failed': failure_count
            },
            'errors': error_messages if error_messages else None
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Unexpected error: {str(e)}'
        }), 500

@excel_bp.route('/excel/classify-product', methods=['POST'])
def classify_product():
    """
    Classify a product to determine which sheet it should go to.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        title = data.get('タイトル') or data.get('title', '')
        if not title:
            return jsonify({
                'success': False,
                'message': 'Title is required for classification'
            }), 400
        
        # Classify the product
        category = excel_service.classify_product_category(title, data)
        
        return jsonify({
            'success': True,
            'category': category,
            'title': title
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error classifying product: {str(e)}'
        }), 500

@excel_bp.route('/excel/sheet-info', methods=['GET'])
def get_sheet_info():
    """
    Get information about all sheets in the Excel file.
    """
    try:
        sheet_info = excel_service.get_sheet_info()
        
        return jsonify({
            'success': True,
            'sheets': sheet_info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error getting sheet info: {str(e)}'
        }), 500

@excel_bp.route('/excel/test-sample', methods=['POST'])
def test_sample_data():
    """
    Test the Excel functionality with sample data.
    """
    try:
        # Sample data similar to the user's example
        sample_data = {
            "カテゴリ": "2084005208",
            "管理番号": "1212260021698",
            "タイトル": "◇ PIVOT DOOR ピボットドアー 胸ロゴ、裾袖絞りあり 長袖 フリース 表記なし グリーン レディースメンズ E 1212260021698",
            "文字数": 57,
            "付属品": "無",
            "ランク": "3",
            "コメント": "目立った傷や汚れなし",
            "素材": "画像参照",
            "色": "グリーン",
            "サイズ": "表記なし",
            "着丈": 66,
            "　肩幅": 58,
            "身幅": 58,
            "袖丈": 58,
            "梱包サイズ": "通常",
            "梱包記号": "◇",
            "美品": "",
            "ブランド": "PIVOT DOOR ピボットドアー",
            "フリー": "胸ロゴ、裾袖絞りあり",
            "袖": "長袖",
            "もの": "フリース",
            "男女": "レディースメンズ",
            "採寸1": "着丈：約66cm　肩幅：約58cm　身幅：約58cm　袖丈：約58cm",
            "ラック": "ベースW/26",
            "金額": 2000
        }
        
        # Add the sample data
        success, message = excel_service.add_data_to_excel(sample_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'sample_data': sample_data
            })
        else:
            return jsonify({
                'success': False,
                'message': message,
                'sample_data': sample_data
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error testing sample data: {str(e)}'
        }), 500

@excel_bp.route('/excel/mapping-preview', methods=['POST'])
def get_mapping_preview():
    """
    Preview how data would be mapped to a specific sheet without adding it.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Get sheet name from request or classify
        sheet_name = data.get('sheet_name')
        if not sheet_name:
            title = data.get('タイトル') or data.get('title', '')
            if title:
                sheet_name = excel_service.classify_product_category(title, data)
            else:
                return jsonify({
                    'success': False,
                    'message': 'Sheet name or title required for mapping preview'
                }), 400
        
        # Get mapped data
        mapped_data = excel_service.map_data_to_sheet_headers(data, sheet_name)
        
        # Generate measurement text
        measurement_text = excel_service.generate_measurement_text(data, sheet_name)
        
        return jsonify({
            'success': True,
            'sheet_name': sheet_name,
            'mapped_data': mapped_data,
            'measurement_text': measurement_text,
            'original_data': data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating mapping preview: {str(e)}'
        }), 500

@excel_bp.route('/excel/save-file', methods=['POST'])
def save_excel_file():
    """
    Save the current Excel file to a specified location.
    """
    try:
        data = request.get_json()
        target_path = data.get('target_path')
        
        if not target_path:
            return jsonify({
                'success': False,
                'message': 'Target path is required'
            }), 400
        
        # Copy the current Excel file to the target location
        import shutil
        try:
            shutil.copy2(excel_service.excel_file_path, target_path)
            return jsonify({
                'success': True,
                'message': f'Excel file saved successfully to {target_path}',
                'target_path': target_path
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to save Excel file: {str(e)}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Unexpected error: {str(e)}'
        }), 500

@excel_bp.route('/excel/export-to-excel', methods=['POST'])
def export_to_excel():
    """
    Export processed results to Excel file with proper sheet classification.
    """
    try:
        print("🚀 Export to Excel endpoint called")
        data = request.get_json()
        print(f"📊 Received data keys: {list(data.keys()) if data else 'None'}")
        
        if not data or 'processed_results' not in data:
            print("❌ No processed results provided in request")
            return jsonify({
                'success': False,
                'message': 'No processed results provided'
            }), 400
        
        processed_results = data['processed_results']
        print(f"📊 Processed results type: {type(processed_results)}")
        print(f"📊 Processed results count: {len(processed_results) if processed_results else 0}")
        
        if not isinstance(processed_results, dict):
            print(f"❌ Expected dict, got {type(processed_results)}")
            return jsonify({
                'success': False,
                'message': 'Processed results must be a dictionary'
            }), 400
        
        # Convert processed results to Excel format
        products_to_add = []
        success_count = 0
        error_count = 0
        errors = []
        
        for product_id, result in processed_results.items():
            try:
                # Extract the data from the result structure
                if isinstance(result, dict) and 'listing_data' in result:
                    listing_data = result['listing_data']
                else:
                    # Fallback to using result directly
                    listing_data = result
                
                # Convert the listing data to the format expected by the Excel service
                excel_data = {
                    "カテゴリ": listing_data.get('カテゴリ', ''),
                    "管理番号": listing_data.get('管理番号', product_id),
                    "タイトル": listing_data.get('タイトル', ''),
                    "文字数": len(listing_data.get('タイトル', '')),
                    "付属品": listing_data.get('付属品', ''),
                    "ランク": listing_data.get('ランク', ''),
                    "コメント": listing_data.get('コメント', ''),
                    "素材": listing_data.get('素材', ''),
                    "色": listing_data.get('色', ''),
                    "サイズ": listing_data.get('サイズ', ''),
                    "着丈": listing_data.get('着丈') or None,
                    "　肩幅": listing_data.get('肩幅') or listing_data.get('　肩幅') or None,
                    "身幅": listing_data.get('身幅') or None,
                    "袖丈": listing_data.get('袖丈') or None,
                    "梱包サイズ": listing_data.get('梱包サイズ', ''),
                    "梱包記号": listing_data.get('梱包記号', ''),
                    "美品": listing_data.get('美品', ''),
                    "ブランド": listing_data.get('ブランド', ''),
                    "フリー": listing_data.get('フリー', ''),
                    "袖": listing_data.get('袖', ''),
                    "もの": listing_data.get('もの', ''),
                    "男女": listing_data.get('男女', ''),
                    "採寸1": listing_data.get('採寸1', ''),
                    "ラック": listing_data.get('ラック', ''),
                    "金額": listing_data.get('金額') or listing_data.get('売値') or None,
                    # Additional fields that might be present
                    "股上": listing_data.get('股上') or None,
                    "股下": listing_data.get('股下') or None,
                    "ウエスト": listing_data.get('ウエスト') or None,
                    "もも幅": listing_data.get('もも幅') or None,
                    "裾幅": listing_data.get('裾幅') or None,
                    "総丈": listing_data.get('総丈') or None,
                    "ヒップ": listing_data.get('ヒップ') or None,
                    "仕入先": listing_data.get('仕入先', ''),
                    "仕入日": listing_data.get('仕入日', ''),
                    "原価": listing_data.get('原価') or None
                }
                
                products_to_add.append(excel_data)
                
            except Exception as e:
                error_count += 1
                errors.append(f"Product {product_id}: {str(e)}")
                continue
        
        if not products_to_add:
            return jsonify({
                'success': False,
                'message': 'No valid products to add to Excel',
                'errors': errors
            }), 400
        
        # Use bulk add functionality
        added_count, failed_count, add_errors = excel_service.bulk_add_data(products_to_add)
        
        return jsonify({
            'success': True,
            'summary': {
                'total_processed': len(processed_results),
                'products_converted': len(products_to_add),
                'successfully_added': added_count,
                'failed_to_add': failed_count,
                'conversion_errors': error_count
            },
            'errors': errors + add_errors if errors or add_errors else None,
            'message': f'Successfully added {added_count} products to Excel'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Unexpected error: {str(e)}'
        }), 500

@excel_bp.route('/excel/file-info', methods=['GET'])
def get_excel_file_info():
    """
    Get information about the current Excel file.
    """
    try:
        file_path = excel_service.excel_file_path
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': f'Excel file not found: {file_path}'
            }), 404
        
        # Get file stats
        file_stats = os.stat(file_path)
        import datetime
        
        return jsonify({
            'success': True,
            'file_info': {
                'path': file_path,
                'size': file_stats.st_size,
                'modified': datetime.datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
                'exists': True
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error getting file info: {str(e)}'
        }), 500 