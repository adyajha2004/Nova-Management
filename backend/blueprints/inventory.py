import datetime

from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required
from models import db, Item_Master, Item_Group, Party_Item, Party_Master
from blueprints.auth import check_admin
from blueprints.audit import log_change

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/api/inventory/groups', methods=['GET'])
def get_groups():
    groups = Item_Group.query.order_by(Item_Group.itg_name.asc()).all()
    return jsonify([g.serialize() for g in groups])

@inventory_bp.route('/api/inventory/groups', methods=['POST'])
@jwt_required()
def create_group():
    check_admin()
    data = request.json or {}
    itg_code = data.get('itg_code')
    itg_name = data.get('itg_name')
    if not itg_name:
        return jsonify({'error': 'itg_name is required'}), 400
        
    if not itg_code or itg_code.strip() == '' or itg_code.upper() == '[AUTO]':
        prefix_char = 'G'
        prefix_val = data.get('prefix', '') or data.get('itg_cgkey', '') or itg_name or 'G'
        for char in prefix_val:
            if char.isalpha():
                prefix_char = char.upper()
                break
        prefix_char = prefix_char.upper()
        
        existing_groups = Item_Group.query.filter(Item_Group.itg_code.like(f"{prefix_char}%")).all()
        max_seq = 0
        for eg in existing_groups:
            suffix = eg.itg_code[len(prefix_char):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        next_seq = max_seq + 1
        itg_code = f"{prefix_char}{str(next_seq).zfill(5)}"
    else:
        itg_code = itg_code.upper()
        
    existing = Item_Group.query.filter_by(itg_code=itg_code).first()
    if existing:
        return jsonify({'error': f'Group {itg_code} already exists'}), 400
        
    group = Item_Group(
        itg_code=itg_code,
        itg_name=itg_name,
        itg_cgkey=data.get('itg_cgkey', itg_code[:2].upper() if len(itg_code) >= 2 else 'GP'),
        prefix=data.get('prefix', itg_code[:2].upper() if len(itg_code) >= 2 else 'GP'),
        last_sequence=int(data.get('last_sequence', 0))
    )
    db.session.add(group)
    db.session.commit()
    log_change('item_group', 'CREATE', None, f"Group {itg_code}: {itg_name}")
    return jsonify(group.serialize()), 201

@inventory_bp.route('/api/inventory/groups/<itg_code>', methods=['PUT'])
@jwt_required()
def update_group(itg_code):
    check_admin()
    group = Item_Group.query.filter_by(itg_code=itg_code).first()
    if not group:
        return jsonify({'error': 'Group not found'}), 404
        
    data = request.json or {}
    if 'itg_name' in data:
        group.itg_name = data['itg_name']
    if 'itg_cgkey' in data:
        group.itg_cgkey = data['itg_cgkey']
    if 'prefix' in data:
        group.prefix = data['prefix']
    if 'last_sequence' in data:
        group.last_sequence = int(data['last_sequence'])
        
    db.session.commit()
    log_change('item_group', f'UPDATE_{itg_code}', None, f"Updated Group {itg_code}")
    return jsonify(group.serialize())

@inventory_bp.route('/api/inventory/groups/<itg_code>', methods=['DELETE'])
@jwt_required()
def delete_group(itg_code):
    check_admin()
    group = Item_Group.query.filter_by(itg_code=itg_code).first()
    if not group:
        return jsonify({'error': 'Group not found'}), 404
        
    # Check if there are items in this group
    item_count = Item_Master.query.filter_by(itg_code=itg_code).count()
    if item_count > 0:
        return jsonify({'error': f'Cannot delete group {itg_code} because it contains {item_count} items'}), 400
        
    db.session.delete(group)
    db.session.commit()
    log_change('item_group', 'DELETE', f"Group {itg_code}", None)
    return jsonify({'success': True})

@inventory_bp.route('/api/inventory/items', methods=['GET'])
def get_items():
    items = Item_Master.query.order_by(Item_Master.item_name.asc()).all()
    return jsonify([itm.serialize() for itm in items])

@inventory_bp.route('/api/inventory/items/<item_code>', methods=['GET'])
def get_item(item_code):
    itm = Item_Master.query.filter_by(item_code=item_code).first()
    if not itm:
        return jsonify({'error': 'Item not found'}), 404
    return jsonify(itm.serialize())

@inventory_bp.route('/api/inventory/items', methods=['POST'])
@jwt_required()
def create_item():
    check_admin()
    data = request.json or {}
    
    itg_code = data.get('itg_code')
    comp_id = data.get('comp_id', 'NC')
    
    if not itg_code:
        return jsonify({'error': 'itg_code is required'}), 400
        
    if comp_id not in ['NC', 'ND']:
        return jsonify({'error': "comp_id must be 'NC' or 'ND'"}), 400

    # Auto-generate item_code inside a strict lock transaction
    try:
        # Acquire a row lock on the item group to isolate sequence assignment
        group = Item_Group.query.filter_by(itg_code=itg_code).with_for_update().first()
        if not group:
            return jsonify({'error': f'Item Group {itg_code} not found'}), 400
            
        prefix = group.prefix or 'RM'
        new_seq = (group.last_sequence or 0) + 1
        
        # Format: Prefix + 3-digit zero-padded number (e.g. RM001)
        item_code = f"{prefix}{str(new_seq).zfill(3)}"
        
        # Verify it doesn't exist
        existing = Item_Master.query.filter_by(item_code=item_code).first()
        if existing:
            # Safeguard in case sequence got out of sync
            # Let's search for next available sequence
            while Item_Master.query.filter_by(item_code=item_code).first():
                new_seq += 1
                item_code = f"{prefix}{str(new_seq).zfill(3)}"
        
        # Update sequence count in group
        group.last_sequence = new_seq
        
        itm = Item_Master(
            item_code=item_code,
            item_name=data.get('item_name', ''),
            itg_code=itg_code,
            comp_id=comp_id,
            units=data.get('units', 'KG'),
            gst_pr=data.get('gst_pr', 18.0),
            itc_comp=data.get('itc_comp', ''),
            packing=data.get('packing', ''),
            bal_qt=data.get('bal_qt', 0.0),
            opn_qt=data.get('bal_qt', 0.0),
            inw_qt=0.0,
            out_qt=0.0,
            ror_qt=data.get('ror_qt', 0.0),
            min_qt=data.get('min_qt', 0.0),
            last_rate=data.get('last_rate', 0.0),
            lead_time=data.get('lead_time', 0),
            is_lic=data.get('is_lic', False),
            is_imp=data.get('is_imp', False),
            pack_qty=data.get('pack_qty', 1.0)
        )
        
        db.session.add(itm)
        
        # Add initial offerings if specified
        offerings = data.get('offerings', [])
        for off in offerings:
            party_code = off.get('party_code')
            last_rate = off.get('last_rate')
            if not party_code:
                continue
                
            party = Party_Master.query.filter_by(party_code=party_code).first()
            if not party:
                raise ValueError(f"Party {party_code} not found")
                
            parsed_rate = None
            if last_rate is not None and last_rate != '':
                try:
                    parsed_rate = float(last_rate)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid rate {last_rate} for party {party_code}")
                    
            offering = Party_Item(
                party_code=party_code,
                item_code=item_code,
                last_rate=parsed_rate
            )
            db.session.add(offering)
            
        db.session.commit()
        
        log_change('item_master', 'CREATE', None, f"Item {item_code}: {itm.item_name} ({comp_id})")
        return jsonify(itm.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to generate item code under transaction lock: {str(e)}'}), 500

@inventory_bp.route('/api/inventory/items/<item_code>', methods=['PUT'])
@jwt_required()
def update_item(item_code):
    check_admin()
    itm = Item_Master.query.filter_by(item_code=item_code).first()
    if not itm:
        return jsonify({'error': 'Item not found'}), 404
        
    data = request.json or {}
    
    old_bal = itm.bal_qt
    new_bal = data.get('bal_qt')
    
    if new_bal is not None:
        new_bal = float(new_bal)

        if new_bal > old_bal:
            old_date = itm.lrec_date
            itm.lrec_date = datetime.now().date()
            log_change(
                'item_master',
                f'{item_code}.lrec_date',
                old_date,
                itm.lrec_date
            )

        elif new_bal < old_bal:
            old_date = itm.lrec_date
            itm.liss_date = datetime.now().date()
            log_change(
                'item_master',
                f'{item_code}.liss_date',
                old_date,
                itm.liss_date
            )

        if new_bal != old_bal:
            itm.bal_qt = new_bal
            log_change('item_master', f'{item_code}.bal_qt', old_bal, new_bal)
        
    if 'item_name' in data:
        itm.item_name = data['item_name']
    if 'itg_code' in data:
        itm.itg_code = data['itg_code']
    if 'units' in data:
        itm.units = data['units']
    if 'gst_pr' in data:
        itm.gst_pr = data['gst_pr']
    if 'packing' in data:
        itm.packing = data['packing']
    if 'ror_qt' in data:
        itm.ror_qt = data['ror_qt']
    if 'min_qt' in data:
        itm.min_qt = data['min_qt']
    if 'last_rate' in data:
        itm.last_rate = data['last_rate']
    if 'lead_time' in data:
        itm.lead_time = data['lead_time']
    if 'is_lic' in data:
        itm.is_lic = data['is_lic']
    if 'is_imp' in data:
        itm.is_imp = data['is_imp']
    if 'pack_qty' in data:
        itm.pack_qty = data['pack_qty']
        
    db.session.commit()
    return jsonify(itm.serialize())

@inventory_bp.route('/api/inventory/items/<item_code>', methods=['DELETE'])
@jwt_required()
def delete_item(item_code):
    check_admin()
    itm = Item_Master.query.filter_by(item_code=item_code).first()
    if not itm:
        return jsonify({'error': 'Item not found'}), 404
        
    db.session.delete(itm)
    db.session.commit()
    log_change('item_master', 'DELETE', f"Item {item_code}", None)
    return jsonify({'success': True})

@inventory_bp.route('/api/inventory/items/<item_code>/vendors', methods=['GET'])
def get_item_vendors(item_code):
    itm = Item_Master.query.filter_by(item_code=item_code).first()
    if not itm:
        return jsonify({'error': 'Item not found'}), 404
        
    offerings = Party_Item.query.filter_by(item_code=item_code).all()
    
    result = []
    for o in offerings:
        result.append({
            'party_code': o.party_code,
            'party_name': o.party.party_name if o.party else 'Unknown Vendor',
            'last_rate': float(o.last_rate) if o.last_rate is not None else None,
            'email': o.party.email if o.party else '',
            'phone_no': o.party.phone_no if o.party else '',
            'payment_terms': o.party.payment_terms if o.party else ''
        })
    return jsonify(result)

@inventory_bp.route('/api/inventory/items/<item_code>/vendors', methods=['POST'])
@jwt_required()
def add_item_vendor(item_code):
    check_admin()
    itm = Item_Master.query.filter_by(item_code=item_code).first()
    if not itm:
        return jsonify({'error': 'Item not found'}), 404
        
    data = request.json or {}
    party_code = data.get('party_code')
    last_rate = data.get('last_rate')
    
    if not party_code:
        return jsonify({'error': 'party_code is required'}), 400
        
    party = Party_Master.query.filter_by(party_code=party_code).first()
    if not party:
        return jsonify({'error': f'Vendor {party_code} not found'}), 404
        
    existing = Party_Item.query.filter_by(party_code=party_code, item_code=item_code).first()
    if existing:
        return jsonify({'error': f'Vendor {party_code} already offers item {item_code}'}), 400
        
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
    return jsonify({
        'party_code': party_code,
        'party_name': party.party_name,
        'last_rate': parsed_rate,
        'email': party.email or '',
        'phone_no': party.phone_no or '',
        'payment_terms': party.payment_terms or ''
    }), 201

@inventory_bp.route('/api/inventory/items/<item_code>/vendors/<party_code>', methods=['PUT'])
@jwt_required()
def update_item_vendor_rate(item_code, party_code):
    check_admin()
    offering = Party_Item.query.filter_by(party_code=party_code, item_code=item_code).first()
    if not offering:
        return jsonify({'error': 'Offering not found'}), 404
        
    data = request.json or {}
    last_rate = data.get('last_rate')
    
    old_rate = float(offering.last_rate) if offering.last_rate is not None else None
    
    parsed_rate = None
    if last_rate is not None and last_rate != '':
        try:
            parsed_rate = float(last_rate)
        except ValueError:
            return jsonify({'error': 'Invalid rate value'}), 400
            
    offering.last_rate = parsed_rate
    db.session.commit()
    
    log_change('party_item', f'{party_code}_{item_code}.last_rate', old_rate, parsed_rate)
    return jsonify({
        'party_code': party_code,
        'item_code': item_code,
        'last_rate': parsed_rate
    })

@inventory_bp.route('/api/inventory/items/<item_code>/vendors/<party_code>', methods=['DELETE'])
@jwt_required()
def delete_item_vendor(item_code, party_code):
    check_admin()
    offering = Party_Item.query.filter_by(party_code=party_code, item_code=item_code).first()
    if not offering:
        return jsonify({'error': 'Offering not found'}), 404
        
    db.session.delete(offering)
    db.session.commit()
    log_change('party_item', 'DELETE', f"{party_code}_{item_code}", None)
    return jsonify({'success': True})

@inventory_bp.route('/api/inventory/items/bulk', methods=['POST'])
@jwt_required()
def bulk_update_items():
    check_admin()
    data = request.json or {}
    
    creates = data.get('creates', [])
    updates = data.get('updates', [])
    deletes = data.get('deletes', [])
    
    from models import Recipe_Tran, MPRTRAN, POTRAN
    
    # 1. Handle Deletions
    for item_code in deletes:
        itm = Item_Master.query.filter_by(item_code=item_code).first()
        if not itm:
            continue
            
        recipe_usage = Recipe_Tran.query.filter_by(item_code=item_code).count()
        po_usage = POTRAN.query.filter_by(item_code=item_code).count()
        mpr_usage = MPRTRAN.query.filter_by(item_code=item_code).count()
        
        if recipe_usage > 0 or po_usage > 0 or mpr_usage > 0:
            db.session.rollback()
            return jsonify({'error': f'Cannot delete Item {item_code} because it is referenced in recipes, MPRs, or purchase orders.'}), 400
            
        Party_Item.query.filter_by(item_code=item_code).delete()
        db.session.delete(itm)
        log_change('item_master', 'DELETE', f"Item {item_code}", None)
        
    # 2. Handle Updates
    for u in updates:
        item_code = u.get('item_code')
        itm = Item_Master.query.filter_by(item_code=item_code).first()
        if not itm:
            db.session.rollback()
            return jsonify({'error': f'Item {item_code} not found for update.'}), 404
            
        old_bal = float(itm.bal_qt)
        new_bal = float(u.get('bal_qt', 0.0))

        if new_bal > old_bal:
            old_date = itm.lrec_date
            itm.lrec_date = datetime.now().date()
            log_change(
                'item_master',
                f'{item_code}.lrec_date',
                old_date,
                itm.lrec_date
            )

        elif new_bal < old_bal:
            old_date = itm.liss_date
            itm.liss_date = datetime.now().date()
            log_change(
                'item_master',
                f'{item_code}.liss_date',
                old_date,
                itm.liss_date
            )

        itm.item_name = u.get('item_name', itm.item_name)
        itm.itg_code = u.get('itg_code', itm.itg_code)
        itm.comp_id = u.get('comp_id', itm.comp_id)
        itm.units = u.get('units', itm.units)
        itm.gst_pr = float(u.get('gst_pr', 0.0))
        itm.packing = u.get('packing', '')
        itm.pack_qty = float(u.get('pack_qty', 1.0))
        itm.bal_qt = new_bal
        itm.min_qt = float(u.get('min_qt', 0.0))
        itm.ror_qt = float(u.get('ror_qt', 0.0))
        itm.lead_time = int(u.get('lead_time', 0))
        itm.last_rate = float(u.get('last_rate', 0.0))
        itm.is_lic = bool(u.get('is_lic', False))
        itm.is_imp = bool(u.get('is_imp', False))
        
        if old_bal != new_bal:
            log_change('item_master', f'{item_code}.bal_qt', old_bal, new_bal)
            
    # 3. Handle Creations
    for c in creates:
        itg_code = c.get('itg_code')
        comp_id = c.get('comp_id', 'NC')
        if not itg_code:
            db.session.rollback()
            return jsonify({'error': 'Group code (itg_code) is required for new items'}), 400
            
        group = Item_Group.query.filter_by(itg_code=itg_code).with_for_update().first()
        if not group:
            db.session.rollback()
            return jsonify({'error': f'Item Group {itg_code} not found'}), 400
            
        prefix = group.prefix or 'RM'
        new_seq = (group.last_sequence or 0) + 1
        item_code = f"{prefix}{str(new_seq).zfill(3)}"
        
        while Item_Master.query.filter_by(item_code=item_code).first():
            new_seq += 1
            item_code = f"{prefix}{str(new_seq).zfill(3)}"
            
        group.last_sequence = new_seq
        
        itm = Item_Master(
            item_code=item_code,
            item_name=c.get('item_name', ''),
            itg_code=itg_code,
            comp_id=comp_id,
            units=c.get('units', 'KG'),
            gst_pr=float(c.get('gst_pr', 18.0)),
            packing=c.get('packing', ''),
            pack_qty=float(c.get('pack_qty', 1.0)),
            bal_qt=float(c.get('bal_qt', 0.0)),
            opn_qt=float(c.get('bal_qt', 0.0)),
            inw_qt=0.0,
            out_qt=0.0,
            min_qt=float(c.get('min_qt', 0.0)),
            ror_qt=float(c.get('ror_qt', 0.0)),
            lead_time=int(c.get('lead_time', 5)),
            last_rate=float(c.get('last_rate', 0.0)),
            is_lic=bool(c.get('is_lic', False)),
            is_imp=bool(c.get('is_imp', False))
        )
        db.session.add(itm)
        log_change('item_master', 'CREATE', None, f"Item {item_code}: {itm.item_name}")
        
    db.session.commit()
    return jsonify({'success': True, 'message': 'Bulk changes saved successfully.'})

@inventory_bp.route('/api/inventory/groups/bulk', methods=['POST'])
@jwt_required()
def bulk_update_groups():
    check_admin()
    data = request.json or {}
    
    creates = data.get('creates', [])
    updates = data.get('updates', [])
    deletes = data.get('deletes', [])
    
    # 1. Handle Deletions
    for itg_code in deletes:
        group = Item_Group.query.filter_by(itg_code=itg_code).first()
        if not group:
            continue
            
        item_count = Item_Master.query.filter_by(itg_code=itg_code).count()
        if item_count > 0:
            db.session.rollback()
            return jsonify({'error': f'Cannot delete group {itg_code} because it contains {item_count} items.'}), 400
            
        db.session.delete(group)
        log_change('item_group', 'DELETE', f"Group {itg_code}", None)
        
    # 2. Handle Updates
    for u in updates:
        itg_code = u.get('itg_code')
        group = Item_Group.query.filter_by(itg_code=itg_code).first()
        if not group:
            db.session.rollback()
            return jsonify({'error': f'Group {itg_code} not found for update.'}), 404
            
        group.itg_name = u.get('itg_name', group.itg_name)
        group.itg_cgkey = u.get('itg_cgkey', group.itg_cgkey)
        group.prefix = u.get('prefix', group.prefix)
        if 'last_sequence' in u:
            try:
                group.last_sequence = int(u['last_sequence'])
            except (ValueError, TypeError):
                db.session.rollback()
                return jsonify({'error': f'Invalid last_sequence for group {itg_code}.'}), 400
                
        log_change('item_group', f'UPDATE_{itg_code}', None, f"Updated Group {itg_code}")
        
    # 3. Handle Creations
    local_max_seq = {}
    for c in creates:
        itg_code = c.get('itg_code')
        itg_name = c.get('itg_name')
        if not itg_name:
            db.session.rollback()
            return jsonify({'error': 'itg_name is required for new groups.'}), 400
            
        if not itg_code or itg_code.strip() == '' or itg_code.upper() == '[AUTO]':
            prefix_char = 'G'
            prefix_val = c.get('prefix', '') or c.get('itg_cgkey', '') or itg_name or 'G'
            for char in prefix_val:
                if char.isalpha():
                    prefix_char = char.upper()
                    break
            prefix_char = prefix_char.upper()
            
            if prefix_char not in local_max_seq:
                existing_groups = Item_Group.query.filter(Item_Group.itg_code.like(f"{prefix_char}%")).all()
                max_seq = 0
                for eg in existing_groups:
                    suffix = eg.itg_code[len(prefix_char):]
                    if suffix.isdigit():
                        max_seq = max(max_seq, int(suffix))
                local_max_seq[prefix_char] = max_seq
                
            local_max_seq[prefix_char] += 1
            itg_code = f"{prefix_char}{str(local_max_seq[prefix_char]).zfill(5)}"
        else:
            itg_code = itg_code.upper()
            
        existing = Item_Group.query.filter_by(itg_code=itg_code).first()
        if existing:
            db.session.rollback()
            return jsonify({'error': f'Group {itg_code} already exists.'}), 400
            
        group = Item_Group(
            itg_code=itg_code,
            itg_name=itg_name,
            itg_cgkey=c.get('itg_cgkey', itg_code[:2].upper() if len(itg_code) >= 2 else 'GP'),
            prefix=c.get('prefix', itg_code[:2].upper() if len(itg_code) >= 2 else 'GP'),
            last_sequence=int(c.get('last_sequence', 0))
        )
        db.session.add(group)
        log_change('item_group', 'CREATE', None, f"Group {itg_code}: {itg_name}")
        
    db.session.commit()
    return jsonify({'success': True, 'message': 'Bulk changes saved successfully.'})

