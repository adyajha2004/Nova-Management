from flask import Flask, jsonify
from flask_cors import CORS
from models import db
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for decoupled React application
    # Exposing headers allows client-side code to read multi-tenant metadata if needed
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    db.init_app(app)
    
    # Register Blueprints
    from blueprints.auth import auth_bp
    from blueprints.inventory import inventory_bp
    from blueprints.recipes import recipes_bp
    from blueprints.procurement import procurement_bp
    from blueprints.audit import audit_bp
    from blueprints.exports import exports_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(recipes_bp)
    app.register_blueprint(procurement_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(exports_bp)
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'Nova Company MRP Backend',
            'api_version': '1.0.0'
        })
        
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'message': 'Nova Company MRP REST API is running successfully.',
            'health_check_url': '/health',
            'frontend_instruction': 'Please start and access the React SPA interface on port 3000 by running: cd frontend && npm run dev',
            'available_api_scopes': [
                '/api/inventory/items',
                '/api/recipes',
                '/api/procurement/mprs',
                '/api/procurement/pos',
                '/api/audit/logs'
            ]
        })
        
    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        
    # Prevent automatic reloader loops by defaulting debug to False
    # and reading from FLASK_DEBUG env var if needed.
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
