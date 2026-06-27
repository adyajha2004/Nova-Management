from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required
from models import db, MPRMAIN, MPRTRAN, Party_Master, POMAIN, POTRAN, Item_Master, Party_Item
from blueprints.auth import check_admin
from blueprints.audit import log_change
from datetime import datetime

procurement_bp = Blueprint('procurement', __name__)

@procurement_bp.route('/api/procurement/vendors', methods=['GET'])
def get_vendors():
    vendors = Party_Master.query.all()
    return jsonify([v.serialize() for v in vendors])

@procurement_bp.route('/api/procurement/mprs', methods=['GET'])
def get_mprs():
    # Return all staged MPRs mixed (NC & ND)
    mprs = MPRMAIN.query.order_by(MPRMAIN.mpr_no.desc()).all()
    
    result = []
    for m in mprs:
        serialized = m.serialize()
        serialized['items'] = [item.serialize() for item in m.items]
        result.append(serialized)
        
    return jsonify(result)

@procurement_bp.route('/api/procurement/rfp/dispatch', methods=['POST'])
@jwt_required()
def dispatch_rfp():
    check_admin()
    data = request.json or {}
    
    mpr_no = data.get('mpr_no')
    if not mpr_no:
        return jsonify({'error': 'mpr_no is required'}), 400
        
    mpr = MPRMAIN.query.filter_by(mpr_no=mpr_no).first()
    if not mpr:
        return jsonify({'error': 'MPR not found'}), 404
        
    comp_id = mpr.comp_id  # Derived from database record
    
    vendors = Party_Master.query.all()
    email_payloads = []
    
    for item_tran in mpr.items:
        if item_tran.status != 'PENDING':
            continue
            
        item_name = item_tran.item.item_name if item_tran.item else 'Unknown Item'
        deficit = float(item_tran.deficit_qty)
        
        for v in vendors:
            email_body = f"To: {v.email} | Subject: Nova Co ({comp_id}) Quote Request - {item_name} | Message: Please provide your best transactional pricing matrix for {item_name} required in quantity {deficit}."
            email_payloads.append({
                'item_code': item_tran.item_code,
                'item_name': item_name,
                'party_code': v.party_code,
                'party_name': v.party_name,
                'party_email': v.email,
                'email_payload': email_body,
                'deficit': deficit
            })
            
    return jsonify({
        'mpr_no': mpr_no,
        'email_payloads': email_payloads
    })

@procurement_bp.route('/api/procurement/po/generate', methods=['POST'])
@jwt_required()
def generate_pos():
    check_admin()
    data = request.json or {}
    
    mpr_no = data.get('mpr_no')
    bids = data.get('bids')
    
    if not mpr_no or not bids:
        return jsonify({'error': 'mpr_no and bids are required'}), 400
        
    mpr = MPRMAIN.query.filter_by(mpr_no=mpr_no).first()
    if not mpr:
        return jsonify({'error': 'MPR not found'}), 404
        
    comp_id = mpr.comp_id  # Inherit comp_id from parent MPR record
    generated_pos = []
    
    for index, bid in enumerate(bids):
        item_code = bid.get('item_code')
        party_code = bid.get('party_code')
        qty = float(bid.get('qty', 0.0))
        rate = float(bid.get('rate', 0.0))
        
        if qty <= 0 or rate <= 0:
            continue
            
        mpr_item = MPRTRAN.query.filter_by(mpr_no=mpr_no, item_code=item_code).first()
        if not mpr_item or mpr_item.status == 'ORDERED':
            continue
            
        timestamp_str = datetime.now().strftime("%H%M%S")
        po_no = f"PO{timestamp_str}{index}"
        
        total_amount = qty * rate
        
        po_main = POMAIN(
            po_no=po_no,
            po_date=datetime.now().date(),
            party_code=party_code,
            comp_id=comp_id,  # Set correct company code matching mpr
            total_po_amount=total_amount,
            payment_status='UNPAID',
            status='ORDERED'
        )
        db.session.add(po_main)
        
        po_tran = POTRAN(
            po_no=po_no,
            item_code=item_code,
            order_qty=qty,
            rate=rate,
            amount=total_amount
        )
        db.session.add(po_tran)
        
        mpr_item.status = 'ORDERED'
        db.session.commit()
        log_change('pomain', 'CREATE_PO', None, f"Generated PO {po_no} for item {item_code} ({comp_id})")
        generated_pos.append(po_no)
        
    all_ordered = True
    for item in mpr.items:
        if item.status != 'ORDERED':
            all_ordered = False
            break
            
    if all_ordered:
        mpr.status = 'ORDERED'
        db.session.commit()
        
    return jsonify({
        'success': True,
        'generated_pos': generated_pos
    })

