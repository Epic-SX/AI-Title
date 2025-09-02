from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow all origins
    CORS(app, resources={r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "expose_headers": ["Content-Type", "Access-Control-Allow-Origin"],
        "supports_credentials": True
    }})
    
    # Load configuration
    app.config.from_mapping(
        SECRET_KEY='dev',
        MAX_CONTENT_LENGTH=500 * 1024 * 1024,  # Increase limit to 500MB
        MAX_FILES=2000,  # Maximum number of files
    )
    
    # Register blueprints
    from app.routes import image_routes
    from app.routes import excel_routes
    
    app.register_blueprint(image_routes.bp)
    app.register_blueprint(excel_routes.excel_bp)
    
    @app.after_request
    def add_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response
    
    return app 