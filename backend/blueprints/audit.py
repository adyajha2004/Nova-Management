from flask import Blueprint, jsonify, request
from models import db, Audit_Log
from datetime import datetime

audit_bp = Blueprint('audit', __name__)

# Helper function to create audit log records
def log_change(target_table, modified_field, old_val, new_val, actor=None):
    if actor is None:
        try:
            from flask_jwt_extended import get_jwt_identity
            actor = get_jwt_identity()
        except Exception:
            actor = 'system'
    try:
        log = Audit_Log(
            timestamp=datetime.utcnow(),
            actor=actor,
            target_table=target_table,
            modified_field=modified_field,
            old_value_snapshot=str(old_val) if old_val is not None else None,
            new_value_snapshot=str(new_val) if new_val is not None else None
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Error writing audit log: {e}")
        db.session.rollback()

@audit_bp.route('/api/audit/logs', methods=['GET'])
def get_logs():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    query = Audit_Log.query
    
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(Audit_Log.timestamp >= start_date)
        except ValueError:
            pass
            
    if end_date_str:
        try:
            # End of day filter
            end_date = datetime.strptime(f"{end_date_str} 23:59:59", '%Y-%m-%d %H:%M:%S')
            query = query.filter(Audit_Log.timestamp <= end_date)
        except ValueError:
            pass
            
    logs = query.order_by(Audit_Log.timestamp.desc()).all()
    return jsonify([log.serialize() for log in logs])
