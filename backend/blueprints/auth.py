from flask import Blueprint, jsonify, request, abort, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from werkzeug.security import check_password_hash, generate_password_hash

auth_bp = Blueprint('auth', __name__)

# ── User store ──────────────────────────────────────────────
# Replace with a DB table when you need user management.
USERS = {
    'admin': {
        'password': generate_password_hash('admin123'),
        'display_name': 'Admin User',
        'role': 'Admin',
    },
    'viewer': {
        'password': generate_password_hash('viewer123'),
        'display_name': 'Viewer User',
        'role': 'Viewer',
    },
}

# ── Role gate (replaces the old header-based check) ─────────
def check_admin():
    """Abort 403 unless the current JWT carries role=Admin."""
    claims = get_jwt()
    if claims.get('role') != 'Admin':
        abort(403, description="Admin privileges required for this action.")

# ── Login ───────────────────────────────────────────────────
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    user = USERS.get(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid username or password.'}), 401

    token = create_access_token(
        identity=username,
        additional_claims={'role': user['role']},
    )
    return jsonify({
        'success': True,
        'username': user['display_name'],
        'role': user['role'],
        'token': token,
    })

# ── Profile ─────────────────────────────────────────────────
@auth_bp.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    claims = get_jwt()
    role = claims.get('role', 'Viewer')
    return jsonify({
        'role': role,
        'username': 'Admin User' if role == 'Admin' else 'Viewer User',
        'permissions': {
            'can_edit': role == 'Admin',
            'can_view': True,
        },
    })

# ── Companies (read = public, write = admin) ────────────────
@auth_bp.route('/api/companies', methods=['GET'])
def get_companies():
    from models import Company
    companies = Company.query.all()
    return jsonify([
        {
            'comp_id': c.comp_id,
            'comp_name': c.comp_name,
            'address': c.address,
            'email': c.email,
            'phone': c.phone,
            'license_no': c.license_no,
            'gstno': c.gstno,
            'panno': c.panno,
        } for c in companies
    ])

@auth_bp.route('/api/companies/<comp_id>', methods=['PUT'])
@jwt_required()
def update_company(comp_id):
    check_admin()
    from models import Company, db
    company = Company.query.get(comp_id)
    if not company:
        return jsonify({'error': f"Company {comp_id} not found."}), 404

    data = request.json or {}
    company.comp_name = data.get('comp_name', company.comp_name)
    company.address = data.get('address', company.address)
    company.email = data.get('email', company.email)
    company.phone = data.get('phone', company.phone)
    company.license_no = data.get('license_no', company.license_no)
    company.gstno = data.get('gstno', company.gstno)
    company.panno = data.get('panno', company.panno)

    db.session.commit()

    return jsonify({
        'comp_id': company.comp_id,
        'comp_name': company.comp_name,
        'address': company.address,
        'email': company.email,
        'phone': company.phone,
        'license_no': company.license_no,
        'gstno': company.gstno,
        'panno': company.panno,
    })
