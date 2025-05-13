from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Configure CORS more explicitly to handle preflight requests
    CORS(app, resources={r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "expose_headers": ["Content-Type", "Access-Control-Allow-Origin"],
        "supports_credentials": True
    }})
    
    # Load configuration
    app.config.from_mapping(
        SECRET_KEY='dev',
        MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # Limit upload size to 16MB
    )
    
    # Register blueprints
    from app.routes import image_routes
    app.register_blueprint(image_routes.bp)
    
    @app.after_request
    def add_headers(response):
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response
    
    return app 