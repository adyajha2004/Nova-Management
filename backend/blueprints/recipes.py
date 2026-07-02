from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models import db, Recipe_Master, Recipe_Tran, Item_Master, MPRMAIN, MPRTRAN
from blueprints.auth import check_admin
from blueprints.audit import log_change
from datetime import datetime

recipes_bp = Blueprint('recipes', __name__)

@recipes_bp.route('/api/recipes', methods=['GET'])
def get_recipes():
    recipes = Recipe_Master.query.order_by(Recipe_Master.rcp_name.asc()).all()
    return jsonify([rcp.serialize() for rcp in recipes])

@recipes_bp.route('/api/recipes/<rcp_code>', methods=['GET'])
def get_recipe(rcp_code):
    recipe = Recipe_Master.query.filter_by(rcp_code=rcp_code).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
        
    ingredients = Recipe_Tran.query.filter_by(rcp_code=rcp_code).all()
    result = recipe.serialize()
    result['ingredients'] = [ing.serialize() for ing in ingredients]
    return jsonify(result)

@recipes_bp.route('/api/recipes/scale', methods=['POST'])
@jwt_required()
def scale_recipe():
    check_admin()
    data = request.json or {}
    
    rcp_code = data.get('rcp_code')
    target_yield = data.get('target_yield')
    
    if not rcp_code or target_yield is None:
        return jsonify({'error': 'rcp_code and target_yield are required'}), 400
        
    try:
        target_yield = float(target_yield)
    except ValueError:
        return jsonify({'error': 'target_yield must be a number'}), 400
        
    recipe = Recipe_Master.query.filter_by(rcp_code=rcp_code).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
        
    # Sourced company context directly from the recipe master
    comp_id = recipe.comp_id
        
    ingredients = Recipe_Tran.query.filter_by(rcp_code=rcp_code).all()
    if not ingredients:
        return jsonify({'error': 'Recipe has no ingredients'}), 400
        
    scaling_results = []
    deficits = []
    
    rcp_yield = float(recipe.rcp_yield)
    
    for ing in ingredients:
        # Find item globally
        item = Item_Master.query.filter_by(item_code=ing.item_code).first()
        if not item:
            continue
            
        item_qty = float(ing.item_qty)
        req_qty = (item_qty * target_yield) / rcp_yield
        bal_qt = float(item.bal_qt)
        
        deficit = 0.0
        if bal_qt < req_qty:
            deficit = req_qty - bal_qt
            deficits.append({
                'item_code': item.item_code,
                'item_name': item.item_name,
                'req_qty': req_qty,
                'deficit_qty': deficit
            })
            
        scaling_results.append({
            'item_code': item.item_code,
            'item_name': item.item_name,
            'units': item.units,
            'req_qty': req_qty,
            'bal_qt': bal_qt,
            'deficit_qty': deficit
        })
        
    mpr_no = None
    if deficits:
        timestamp_str = datetime.now().strftime("%H%M%S")
        mpr_no = f"MPR{timestamp_str}"
        
        mpr_main = MPRMAIN(
            mpr_no=mpr_no,
            mpr_date=datetime.now().date(),
            comp_id=comp_id,  # Uses the company code from the recipe master
            status='STAGED'
        )
        db.session.add(mpr_main)
        
        for d in deficits:
            mpr_tran = MPRTRAN(
                mpr_no=mpr_no,
                item_code=d['item_code'],
                req_qty=d['req_qty'],
                deficit_qty=d['deficit_qty'],
                status='PENDING'
            )
            db.session.add(mpr_tran)
            
        db.session.commit()
        log_change('mprmain', 'STAGE_MPR', None, f"Created {mpr_no} for recipe {rcp_code} ({comp_id})")
        
    return jsonify({
        'rcp_code': rcp_code,
        'target_yield': target_yield,
        'comp_id': comp_id,
        'has_deficits': len(deficits) > 0,
        'mpr_no': mpr_no,
        'results': scaling_results
    })