@procurement_bp.route('/api/procurement/pos', methods=['GET'])
def get_pos():
    # Return all POs mixed (NC & ND)
    pos = POMAIN.query.order_by(POMAIN.po_no.desc()).all()
    
    result = []
    for p in pos:
        serialized = p.serialize()
        serialized['items'] = [item.serialize() for item in p.items]
        result.append(serialized)
        
    return jsonify(result)

@procurement_bp.route('/api/procurement/pos/<po_no>/receive', methods=['PUT'])
@jwt_required()
def receive_po(po_no):
    check_admin()
    
    po = POMAIN.query.filter_by(po_no=po_no).first()
    if not po:
        return jsonify({'error': 'PO not found'}), 404
        
    if po.status == 'RECEIVED':
        return jsonify({'error': 'PO has already been received'}), 400
        
    comp_id = po.comp_id  # Read from database record
    
    for po_item in po.items:
        # Settle item balance globally
        item = Item_Master.query.filter_by(item_code=po_item.item_code).first()
        if item:
            old_bal = float(item.bal_qt)
            purchased_qty = float(po_item.order_qty)
            new_bal = old_bal + purchased_qty
            
            item.bal_qt = new_bal
            item.inw_qt = float(item.inw_qt or 0.0) + purchased_qty
            item.last_rate = po_item.rate
            item.lrec_date = datetime.now().date()
            
            log_change('item_master', f'{item.item_code}.bal_qt', old_bal, new_bal)
            
    po.status = 'RECEIVED'
    db.session.commit()
    log_change('pomain', f'{po_no}.status', 'ORDERED', 'RECEIVED')
    
    return jsonify(po.serialize())

@procurement_bp.route('/api/procurement/pos/<po_no>/payment', methods=['PUT'])
@jwt_required()
def update_payment_status(po_no):
    check_admin()
    
    po = POMAIN.query.filter_by(po_no=po_no).first()
    if not po:
        return jsonify({'error': 'PO not found'}), 404
        
    data = request.json or {}
    new_payment_status = data.get('payment_status')
    
    if new_payment_status not in ['UNPAID', 'PAID']:
        return jsonify({'error': 'Invalid payment status value'}), 400
        
    old_status = po.payment_status
    if old_status != new_payment_status:
        po.payment_status = new_payment_status
        db.session.commit()
        log_change('pomain', f'{po_no}.payment_status', old_status, new_payment_status)
        
    return jsonify(po.serialize())
    
