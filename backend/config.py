import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise RuntimeError(
            "FATAL: SECRET_KEY environment variable is not set. "
            "Refusing to start with an insecure default."
        )
    
    # JWT config
    JWT_SECRET_KEY = SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours, in seconds
    
    # Database config
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DEFAULT_DB_PATH = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'nova_mrp.db').replace('\\', '/')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', DEFAULT_DB_PATH)
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    CORS_HEADERS = 'Content-Type'
