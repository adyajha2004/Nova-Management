import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nova-company-mrp-secret-key-12345')
    
    # Database config
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DEFAULT_DB_PATH = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'nova_mrp.db').replace('\\', '/')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', DEFAULT_DB_PATH)
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    CORS_HEADERS = 'Content-Type'
