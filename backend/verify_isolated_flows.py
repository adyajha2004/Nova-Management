import os
import sys
import unittest
from datetime import datetime

# Add the backend directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, Item_Master, POMAIN, POTRAN, Audit_Log, MPRMAIN, Item_Group

class MRPSystemTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            from seed import seed_database
            seed_database()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_1_credentials_login(self):
        print("\n[VERIFICATION 1] Verifying login API credentials validation...")
        
        # Test valid admin login
        res_admin = self.client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123'
        })
        self.assertEqual(res_admin.status_code, 200)
        data_admin = res_admin.get_json()
        self.assertTrue(data_admin['success'])
        self.assertEqual(data_admin['role'], 'Admin')

        # Test valid viewer login
        res_viewer = self.client.post('/api/auth/login', json={
            'username': 'viewer',
            'password': 'viewer123'
        })
        self.assertEqual(res_viewer.status_code, 200)
        data_viewer = res_viewer.get_json()
        self.assertTrue(data_viewer['success'])
        self.assertEqual(data_viewer['role'], 'Viewer')

        # Test invalid credentials
        res_invalid = self.client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'wrongpassword'
        })
        self.assertEqual(res_invalid.status_code, 401)
        self.assertIn('error', res_invalid.get_json())
        print("-> SUCCESS: Checked login validation and auth boundaries.")

    def test_2_unified_mixed_company_views(self):
        print("\n[VERIFICATION 2] Verifying unified mixed company views...")
        
        res = self.client.get('/api/inventory/items')
        self.assertEqual(res.status_code, 200)
        items = res.get_json()
        
        self.assertGreater(len(items), 0)
        
        nc_represented = False
        nd_represented = False
        
        for item in items:
            if item['comp_id'] == 'NC':
                nc_represented = True
            elif item['comp_id'] == 'ND':
                nd_represented = True
                
        self.assertTrue(nc_represented)
        self.assertTrue(nd_represented)
        print(f"-> SUCCESS: Blended company items returned. Count: {len(items)}")

    def test_3_auto_generation_sequence_locking(self):
        print("\n[VERIFICATION 3] Verifying auto-generation sequence locking on insert...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # We POST to create a RAW item without supplying item_code
        # RAW group starts at last_sequence = 9. Prefix = 'RM'.
        # The auto-generated code must be RM061.
        res_create = self.client.post('/api/inventory/items', json={
            'item_name': 'Isopropyl Alcohol',
            'itg_code': 'R00001',
            'comp_id': 'NC',
            'units': 'LITERS',
            'gst_pr': 18.0,
            'bal_qt': 150.0
        }, headers=headers_admin)
        
        self.assertEqual(res_create.status_code, 201)
        item_data = res_create.get_json()
        self.assertEqual(item_data['item_code'], 'RM061')
        self.assertEqual(item_data['item_name'], 'Isopropyl Alcohol')
        
        # Verify sequence counter updated
        with self.app.app_context():
            group = Item_Group.query.filter_by(itg_code='R00001').first()
            self.assertEqual(group.last_sequence, 61)
            
        print("-> SUCCESS: Verified item_code auto-generated as RM061 under lock.")

    def test_4_end_to_end_mrp_pipeline(self):
        print("\n[VERIFICATION 4] Simulating full recipe scaling & PO receipt on unified system...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # Scale Recipe RD0001 (Blue Indigo Dye - owned by ND) with target yield 1000.0
        # For RM006 (Aniline Feedstock): qty=80, rcp_yield=200.0, target_yield=1000.0 => req_qty = 400.0
        # Balance of RM006 is 15.0. Deficit = 385.0.
        res_scale = self.client.post('/api/recipes/scale', json={
            'rcp_code': 'RD0001',
            'target_yield': 1000.0
        }, headers=headers_admin)
        
        self.assertEqual(res_scale.status_code, 200)
        scale_data = res_scale.get_json()
        self.assertTrue(scale_data['has_deficits'])
        mpr_no = scale_data['mpr_no']
        self.assertEqual(scale_data['comp_id'], 'ND')
        print(f"-> Recipe scaled. Generated MPR No: {mpr_no}")

        # Sourcing PO from bids
        bids = [
            {'item_code': 'RM006', 'party_code': 'P1002', 'qty': 385.0, 'rate': 6.80}
        ]
        res_po = self.client.post('/api/procurement/po/generate', json={
            'mpr_no': mpr_no,
            'bids': bids
        }, headers=headers_admin)
        self.assertEqual(res_po.status_code, 200)
        po_result = res_po.get_json()
        po_no = po_result['generated_pos'][0]
        print(f"-> Generated PO: {po_no}")

        # Receive PO (Inventory Settle Hook)
        res_receive = self.client.put(f'/api/procurement/pos/{po_no}/receive', headers=headers_admin)
        self.assertEqual(res_receive.status_code, 200)
        
        # Verify balance updated: 15.0 + 385.0 = 400.0
        res_item = self.client.get('/api/inventory/items/RM006', headers=headers_admin)
        self.assertEqual(res_item.get_json()['bal_qt'], 400.0)
        print("-> SUCCESS: Stock balance successfully updated on receipt.")

        # Verify audit logs track updates
        res_audit = self.client.get('/api/audit/logs', headers=headers_admin)
        logs = res_audit.get_json()
        balance_log = next((l for l in logs if l['target_table'] == 'item_master' and 'RM006.bal_qt' in l['modified_field']), None)
        self.assertIsNotNone(balance_log)
        self.assertEqual(float(balance_log['old_value_snapshot']), 15.0)
        self.assertEqual(float(balance_log['new_value_snapshot']), 400.0)
        print("-> SUCCESS: Security audit logs recorded snapshots.")

    def test_5_db_administration_endpoints(self):
        print("\n[VERIFICATION 5] Verifying database reset & clear administration endpoints...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        headers_viewer = {
            'X-User-Role': 'Viewer'
        }
        
        # 1. Non-admin should be rejected
        res_seed_nonadmin = self.client.post('/api/admin/db/seed', headers=headers_viewer)
        self.assertEqual(res_seed_nonadmin.status_code, 403)
        
        # 2. Clear Database to Clean Slate (Admin)
        res_clear = self.client.post('/api/admin/db/clear', headers=headers_admin)
        self.assertEqual(res_clear.status_code, 200)
        clear_data = res_clear.get_json()
        self.assertTrue(clear_data['success'])
        self.assertIn('clean slate', clear_data['message'])
        
        # Verify database is empty of items
        res_items = self.client.get('/api/inventory/items')
        self.assertEqual(res_items.status_code, 200)
        self.assertEqual(len(res_items.get_json()), 0)
        
        # Verify groups are still there but sequence is 0
        with self.app.app_context():
            from models import Item_Group
            group = Item_Group.query.filter_by(itg_code='R00001').first()
            self.assertEqual(group.last_sequence, 0)
            
        # 3. Seed Database back to Demo (Admin)
        res_seed = self.client.post('/api/admin/db/seed', headers=headers_admin)
        self.assertEqual(res_seed.status_code, 200)
        seed_data = res_seed.get_json()
        self.assertTrue(seed_data['success'])
        self.assertIn('re-seeded', seed_data['message'])
        
        # Verify items are back
        res_items_after = self.client.get('/api/inventory/items')
        self.assertEqual(res_items_after.status_code, 200)
        self.assertEqual(len(res_items_after.get_json()), 73)
        
        print("-> SUCCESS: Checked admin controls, clean resets, and re-seeding behaviors.")

    def test_6_party_master_crud_and_orders(self):
        print("\n[VERIFICATION 6] Verifying Party Master CRUD operations & orders history safety...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # 1. Create new vendor P1005
        res_create = self.client.post('/api/procurement/vendors', json={
            'party_code': 'P1005',
            'party_name': 'Apex Reagents Corp',
            'payment_terms': 'Net 15',
            'email': 'orders@apexreagents.com'
        }, headers=headers_admin)
        self.assertEqual(res_create.status_code, 201)
        vendor_data = res_create.get_json()
        self.assertEqual(vendor_data['party_code'], 'P1005')
        self.assertEqual(vendor_data['party_name'], 'Apex Reagents Corp')
        
        # 2. Get vendors list and verify presence
        res_list = self.client.get('/api/procurement/vendors')
        self.assertEqual(res_list.status_code, 200)
        vendors = res_list.get_json()
        codes = [v['party_code'] for v in vendors]
        self.assertIn('P1005', codes)
        
        # 3. Update banking details of P1005
        res_update = self.client.put('/api/procurement/vendors/P1005', json={
            'bank_name': 'CitiBank',
            'bank_ac_no': '9988776655'
        }, headers=headers_admin)
        self.assertEqual(res_update.status_code, 200)
        updated_data = res_update.get_json()
        self.assertEqual(updated_data['bank_name'], 'CitiBank')
        
        # 4. Deleting a party referenced by a PO (e.g. P1002 has seeded POs) should fail
        res_delete_fail = self.client.delete('/api/procurement/vendors/P1002', headers=headers_admin)
        self.assertEqual(res_delete_fail.status_code, 400)
        self.assertIn('active purchase orders', res_delete_fail.get_json()['error'])
        
        # 5. Deleting clean party P1005 should succeed
        res_delete_ok = self.client.delete('/api/procurement/vendors/P1005', headers=headers_admin)
        self.assertEqual(res_delete_ok.status_code, 200)
        self.assertTrue(res_delete_ok.get_json()['success'])
        
        print("-> SUCCESS: Checked Party Master CRUD validation and database reference safety.")

    def test_7_party_item_offerings(self):
        print("\n[VERIFICATION 7] Verifying Supplier Item Offerings CRUD API...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        headers_viewer = {
            'X-User-Role': 'Viewer'
        }
        
        # 1. Fetch current offerings for P1004 (should have RM004 and RM008 seeded)
        res_list = self.client.get('/api/procurement/vendors/P1004/items')
        self.assertEqual(res_list.status_code, 200)
        offerings = res_list.get_json()
        self.assertEqual(len(offerings), 2)
        item_codes = [o['item_code'] for o in offerings]
        self.assertIn('RM004', item_codes)
        self.assertIn('RM008', item_codes)
        
        # Check that rates are floats
        rm004_offering = next(o for o in offerings if o['item_code'] == 'RM004')
        self.assertEqual(rm004_offering['last_rate'], 3.00)
        
        # 2. Add a new offering for P1004 (e.g. RM001) as Admin
        res_add = self.client.post('/api/procurement/vendors/P1004/items', json={
            'item_code': 'RM001',
            'last_rate': 1.65
        }, headers=headers_admin)
        self.assertEqual(res_add.status_code, 201)
        added = res_add.get_json()
        self.assertEqual(added['item_code'], 'RM001')
        self.assertEqual(added['last_rate'], 1.65)
        
        # 3. Add a new offering with last_rate empty (None)
        res_add_empty = self.client.post('/api/procurement/vendors/P1004/items', json={
            'item_code': 'RM002',
            'last_rate': ''
        }, headers=headers_admin)
        self.assertEqual(res_add_empty.status_code, 201)
        added_empty = res_add_empty.get_json()
        self.assertEqual(added_empty['item_code'], 'RM002')
        self.assertIsNone(added_empty['last_rate'])
        
        # 4. Attempt to add duplicate offering (should fail)
        res_dup = self.client.post('/api/procurement/vendors/P1004/items', json={
            'item_code': 'RM001',
            'last_rate': 2.00
        }, headers=headers_admin)
        self.assertEqual(res_dup.status_code, 400)
        
        # 5. Non-admin add offering (should fail)
        res_viewer_add = self.client.post('/api/procurement/vendors/P1004/items', json={
            'item_code': 'RM003',
            'last_rate': 0.90
        }, headers=headers_viewer)
        self.assertEqual(res_viewer_add.status_code, 403)
        
        # 6. Update rate for RM001 as Admin
        res_update = self.client.put('/api/procurement/vendors/P1004/items/RM001', json={
            'last_rate': 1.75
        }, headers=headers_admin)
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.get_json()
        self.assertEqual(updated['last_rate'], 1.75)
        
        # 7. Update rate to empty as Admin
        res_update_empty = self.client.put('/api/procurement/vendors/P1004/items/RM001', json={
            'last_rate': ''
        }, headers=headers_admin)
        self.assertEqual(res_update_empty.status_code, 200)
        updated_empty = res_update_empty.get_json()
        self.assertIsNone(updated_empty['last_rate'])
        
        # 8. Delete offering as Admin
        res_delete = self.client.delete('/api/procurement/vendors/P1004/items/RM001', headers=headers_admin)
        self.assertEqual(res_delete.status_code, 200)
        self.assertTrue(res_delete.get_json()['success'])
        
        # Verify it is gone
        res_list_after = self.client.get('/api/procurement/vendors/P1004/items')
        offerings_after = res_list_after.get_json()
        self.assertNotIn('RM001', [o['item_code'] for o in offerings_after])
        
        print("-> SUCCESS: Verified Supplier Item Offerings CRUD validation & empty rate logic.")

    def test_8_item_master_vendor_offerings(self):
        print("\n[VERIFICATION 8] Verifying Item Master Vendor Offerings API & Staged Creation...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        headers_viewer = {
            'X-User-Role': 'Viewer'
        }
        
        # 1. Fetch current vendors offering RM004 (should have P1001 and P1004 seeded)
        res_list = self.client.get('/api/inventory/items/RM004/vendors')
        self.assertEqual(res_list.status_code, 200)
        vendors = res_list.get_json()
        self.assertEqual(len(vendors), 2)
        party_codes = [v['party_code'] for v in vendors]
        self.assertIn('P1001', party_codes)
        self.assertIn('P1004', party_codes)
        
        # Check details returned
        p1001_vendor = next(v for v in vendors if v['party_code'] == 'P1001')
        self.assertEqual(p1001_vendor['party_name'], 'Apex Chemical Corp')
        self.assertEqual(p1001_vendor['last_rate'], 3.10)
        
        # 2. Add offering as Admin
        res_add = self.client.post('/api/inventory/items/RM004/vendors', json={
            'party_code': 'P1002',
            'last_rate': 2.95
        }, headers=headers_admin)
        self.assertEqual(res_add.status_code, 201)
        added = res_add.get_json()
        self.assertEqual(added['party_code'], 'P1002')
        self.assertEqual(added['last_rate'], 2.95)
        
        # 3. Update offering rate as Admin
        res_update = self.client.put('/api/inventory/items/RM004/vendors/P1002', json={
            'last_rate': 2.85
        }, headers=headers_admin)
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.get_json()
        self.assertEqual(updated['last_rate'], 2.85)
        
        # 4. Delete offering as Admin
        res_delete = self.client.delete('/api/inventory/items/RM004/vendors/P1002', headers=headers_admin)
        self.assertEqual(res_delete.status_code, 200)
        self.assertTrue(res_delete.get_json()['success'])
        
        # Verify it is gone
        res_list_after = self.client.get('/api/inventory/items/RM004/vendors')
        vendors_after = res_list_after.get_json()
        self.assertNotIn('P1002', [v['party_code'] for v in vendors_after])
        
        # 5. Create new item with initial staged offerings
        res_create = self.client.post('/api/inventory/items', json={
            'item_name': 'Test Staged Item',
            'itg_code': 'R00001',
            'comp_id': 'NC',
            'units': 'LITERS',
            'gst_pr': 18.0,
            'bal_qt': 100.0,
            'offerings': [
                {'party_code': 'P1001', 'last_rate': 4.15},
                {'party_code': 'P1004', 'last_rate': ''}
            ]
        }, headers=headers_admin)
        self.assertEqual(res_create.status_code, 201)
        new_item = res_create.get_json()
        new_code = new_item['item_code']
        
        # Fetch offerings for the new item
        res_list_new = self.client.get(f'/api/inventory/items/{new_code}/vendors')
        self.assertEqual(res_list_new.status_code, 200)
        new_offerings = res_list_new.get_json()
        self.assertEqual(len(new_offerings), 2)
        
        p1001_new = next(o for o in new_offerings if o['party_code'] == 'P1001')
        self.assertEqual(p1001_new['last_rate'], 4.15)
        
        p1004_new = next(o for o in new_offerings if o['party_code'] == 'P1004')
        self.assertIsNone(p1004_new['last_rate'])
        
        print("-> SUCCESS: Verified Item Master Vendor Offerings & batch staged creation.")

    def test_9_recipe_details_and_sorting(self):
        print("\n[VERIFICATION 9] Verifying Recipe Details Retrieval & MPR/PO Descending Sorting...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # 1. Verify Recipe Details Retrieval
        res_recipe = self.client.get('/api/recipes/RD0001', headers=headers_admin)
        self.assertEqual(res_recipe.status_code, 200)
        recipe_data = res_recipe.get_json()
        self.assertEqual(recipe_data['rcp_code'], 'RD0001')
        self.assertEqual(recipe_data['rcp_name'], 'Blue Indigo Dye Synthesis')
        self.assertEqual(len(recipe_data['ingredients']), 3)
        
        # Verify specific ingredient details are returned
        ing_codes = [ing['item_code'] for ing in recipe_data['ingredients']]
        self.assertIn('RM005', ing_codes)
        self.assertIn('RM006', ing_codes)
        self.assertIn('RM007', ing_codes)
        print("-> SUCCESS: Recipe details and ingredients successfully retrieved.")

        # 2. Verify sorting of MPRs (descending by mpr_no)
        # Create a few more MPRs to verify descending order
        # Seed already has some MPRs, let's create two more
        res_scale1 = self.client.post('/api/recipes/scale', json={
            'rcp_code': 'RD0001',
            'target_yield': 1000.0
        }, headers=headers_admin)
        self.assertEqual(res_scale1.status_code, 200)
        mpr_no1 = res_scale1.get_json()['mpr_no']

        import time
        time.sleep(1.1)

        res_scale2 = self.client.post('/api/recipes/scale', json={
            'rcp_code': 'RD0001',
            'target_yield': 1200.0
        }, headers=headers_admin)
        self.assertEqual(res_scale2.status_code, 200)
        mpr_no2 = res_scale2.get_json()['mpr_no']
        
        # Fetch MPRs and assert descending sorting
        res_mprs = self.client.get('/api/procurement/mprs', headers=headers_admin)
        self.assertEqual(res_mprs.status_code, 200)
        mprs_list = res_mprs.get_json()
        mpr_nos = [m['mpr_no'] for m in mprs_list]
        
        # Verify list is sorted descending
        self.assertEqual(mpr_nos, sorted(mpr_nos, reverse=True))
        self.assertIn(mpr_no1, mpr_nos)
        self.assertIn(mpr_no2, mpr_nos)
        print("-> SUCCESS: MPR list sorted descending correctly.")

        # 3. Verify sorting of POs (descending by po_no)
        # Fetch POs and assert descending sorting
        res_pos = self.client.get('/api/procurement/pos', headers=headers_admin)
        self.assertEqual(res_pos.status_code, 200)
        pos_list = res_pos.get_json()
        po_nos = [p['po_no'] for p in pos_list]
        
        self.assertEqual(po_nos, sorted(po_nos, reverse=True))
        print("-> SUCCESS: PO list sorted descending correctly.")

    def test_10_bulk_items_excel_mode(self):
        print("\n[VERIFICATION 10] Verifying Bulk Item Master Updates (Excel Spreadsheet Mode)...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # We will attempt to perform creations, updates, and deletes in a single bulk request:
        # - Create: a new item under group R00001 (should get code RM061 since 9 items exist in group R00001)
        # - Update: item RM001 (Benzene) -> change units to 'LITERS' and balance to 500.0
        # - Delete: item FG004 (which is seeded and not used in any PO or recipe)
        res_bulk = self.client.post('/api/inventory/items/bulk', json={
            'creates': [
                {
                    'item_name': 'Bulk Seeded Solvent',
                    'itg_code': 'R00001',
                    'comp_id': 'NC',
                    'units': 'LITERS',
                    'gst_pr': 18.0,
                    'bal_qt': 100.0
                }
            ],
            'updates': [
                {
                    'item_code': 'RM001',
                    'item_name': 'Benzene Premium',
                    'itg_code': 'R00001',
                    'comp_id': 'NC',
                    'units': 'LITERS',
                    'gst_pr': 18.0,
                    'bal_qt': 500.0,
                    'min_qt': 10.0,
                    'ror_qt': 20.0,
                    'lead_time': 3,
                    'last_rate': 2.50,
                    'is_lic': False,
                    'is_imp': False
                }
            ],
            'deletes': ['FG004']
        }, headers=headers_admin)
        
        self.assertEqual(res_bulk.status_code, 200)
        data = res_bulk.get_json()
        self.assertTrue(data['success'])
        
        # Verify created item exists (it should have code RM061)
        res_new = self.client.get('/api/inventory/items/RM061', headers=headers_admin)
        self.assertEqual(res_new.status_code, 200)
        self.assertEqual(res_new.get_json()['item_name'], 'Bulk Seeded Solvent')
        
        # Verify updated item exists and contains updated values
        res_upd = self.client.get('/api/inventory/items/RM001', headers=headers_admin)
        self.assertEqual(res_upd.status_code, 200)
        upd_data = res_upd.get_json()
        self.assertEqual(upd_data['item_name'], 'Benzene Premium')
        self.assertEqual(upd_data['units'], 'LITERS')
        self.assertEqual(upd_data['bal_qt'], 500.0)
        
        # Verify deleted item is gone
        res_del = self.client.get('/api/inventory/items/FG004', headers=headers_admin)
        self.assertEqual(res_del.status_code, 404)
        
        # Verify that attempting to delete an item used in recipe/PO (e.g. RM005) fails and rolls back
        res_fail = self.client.post('/api/inventory/items/bulk', json={
            'deletes': ['RM005']
        }, headers=headers_admin)
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('referenced in recipes', res_fail.get_json()['error'])
        
        print("-> SUCCESS: Bulk update api successfully handles updates, deletions, and autogeneration.")

    def test_11_bulk_groups_excel_mode(self):
        print("\n[VERIFICATION 11] Verifying Bulk Item Group Updates (Group Excel Spreadsheet)...")
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # Test creation of a new group, updating packaging/names of existing group P00001 (from seed), and deleting group CAT (seeded but empty)
        res_bulk = self.client.post('/api/inventory/groups/bulk', json={
            'creates': [
                {
                    'itg_code': 'NEWGP',
                    'itg_name': 'New Bulk Group',
                    'itg_cgkey': 'NE',
                    'prefix': 'NW',
                    'last_sequence': 0
                }
            ],
            'updates': [
                {
                    'itg_code': 'P00001',
                    'itg_name': 'Updated Packaging Group',
                    'itg_cgkey': 'PK',
                    'prefix': 'PA',
                    'last_sequence': 5
                }
            ],
            'deletes': ['A00001']
        }, headers=headers_admin)
        
        self.assertEqual(res_bulk.status_code, 200)
        data = res_bulk.get_json()
        self.assertTrue(data['success'])
        
        # Verify created group exists
        res_group_new = self.client.get('/api/inventory/groups')
        groups = res_group_new.get_json()
        newg = next(g for g in groups if g['itg_code'] == 'NEWGP')
        self.assertEqual(newg['itg_name'], 'New Bulk Group')
        
        # Verify updated group details
        updg = next(g for g in groups if g['itg_code'] == 'P00001')
        self.assertEqual(updg['itg_name'], 'Updated Packaging Group')
        self.assertEqual(updg['last_sequence'], 5)
        
        # Verify deleted group is gone
        self.assertFalse(any(g['itg_code'] == 'A00001' for g in groups))
        
        # Verify that attempting to delete group R00001 (contains items RM001-RM009) fails and rolls back
        res_fail = self.client.post('/api/inventory/groups/bulk', json={
            'deletes': ['R00001']
        }, headers=headers_admin)
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('contains', res_fail.get_json()['error'])
        print("-> SUCCESS: Bulk group operations and checks verified successfully.")

    def test_12_bulk_vendors_excel_mode(self):
        print("\n[VERIFICATION 12] Verifying Bulk Vendor/Party Updates (Party Excel Spreadsheet)...")
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # Let's seed an empty vendor that we can delete
        res_create_del = self.client.post('/api/procurement/vendors', json={
            'party_code': 'TMPVD',
            'party_name': 'Temp Delete Vendor'
        }, headers=headers_admin)
        self.assertEqual(res_create_del.status_code, 201)
        
        # Test bulk creates, updates, and deletes
        res_bulk = self.client.post('/api/procurement/vendors/bulk', json={
            'creates': [
                {
                    'party_code': 'NEWVD',
                    'party_name': 'New Bulk Vendor',
                    'email': 'newbulk@example.com',
                    'phone_no': '9876543210'
                }
            ],
            'updates': [
                {
                    'party_code': 'P1002',
                    'party_name': 'Updated Solvents Supplier',
                    'email': 'updated@example.com',
                    'payment_terms': 'Net 60'
                }
            ],
            'deletes': ['TMPVD']
        }, headers=headers_admin)
        
        self.assertEqual(res_bulk.status_code, 200)
        data = res_bulk.get_json()
        self.assertTrue(data['success'])
        
        # Verify created vendor
        res_vends = self.client.get('/api/procurement/vendors')
        vendors = res_vends.get_json()
        
        newv = next(v for v in vendors if v['party_code'] == 'NEWVD')
        self.assertEqual(newv['party_name'], 'New Bulk Vendor')
        self.assertEqual(newv['email'], 'newbulk@example.com')
        
        # Verify updated vendor
        updv = next(v for v in vendors if v['party_code'] == 'P1002')
        self.assertEqual(updv['party_name'], 'Updated Solvents Supplier')
        self.assertEqual(updv['payment_terms'], 'Net 60')
        
        # Verify deleted vendor is gone
        self.assertFalse(any(v['party_code'] == 'TMPVD' for v in vendors))
        
        # Verify that attempting to delete vendor P1001 (referenced in seeded purchase orders) fails and rolls back
        res_fail = self.client.post('/api/procurement/vendors/bulk', json={
            'deletes': ['P1001']
        # 3. Verify sorting of POs (descending by po_no)
        # Fetch POs and assert descending sorting
        res_pos = self.client.get('/api/procurement/pos', headers=headers_admin)
        self.assertEqual(res_pos.status_code, 200)
        pos_list = res_pos.get_json()
        po_nos = [p['po_no'] for p in pos_list]
        
        self.assertEqual(po_nos, sorted(po_nos, reverse=True))
        print("-> SUCCESS: PO list sorted descending correctly.")

    def test_10_bulk_items_excel_mode(self):
        print("\n[VERIFICATION 10] Verifying Bulk Item Master Updates (Excel Spreadsheet Mode)...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # We will attempt to perform creations, updates, and deletes in a single bulk request:
        # - Create: a new item under group R00001 (should get code RM061 since 9 items exist in group R00001)
        # - Update: item RM001 (Benzene) -> change units to 'LITERS' and balance to 500.0
        # - Delete: item FG004 (which is seeded and not used in any PO or recipe)
        res_bulk = self.client.post('/api/inventory/items/bulk', json={
            'creates': [
                {
                    'item_name': 'Bulk Seeded Solvent',
                    'itg_code': 'R00001',
                    'comp_id': 'NC',
                    'units': 'LITERS',
                    'gst_pr': 18.0,
                    'bal_qt': 100.0
                }
            ],
            'updates': [
                {
                    'item_code': 'RM001',
                    'item_name': 'Benzene Premium',
                    'itg_code': 'R00001',
                    'comp_id': 'NC',
                    'units': 'LITERS',
                    'gst_pr': 18.0,
                    'bal_qt': 500.0,
                    'min_qt': 10.0,
                    'ror_qt': 20.0,
                    'lead_time': 3,
                    'last_rate': 2.50,
                    'is_lic': False,
                    'is_imp': False
                }
            ],
            'deletes': ['FG004']
        }, headers=headers_admin)
        
        self.assertEqual(res_bulk.status_code, 200)
        data = res_bulk.get_json()
        self.assertTrue(data['success'])
        
        # Verify created item exists (it should have code RM061)
        res_new = self.client.get('/api/inventory/items/RM061', headers=headers_admin)
        self.assertEqual(res_new.status_code, 200)
        self.assertEqual(res_new.get_json()['item_name'], 'Bulk Seeded Solvent')
        
        # Verify updated item exists and contains updated values
        res_upd = self.client.get('/api/inventory/items/RM001', headers=headers_admin)
        self.assertEqual(res_upd.status_code, 200)
        upd_data = res_upd.get_json()
        self.assertEqual(upd_data['item_name'], 'Benzene Premium')
        self.assertEqual(upd_data['units'], 'LITERS')
        self.assertEqual(upd_data['bal_qt'], 500.0)
        
        # Verify deleted item is gone
        res_del = self.client.get('/api/inventory/items/FG004', headers=headers_admin)
        self.assertEqual(res_del.status_code, 404)
        
        # Verify that attempting to delete an item used in recipe/PO (e.g. RM005) fails and rolls back
        res_fail = self.client.post('/api/inventory/items/bulk', json={
            'deletes': ['RM005']
        }, headers=headers_admin)
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('referenced in recipes', res_fail.get_json()['error'])
        
        print("-> SUCCESS: Bulk update api successfully handles updates, deletions, and autogeneration.")

    def test_11_bulk_groups_excel_mode(self):
        print("\n[VERIFICATION 11] Verifying Bulk Item Group Updates (Group Excel Spreadsheet)...")
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # Test creation of a new group, updating packaging/names of existing group P00001 (from seed), and deleting group CAT (seeded but empty)
        res_bulk = self.client.post('/api/inventory/groups/bulk', json={
            'creates': [
                {
                    'itg_code': 'NEWGP',
                    'itg_name': 'New Bulk Group',
                    'itg_cgkey': 'NE',
                    'prefix': 'NW',
                    'last_sequence': 0
                }
            ],
            'updates': [
                {
                    'itg_code': 'P00001',
                    'itg_name': 'Updated Packaging Group',
                    'itg_cgkey': 'PK',
                    'prefix': 'PA',
                    'last_sequence': 5
                }
            ],
            'deletes': ['A00001']
        }, headers=headers_admin)
        
        self.assertEqual(res_bulk.status_code, 200)
        data = res_bulk.get_json()
        self.assertTrue(data['success'])
        
        # Verify created group exists
        res_group_new = self.client.get('/api/inventory/groups')
        groups = res_group_new.get_json()
        newg = next(g for g in groups if g['itg_code'] == 'NEWGP')
        self.assertEqual(newg['itg_name'], 'New Bulk Group')
        
        # Verify updated group details
        updg = next(g for g in groups if g['itg_code'] == 'P00001')
        self.assertEqual(updg['itg_name'], 'Updated Packaging Group')
        self.assertEqual(updg['last_sequence'], 5)
        
        # Verify deleted group is gone
        self.assertFalse(any(g['itg_code'] == 'A00001' for g in groups))
        
        # Verify that attempting to delete group R00001 (contains items RM001-RM009) fails and rolls back
        res_fail = self.client.post('/api/inventory/groups/bulk', json={
            'deletes': ['R00001']
        }, headers=headers_admin)
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('contains', res_fail.get_json()['error'])
        print("-> SUCCESS: Bulk group operations and checks verified successfully.")

    def test_12_bulk_vendors_excel_mode(self):
        print("\n[VERIFICATION 12] Verifying Bulk Vendor/Party Updates (Party Excel Spreadsheet)...")
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # Let's seed an empty vendor that we can delete
        res_create_del = self.client.post('/api/procurement/vendors', json={
            'party_code': 'TMPVD',
            'party_name': 'Temp Delete Vendor'
        }, headers=headers_admin)
        self.assertEqual(res_create_del.status_code, 201)
        
        # Test bulk creates, updates, and deletes
        res_bulk = self.client.post('/api/procurement/vendors/bulk', json={
            'creates': [
                {
                    'party_code': 'NEWVD',
                    'party_name': 'New Bulk Vendor',
                    'email': 'newbulk@example.com',
                    'phone_no': '9876543210'
                }
            ],
            'updates': [
                {
                    'party_code': 'P1002',
                    'party_name': 'Updated Solvents Supplier',
                    'email': 'updated@example.com',
                    'payment_terms': 'Net 60'
                }
            ],
            'deletes': ['TMPVD']
        }, headers=headers_admin)
        
        self.assertEqual(res_bulk.status_code, 200)
        data = res_bulk.get_json()
        self.assertTrue(data['success'])
        
        # Verify created vendor
        res_vends = self.client.get('/api/procurement/vendors')
        vendors = res_vends.get_json()
        
        newv = next(v for v in vendors if v['party_code'] == 'NEWVD')
        self.assertEqual(newv['party_name'], 'New Bulk Vendor')
        self.assertEqual(newv['email'], 'newbulk@example.com')
        
        # Verify updated vendor
        updv = next(v for v in vendors if v['party_code'] == 'P1002')
        self.assertEqual(updv['party_name'], 'Updated Solvents Supplier')
        self.assertEqual(updv['payment_terms'], 'Net 60')
        
        # Verify deleted vendor is gone
        self.assertFalse(any(v['party_code'] == 'TMPVD' for v in vendors))
        
        # Verify that attempting to delete vendor P1001 (referenced in seeded purchase orders) fails and rolls back
        res_fail = self.client.post('/api/procurement/vendors/bulk', json={
            'deletes': ['P1001']
        }, headers=headers_admin)
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('active purchase orders', res_fail.get_json()['error'])
        print("-> SUCCESS: Bulk vendor operations and constraint checks verified successfully.")

    def test_13_company_endpoints(self):
        print("\n[VERIFICATION 13] Verifying Company Profile API endpoints...")
        
        headers_admin = {
            'X-User-Role': 'Admin'
        }
        
        # 1. Fetch companies
        res = self.client.get('/api/companies')
        self.assertEqual(res.status_code, 200)
        companies = res.get_json()
        self.assertEqual(len(companies), 2)
        
        nc = next(c for c in companies if c['comp_id'] == 'NC')
        self.assertEqual(nc['comp_name'], 'Nova Chem Solutions')
        
        # 2. Update company NC (Admin)
        res_update = self.client.put('/api/companies/NC', json={
            'comp_name': 'Nova Chem Solutions (Updated)',
            'address': 'New Address Sector 5',
            'gstno': '24AAACN9073B1ZQ',
            'panno': 'AAACN9073B'
        }, headers=headers_admin)
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.get_json()
        self.assertEqual(updated['comp_name'], 'Nova Chem Solutions (Updated)')
        self.assertEqual(updated['address'], 'New Address Sector 5')
        self.assertEqual(updated['gstno'], '24AAACN9073B1ZQ')
        self.assertEqual(updated['panno'], 'AAACN9073B')
        
        # 3. Verify it is persisted
        res_after = self.client.get('/api/companies')
        companies_after = res_after.get_json()
        nc_after = next(c for c in companies_after if c['comp_id'] == 'NC')
        self.assertEqual(nc_after['comp_name'], 'Nova Chem Solutions (Updated)')
        self.assertEqual(nc_after['gstno'], '24AAACN9073B1ZQ')
        
        # 4. Verify viewer cannot update
        res_viewer = self.client.put('/api/companies/NC', json={
            'comp_name': 'Nova Chem Solutions (Malicious)'
        }, headers={'X-User-Role': 'Viewer'})
        self.assertEqual(res_viewer.status_code, 403)
        
        print("-> SUCCESS: Checked company retrieval, permission protection, and updates.")


if __name__ == '__main__':
    unittest.main()
