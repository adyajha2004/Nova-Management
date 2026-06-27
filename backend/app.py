from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from models import db
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for decoupled React application
    allowed_origins = app.config.get('CORS_ORIGINS', '*')
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)
    
    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        # Self-healing migration for SQLite local databases
        if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:'):
            try:
                from sqlalchemy import inspect, text
                inspector = inspect(db.engine)
                if 'audit_log' in inspector.get_table_names():
                    columns = [col['name'] for col in inspector.get_columns('audit_log')]
                    if 'actor' not in columns:
                        db.session.execute(text("ALTER TABLE audit_log ADD COLUMN actor VARCHAR(50)"))
                        db.session.commit()
            except Exception as e:
                pass
    
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
        
    # Global error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': str(e.description)}), 400

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': str(e.description)}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found.'}), 404

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({'error': str(e.description)}), 422

    @app.errorhandler(Exception)
    def handle_exception(e):
        db.session.rollback()
        app.logger.exception('Unhandled exception')
        return jsonify({'error': 'Internal server error.'}), 500

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        if exception:
            db.session.rollback()
        db.session.remove()
        
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Prevent automatic reloader loops by defaulting debug to False
    # and reading from FLASK_DEBUG env var if needed.
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