@recipes_bp.route('/api/recipes', methods=['POST'])
@jwt_required()
def create_recipe():
    check_admin()
    data = request.json or {}
    
    rcp_name = data.get('rcp_name')
    rcp_yield = data.get('rcp_yield', 100.0)
    comp_id = data.get('comp_id', 'NC')
    ingredients = data.get('ingredients', []) # list of dicts: {item_code, item_qty}
    
    if not rcp_name:
        return jsonify({'error': 'rcp_name is required'}), 400
        
    if comp_id not in ['NC', 'ND']:
        return jsonify({'error': "comp_id must be 'NC' or 'ND'"}), 400
        
    # Auto-generate rcp_code based on comp_id
    prefix = 'RC' if comp_id == 'NC' else 'RD'
    
    existing_recipes = Recipe_Master.query.filter(Recipe_Master.rcp_code.like(f"{prefix}%")).all()
    max_seq = 0
    for r in existing_recipes:
        try:
            seq = int(r.rcp_code[2:])
            if seq > max_seq:
                max_seq = seq
        except ValueError:
            pass
            
    rcp_code = f"{prefix}{str(max_seq + 1).zfill(4)}"
    
    recipe = Recipe_Master(
        rcp_code=rcp_code,
        rcp_name=rcp_name,
        rcp_yield=float(rcp_yield),
        comp_id=comp_id
    )
    db.session.add(recipe)
    
    # Add ingredients
    for ing in ingredients:
        item_code = ing.get('item_code')
        item_qty = float(ing.get('item_qty', 0.0))
        
        if not item_code or item_qty <= 0:
            continue
            
        item = Item_Master.query.filter_by(item_code=item_code).first()
        item_name = item.item_name if item else 'Unknown Item'
        
        rcp_tran = Recipe_Tran(
            rcp_code=rcp_code,
            item_code=item_code,
            item_name=item_name,
            item_qty=item_qty
        )
        db.session.add(rcp_tran)
        
    db.session.commit()
    log_change('recipe_master', 'CREATE', None, f"Recipe {rcp_code}: {rcp_name} ({comp_id})")
    
    result = recipe.serialize()
    ingredients_db = Recipe_Tran.query.filter_by(rcp_code=rcp_code).all()
    result['ingredients'] = [ing.serialize() for ing in ingredients_db]
    return jsonify(result), 201

@recipes_bp.route('/api/recipes/<rcp_code>', methods=['PUT'])
@jwt_required()
def update_recipe(rcp_code):
    check_admin()
    recipe = Recipe_Master.query.filter_by(rcp_code=rcp_code).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
        
    data = request.json or {}
    
    if 'rcp_name' in data:
        recipe.rcp_name = data['rcp_name']
    if 'rcp_yield' in data:
        recipe.rcp_yield = float(data['rcp_yield'])
    if 'comp_id' in data and data['comp_id'] in ['NC', 'ND']:
        recipe.comp_id = data['comp_id']
        
    if 'ingredients' in data:
        Recipe_Tran.query.filter_by(rcp_code=rcp_code).delete()
        
        for ing in data['ingredients']:
            item_code = ing.get('item_code')
            item_qty = float(ing.get('item_qty', 0.0))
            
            if not item_code or item_qty <= 0:
                continue
                
            item = Item_Master.query.filter_by(item_code=item_code).first()
            item_name = item.item_name if item else 'Unknown Item'
            
            rcp_tran = Recipe_Tran(
                rcp_code=rcp_code,
                item_code=item_code,
                item_name=item_name,
                item_qty=item_qty
            )
            db.session.add(rcp_tran)
            
    db.session.commit()
    log_change('recipe_master', f'UPDATE_{rcp_code}', None, f"Updated Recipe {rcp_code}")
    
    result = recipe.serialize()
    ingredients_db = Recipe_Tran.query.filter_by(rcp_code=rcp_code).all()
    result['ingredients'] = [ing.serialize() for ing in ingredients_db]
    return jsonify(result)

@recipes_bp.route('/api/recipes/<rcp_code>', methods=['DELETE'])
@jwt_required()
def delete_recipe(rcp_code):
    check_admin()
    recipe = Recipe_Master.query.filter_by(rcp_code=rcp_code).first()
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
        
    db.session.delete(recipe)
    db.session.commit()
    log_change('recipe_master', 'DELETE', f"Recipe {rcp_code}", None)
    return jsonify({'success': True})
