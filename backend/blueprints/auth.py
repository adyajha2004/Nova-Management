from flask import Blueprint, jsonify, request, abort

auth_bp = Blueprint('auth', __name__)

def check_admin():
    role = request.headers.get('X-User-Role', 'Viewer')
    if role != 'Admin':
        abort(403, description="Admin privileges required for this action.")

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
        
    # Standard mock user checks
    if username == 'admin' and password == 'admin123':
        return jsonify({
            'success': True,
            'username': 'Admin User',
            'role': 'Admin',
            'token': 'mock-auth-token-admin'
        })
    elif username == 'viewer' and password == 'viewer123':
        return jsonify({
            'success': True,
            'username': 'Viewer User',
            'role': 'Viewer',
            'token': 'mock-auth-token-viewer'
        })
    else:
        return jsonify({'error': 'Invalid username or password. Use admin/admin123 or viewer/viewer123.'}), 401

@auth_bp.route('/api/auth/profile', methods=['GET'])
def get_profile():
    role = request.headers.get('X-User-Role', 'Viewer')
    return jsonify({
        'role': role,
        'username': 'Admin User' if role == 'Admin' else 'Viewer User',
        'permissions': {
            'can_edit': role == 'Admin',
            'can_view': True
        }
    })

@auth_bp.route('/api/admin/db/seed', methods=['POST'])
def admin_seed_db():
    check_admin()
    from seed import seed_database
    try:
        from models import db
        db.drop_all()
        db.create_all()
        seed_database()
        return jsonify({'success': True, 'message': 'Database re-seeded successfully with demo data.'})
    except Exception as e:
        return jsonify({'error': f'Failed to seed database: {str(e)}'}), 500

@auth_bp.route('/api/admin/db/clear', methods=['POST'])
def admin_clear_db():
    check_admin()
    from seed import seed_clean_database
    try:
        from models import db
        db.drop_all()
        db.create_all()
        seed_clean_database()
        return jsonify({'success': True, 'message': 'Database cleared to clean slate successfully.'})
    except Exception as e:
        return jsonify({'error': f'Failed to clear database: {str(e)}'}), 500

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
            'panno': c.panno
        } for c in companies
    ])

@auth_bp.route('/api/companies/<comp_id>', methods=['PUT'])
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
        'panno': company.panno
    })
