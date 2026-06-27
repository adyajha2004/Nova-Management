from flask import Blueprint, request, make_response, jsonify
from models import db, Item_Master, POMAIN, Audit_Log
from datetime import datetime
import csv
from io import StringIO

exports_bp = Blueprint('exports', __name__)

def parse_date_filters():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    start_date = None
    end_date = None
    
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass
            
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass
            
    return start_date, end_date

@exports_bp.route('/api/exports/inventory/csv', methods=['GET'])
def export_inventory_csv():
    # Return all inventory items mixed
    items = Item_Master.query.all()
    
    si = StringIO()
    writer = csv.writer(si)
    
    # Headers
    writer.writerow([
        'Company ID', 'Item Code', 'Item Name', 'Item Group', 'Balance Qty', 'Units', 
        'GST %', 'Min Qty', 'Reorder Qty', 'Last Purchase Rate', 
        'Last Receipt Date', 'Lead Time (Days)'
    ])
    
    # Rows
    for item in items:
        writer.writerow([
            item.comp_id,
            item.item_code,
            item.item_name,
            item.itg_code,
            float(item.bal_qt) if item.bal_qt is not None else 0.0,
            item.units,
            float(item.gst_pr) if item.gst_pr is not None else 0.0,
            float(item.min_qt) if item.min_qt is not None else 0.0,
            float(item.ror_qt) if item.ror_qt is not None else 0.0,
            float(item.last_rate) if item.last_rate is not None else 0.0,
            item.lrec_date.isoformat() if item.lrec_date else 'N/A',
            item.lead_time
        ])
        
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=nova_mixed_inventory.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@exports_bp.route('/api/exports/pos/csv', methods=['GET'])
def export_pos_csv():
    start_date, end_date = parse_date_filters()
    
    query = POMAIN.query
    
    if start_date:
        query = query.filter(POMAIN.po_date >= start_date)
    if end_date:
        query = query.filter(POMAIN.po_date <= end_date)
        
    pos = query.order_by(POMAIN.po_date.desc()).all()
    
    si = StringIO()
    writer = csv.writer(si)
    
    # Headers
    writer.writerow([
        'Company ID', 'PO Number', 'PO Date', 'Vendor Code', 'Vendor Name', 
        'Total PO Amount', 'PO Status', 'Payment Status', 
        'Item Code', 'Item Name', 'Quantity', 'Rate', 'Amount'
    ])
    
    for po in pos:
        for po_item in po.items:
            writer.writerow([
                po.comp_id,
                po.po_no,
                po.po_date.isoformat() if po.po_date else '',
                po.party_code,
                po.party.party_name if po.party else 'Unknown',
                float(po.total_po_amount) if po.total_po_amount is not None else 0.0,
                po.status,
                po.payment_status,
                po_item.item_code,
                po_item.item.item_name if po_item.item else 'Unknown',
                float(po_item.order_qty) if po_item.order_qty is not None else 0.0,
                float(po_item.rate) if po_item.rate is not None else 0.0,
                float(po_item.amount) if po_item.amount is not None else 0.0
            ])
            
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=nova_mixed_purchase_orders.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@exports_bp.route('/api/exports/audit/csv', methods=['GET'])
def export_audit_csv():
    start_date, end_date = parse_date_filters()
    
    query = Audit_Log.query
    
    if start_date:
        query = query.filter(Audit_Log.timestamp >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Audit_Log.timestamp <= datetime.combine(end_date, datetime.max.time()))
        
    logs = query.order_by(Audit_Log.timestamp.desc()).all()
    
    si = StringIO()
    writer = csv.writer(si)
    
    # Headers
    writer.writerow(['ID', 'Timestamp', 'Target Table', 'Modified Field', 'Old Value Snapshot', 'New Value Snapshot'])
    
    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat() if log.timestamp else '',
            log.target_table,
            log.modified_field,
            log.old_value_snapshot or '',
            log.new_value_snapshot or ''
        ])
        
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=nova_system_audit_logs.csv"
    output.headers["Content-type"] = "text/csv"
    return output