@procurement_bp.route('/api/procurement/vendors', methods=['POST'])
@jwt_required()
def create_vendor():
    check_admin()
    data = request.json or {}
    
    party_code = data.get('party_code')
    party_name = data.get('party_name')
    
    if not party_name:
        return jsonify({'error': 'party_name is required'}), 400
        
    if not party_code or party_code.strip() == '' or party_code.upper() == '[AUTO]':
        first_letter = 'X'
        if party_name and len(party_name) > 0:
            for char in party_name:
                if char.isalpha():
                    first_letter = char.upper()
                    break
        prefix = f"CG{first_letter}"
        
        existing_codes = Party_Master.query.filter(Party_Master.party_code.like(f"{prefix}%")).all()
        max_seq = 0
        for esc in existing_codes:
            suffix = esc.party_code[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        
        next_seq = max_seq + 1
        party_code = f"{prefix}{str(next_seq).zfill(3)}"
    else:
        party_code = party_code.upper()
        
    existing = Party_Master.query.filter_by(party_code=party_code).first()
    if existing:
        return jsonify({'error': f'Vendor/Party {party_code} already exists'}), 400
        
    vendor = Party_Master(
        party_code=party_code,
        party_name=party_name,
        address_1=data.get('address_1', ''),
        address_2=data.get('address_2', ''),
        address_3=data.get('address_3', ''),
        phone_no=data.get('phone_no', ''),
        contact_person=data.get('contact_person', ''),
        email=data.get('email', ''),
        bank_name=data.get('bank_name', ''),
        bank_ac_no=data.get('bank_ac_no', ''),
        bank_ifsc=data.get('bank_ifsc', ''),
        bank_branch=data.get('bank_branch', ''),
        payment_terms=data.get('payment_terms', '')
    )
    db.session.add(vendor)
    db.session.commit()
    log_change('party_master', 'CREATE', None, f"Vendor {party_code}: {party_name}")
    return jsonify(vendor.serialize()), 201

@procurement_bp.route('/api/procurement/vendors/<party_code>', methods=['PUT'])
@jwt_required()
def update_vendor(party_code):
    check_admin()
    vendor = Party_Master.query.filter_by(party_code=party_code).first()
    if not vendor:
        return jsonify({'error': 'Vendor/Party not found'}), 404
        
    data = request.json or {}
    if 'party_name' in data:
        vendor.party_name = data['party_name']
    if 'address_1' in data:
        vendor.address_1 = data['address_1']
    if 'address_2' in data:
        vendor.address_2 = data['address_2']
    if 'address_3' in data:
        vendor.address_3 = data['address_3']
    if 'phone_no' in data:
        vendor.phone_no = data['phone_no']
    if 'contact_person' in data:
        vendor.contact_person = data['contact_person']
    if 'email' in data:
        vendor.email = data['email']
    if 'bank_name' in data:
        vendor.bank_name = data['bank_name']
    if 'bank_ac_no' in data:
        vendor.bank_ac_no = data['bank_ac_no']
    if 'bank_ifsc' in data:
        vendor.bank_ifsc = data['bank_ifsc']
    if 'bank_branch' in data:
        vendor.bank_branch = data['bank_branch']
    if 'payment_terms' in data:
        vendor.payment_terms = data['payment_terms']
        
    db.session.commit()
    log_change('party_master', f'UPDATE_{party_code}', None, f"Updated Vendor {party_code}")
    return jsonify(vendor.serialize())

@procurement_bp.route('/api/procurement/vendors/<party_code>', methods=['DELETE'])
@jwt_required()
def delete_vendor(party_code):
    check_admin()
    vendor = Party_Master.query.filter_by(party_code=party_code).first()
    if not vendor:
        return jsonify({'error': 'Vendor/Party not found'}), 404
        
    # Check if there are active purchase orders referencing this party
    po_count = POMAIN.query.filter_by(party_code=party_code).count()
    if po_count > 0:
        return jsonify({'error': f'Cannot delete vendor {party_code} because it has {po_count} active purchase orders.'}), 400
        
    db.session.delete(vendor)
    db.session.commit()
    log_change('party_master', 'DELETE', f"Vendor {party_code}", None)
    return jsonify({'success': True})

@procurement_bp.route('/api/procurement/vendors/<party_code>/items', methods=['GET'])
def get_vendor_items(party_code):
    vendor = Party_Master.query.filter_by(party_code=party_code).first()
    if not vendor:
        return jsonify({'error': 'Vendor/Party not found'}), 404
    offerings = Party_Item.query.filter_by(party_code=party_code).all()
    return jsonify([o.serialize() for o in offerings])

@procurement_bp.route('/api/procurement/vendors/<party_code>/items', methods=['POST'])
@jwt_required()
def add_vendor_item(party_code):
    check_admin()
    vendor = Party_Master.query.filter_by(party_code=party_code).first()
    if not vendor:
        return jsonify({'error': 'Vendor/Party not found'}), 404
    
    data = request.json or {}
    item_code = data.get('item_code')
    last_rate = data.get('last_rate')
    
    if not item_code:
        return jsonify({'error': 'item_code is required'}), 400
        
    item = Item_Master.query.filter_by(item_code=item_code).first()
    if not item:
        return jsonify({'error': f'Item {item_code} not found'}), 404
        
    # Check if offering already exists
    existing = Party_Item.query.filter_by(party_code=party_code, item_code=item_code).first()
    if existing:
        return jsonify({'error': f'Item {item_code} is already offered by vendor {party_code}'}), 400
        
    # Handle last_rate parsing
    parsed_rate = None
    if last_rate is not None and last_rate != '':
        try:
            parsed_rate = float(last_rate)
        except ValueError:
            return jsonify({'error': 'Invalid rate value'}), 400
            
    offering = Party_Item(
        party_code=party_code,
        item_code=item_code,
        last_rate=parsed_rate
    )
    db.session.add(offering)
    db.session.commit()
    
    log_change('party_item', 'CREATE', None, f"Vendor {party_code} offered Item {item_code} at rate {parsed_rate}")
    return jsonify(offering.serialize()), 201

@procurement_bp.route('/api/procurement/vendors/<party_code>/items/<item_code>', methods=['PUT'])
@jwt_required()
def update_vendor_item_rate(party_code, item_code):
    check_admin()
    offering = Party_Item.query.filter_by(party_code=party_code, item_code=item_code).first()
    if not offering:
        return jsonify({'error': 'Offering not found'}), 404
        
    data = request.json or {}
    last_rate = data.get('last_rate')
    
    old_rate = float(offering.last_rate) if offering.last_rate is not None else None
    
    # Handle last_rate parsing
    parsed_rate = None
    if last_rate is not None and last_rate != '':
        try:
            parsed_rate = float(last_rate)
        except ValueError:
            return jsonify({'error': 'Invalid rate value'}), 400
            
    offering.last_rate = parsed_rate
    db.session.commit()
    
    log_change('party_item', f'{party_code}_{item_code}.last_rate', old_rate, parsed_rate)
    return jsonify(offering.serialize())

@procurement_bp.route('/api/procurement/vendors/<party_code>/items/<item_code>', methods=['DELETE'])
@jwt_required()
def delete_vendor_item(party_code, item_code):
    check_admin()
    offering = Party_Item.query.filter_by(party_code=party_code, item_code=item_code).first()
    if not offering:
        return jsonify({'error': 'Offering not found'}), 404
        
    db.session.delete(offering)
    db.session.commit()
    log_change('party_item', 'DELETE', f"{party_code}_{item_code}", None)
    return jsonify({'success': True})

@procurement_bp.route('/api/procurement/vendors/bulk', methods=['POST'])
@jwt_required()
def bulk_update_vendors():
    check_admin()
    data = request.json or {}
    
    creates = data.get('creates', [])
    updates = data.get('updates', [])
    deletes = data.get('deletes', [])
    
    # 1. Handle Deletions
    for party_code in deletes:
        vendor = Party_Master.query.filter_by(party_code=party_code).first()
        if not vendor:
            continue
            
        po_count = POMAIN.query.filter_by(party_code=party_code).count()
        if po_count > 0:
            db.session.rollback()
            return jsonify({'error': f'Cannot delete vendor {party_code} because it has {po_count} active purchase orders.'}), 400
            
        db.session.delete(vendor)
        log_change('party_master', 'DELETE', f"Vendor {party_code}", None)
        
    # 2. Handle Updates
    for u in updates:
        party_code = u.get('party_code')
        vendor = Party_Master.query.filter_by(party_code=party_code).first()
        if not vendor:
            db.session.rollback()
            return jsonify({'error': f'Vendor {party_code} not found for update.'}), 404
            
        vendor.party_name = u.get('party_name', vendor.party_name)
        vendor.address_1 = u.get('address_1', vendor.address_1)
        vendor.address_2 = u.get('address_2', vendor.address_2)
        vendor.address_3 = u.get('address_3', vendor.address_3)
        vendor.phone_no = u.get('phone_no', vendor.phone_no)
        vendor.contact_person = u.get('contact_person', vendor.contact_person)
        vendor.email = u.get('email', vendor.email)
        vendor.bank_name = u.get('bank_name', vendor.bank_name)
        vendor.bank_ac_no = u.get('bank_ac_no', vendor.bank_ac_no)
        vendor.bank_ifsc = u.get('bank_ifsc', vendor.bank_ifsc)
        vendor.bank_branch = u.get('bank_branch', vendor.bank_branch)
        vendor.payment_terms = u.get('payment_terms', vendor.payment_terms)
        
        log_change('party_master', f'UPDATE_{party_code}', None, f"Updated Vendor {party_code}")
        
    # 3. Handle Creations
    local_max_seq = {}
    for c in creates:
        party_code = c.get('party_code')
        party_name = c.get('party_name')
        if not party_name:
            db.session.rollback()
            return jsonify({'error': 'party_name is required for new vendors.'}), 400
            
        if not party_code or party_code.strip() == '' or party_code.upper() == '[AUTO]':
            first_letter = 'X'
            if party_name and len(party_name) > 0:
                for char in party_name:
                    if char.isalpha():
                        first_letter = char.upper()
                        break
            prefix = f"CG{first_letter}"
            
            if prefix not in local_max_seq:
                existing_codes = Party_Master.query.filter(Party_Master.party_code.like(f"{prefix}%")).all()
                max_seq = 0
                for esc in existing_codes:
                    suffix = esc.party_code[len(prefix):]
                    if suffix.isdigit():
                        max_seq = max(max_seq, int(suffix))
                local_max_seq[prefix] = max_seq
                
            local_max_seq[prefix] += 1
            party_code = f"{prefix}{str(local_max_seq[prefix]).zfill(3)}"
        else:
            party_code = party_code.upper()
            
        existing = Party_Master.query.filter_by(party_code=party_code).first()
        if existing:
            db.session.rollback()
            return jsonify({'error': f'Vendor/Party {party_code} already exists.'}), 400
            
        vendor = Party_Master(
            party_code=party_code,
            party_name=party_name,
            address_1=c.get('address_1', ''),
            address_2=c.get('address_2', ''),
            address_3=c.get('address_3', ''),
            phone_no=c.get('phone_no', ''),
            contact_person=c.get('contact_person', ''),
            email=c.get('email', ''),
            bank_name=c.get('bank_name', ''),
            bank_ac_no=c.get('bank_ac_no', ''),
            bank_ifsc=c.get('bank_ifsc', ''),
            bank_branch=c.get('bank_branch', ''),
            payment_terms=c.get('payment_terms', '')
        )
        db.session.add(vendor)
        log_change('party_master', 'CREATE', None, f"Vendor {party_code}: {party_name}")
        
    db.session.commit()
    return jsonify({'success': True, 'message': 'Bulk changes saved successfully.'})

