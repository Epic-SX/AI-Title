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