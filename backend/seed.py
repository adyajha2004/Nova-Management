import os
from datetime import datetime, date, timedelta
from app import create_app
from models import db, Company, Item_Group, Item_Master, Party_Master, Party_Item, Recipe_Master, Recipe_Tran, MPRMAIN, MPRTRAN, POMAIN, POTRAN, Audit_Log

def seed_database():
   print("Seeding database with unified rich datasets and sequence prefix schema...")
   
   # 1. Companies
   comp_nc = Company(
       comp_id='NC', 
       comp_name='Nova Chem Solutions',
       address='100 Chemical Blvd, Sector 4, Ind. Area',
       email='contact@novachem.com',
       phone='+1-555-0192',
       license_no='LIC-NC-2026-9901'
   )
   comp_nd = Company(
       comp_id='ND',
       comp_name='Nova Dye & Colorants',
       address='202 Textile park, Sector 9, Ind. Area',
       email='info@novadye.com',
       phone='+1-555-0195',
       license_no='LIC-ND-2026-7788'
   )
   db.session.merge(comp_nc)
   db.session.merge(comp_nd)
   
   # 2. Item Groups
   g_raw = Item_Group(itg_code='R00001', itg_name='Raw Materials', itg_cgkey='RM', prefix='RM', last_sequence=60)
   g_fin = Item_Group(itg_code='F00001', itg_name='Finished Goods', itg_cgkey='FG', prefix='FG', last_sequence=4)
   g_pkg = Item_Group(itg_code='P00001', itg_name='Packaging Materials', itg_cgkey='PM', prefix='PM', last_sequence=1)
   db.session.merge(g_raw)
   db.session.merge(g_fin)
   db.session.merge(g_pkg)
   
   db.session.commit()

   # 3. Item Master with prefix codes (including clear DEMO items)
   items = [
       # NC items
       Item_Master(
           item_code='RM001', item_name='Benzene', itg_code='R00001', comp_id='NC',
           units='LITERS', gst_pr=18.0, itc_comp='ITC001', packing='200L Drum',
           bal_qt=500.00, opn_qt=500.00, inw_qt=0.0, out_qt=0.0, ror_qt=200.0, min_qt=100.0,
           last_rate=1.50, liss_date=date(2026, 6, 1), lrec_date=date(2026, 6, 1),
           lead_time=5, is_lic=False, is_imp=False, pack_qty=200.0
       ),
       Item_Master(
           item_code='RM002', item_name='Sulfuric Acid', itg_code='R00001', comp_id='NC',
           units='LITERS', gst_pr=18.0, itc_comp='ITC002', packing='200L Drum',
           bal_qt=300.00, opn_qt=300.00, inw_qt=0.0, out_qt=0.0, ror_qt=150.0, min_qt=100.0,
           last_rate=2.20, liss_date=date(2026, 6, 2), lrec_date=date(2026, 6, 2),
           lead_time=7, is_lic=True, is_imp=False, pack_qty=200.0
       ),
       Item_Master(
           item_code='RM003', item_name='Sodium Hydroxide', itg_code='R00001', comp_id='NC',
           units='KG', gst_pr=12.0, itc_comp='ITC003', packing='50KG Bag',
           bal_qt=20.00, opn_qt=20.00, inw_qt=0.0, out_qt=0.0, ror_qt=200.0, min_qt=150.0,
           last_rate=0.85, liss_date=date(2026, 6, 3), lrec_date=date(2026, 6, 3),
           lead_time=3, is_lic=False, is_imp=False, pack_qty=50.0
       ),
       Item_Master(
           item_code='RM004', item_name='Chlorobenzene', itg_code='R00001', comp_id='NC',
           units='LITERS', gst_pr=18.0, itc_comp='ITC004', packing='200L Drum',
           bal_qt=10.00, opn_qt=10.00, inw_qt=0.0, out_qt=0.0, ror_qt=100.0, min_qt=100.0,
           last_rate=3.10, liss_date=date(2026, 6, 4), lrec_date=date(2026, 6, 4),
           lead_time=10, is_lic=False, is_imp=True, pack_qty=200.0
       ),
       Item_Master(
           item_code='RM008', item_name='DEMO Raw Material Alpha', itg_code='R00001', comp_id='NC',
           units='KG', gst_pr=18.0, itc_comp='ITDEMO1', packing='50KG Bag',
           bal_qt=5.00, opn_qt=5.00, inw_qt=0.0, out_qt=0.0, ror_qt=150.0, min_qt=100.0,  # Deficit item!
           last_rate=4.50, liss_date=date(2026, 6, 10), lrec_date=date(2026, 6, 10),
           lead_time=4, is_lic=False, is_imp=False, pack_qty=50.0
       ),
       Item_Master(
           item_code='FG001', item_name='Nitrobenzene', itg_code='F00001', comp_id='NC',
           units='KG', gst_pr=18.0, itc_comp='ITC501', packing='Tanker',
           bal_qt=120.00, opn_qt=100.00, inw_qt=20.0, out_qt=0.0, ror_qt=0.0, min_qt=0.0,
           last_rate=5.50, liss_date=None, lrec_date=None,
           lead_time=0, is_lic=False, is_imp=False, pack_qty=1.0
       ),
       Item_Master(
           item_code='FG002', item_name='Aniline (Pure)', itg_code='F00001', comp_id='NC',
           units='KG', gst_pr=18.0, itc_comp='ITC502', packing='Tanker',
           bal_qt=50.00, opn_qt=50.00, inw_qt=0.0, out_qt=0.0, ror_qt=0.0, min_qt=0.0,
           last_rate=7.20, liss_date=None, lrec_date=None,
           lead_time=0, is_lic=False, is_imp=False, pack_qty=1.0
       ),

       # ND items
       Item_Master(
           item_code='RM005', item_name='Indigo Dye Base', itg_code='R00001', comp_id='ND',
           units='KG', gst_pr=12.0, itc_comp='ITD001', packing='25KG Box',
           bal_qt=400.00, opn_qt=400.00, inw_qt=0.0, out_qt=0.0, ror_qt=100.0, min_qt=50.0,
           last_rate=4.50, liss_date=date(2026, 6, 5), lrec_date=date(2026, 6, 5),
           lead_time=4, is_lic=False, is_imp=False, pack_qty=25.0
       ),
       Item_Master(
           item_code='RM006', item_name='Aniline Feedstock', itg_code='R00001', comp_id='ND',
           units='LITERS', gst_pr=18.0, itc_comp='ITD002', packing='200L Drum',
           bal_qt=15.00, opn_qt=15.00, inw_qt=0.0, out_qt=0.0, ror_qt=200.0, min_qt=200.0,  # Deficit item!
           last_rate=6.80, liss_date=date(2026, 6, 6), lrec_date=date(2026, 6, 6),
           lead_time=8, is_lic=False, is_imp=False, pack_qty=200.0
       ),
       Item_Master(
           item_code='RM007', item_name='Formaldehyde', itg_code='R00001', comp_id='ND',
           units='LITERS', gst_pr=18.0, itc_comp='ITD003', packing='200L Drum',
           bal_qt=100.00, opn_qt=100.00, inw_qt=0.0, out_qt=0.0, ror_qt=100.0, min_qt=50.0,
           last_rate=1.90, liss_date=date(2026, 6, 7), lrec_date=date(2026, 6, 7),
           lead_time=6, is_lic=True, is_imp=False, pack_qty=200.0
       ),
       Item_Master(
           item_code='RM009', item_name='DEMO Raw Material Beta', itg_code='R00001', comp_id='ND',
           units='LITERS', gst_pr=18.0, itc_comp='ITDEMO2', packing='200L Drum',
           bal_qt=12.00, opn_qt=12.00, inw_qt=0.0, out_qt=0.0, ror_qt=250.0, min_qt=250.0,  # Deficit item!
           last_rate=7.00, liss_date=date(2026, 6, 11), lrec_date=date(2026, 6, 11),
           lead_time=5, is_lic=False, is_imp=False, pack_qty=200.0
       ),
       Item_Master(
           item_code='FG003', item_name='Blue Indigo Dye #5', itg_code='F00001', comp_id='ND',
           units='KG', gst_pr=18.0, itc_comp='ITD501', packing='25KG Box',
           bal_qt=20.00, opn_qt=20.00, inw_qt=0.0, out_qt=0.0, ror_qt=0.0, min_qt=0.0,
           last_rate=12.50, liss_date=None, lrec_date=None,
           lead_time=0, is_lic=False, is_imp=False, pack_qty=25.0
       ),
       Item_Master(
           item_code='FG004', item_name='DEMO Finished Compound X', itg_code='F00001', comp_id='NC',
           units='KG', gst_pr=18.0, itc_comp='ITDEMO3', packing='Bulk',
           bal_qt=0.00, opn_qt=0.00, inw_qt=0.0, out_qt=0.0, ror_qt=0.0, min_qt=0.0,
           last_rate=18.20, liss_date=None, lrec_date=None,
           lead_time=0, is_lic=False, is_imp=False, pack_qty=1.0
       )
   ]
   for itm in items:
       db.session.merge(itm)
   db.session.commit()

   # 4. Party Master (Vendors)
   parties = [
       Party_Master(
           party_code='P1001', party_name='Apex Chemical Corp',
           address_1='500 industrial Parkway', address_2='Suite A', address_3='Houston, TX',
           phone_no='+1-800-555-8123', contact_person='Sarah Connor', email='sales@apexchem.com',
           bank_name='Chase Bank', bank_ac_no='110022334455', bank_ifsc='CHASUS33XXX', bank_branch='Downtown Houston',
           payment_terms='Net 30'
       ),
       Party_Master(
           party_code='P1002', party_name='Global Logistics & Solvents',
           address_1='72 Supply Chain Ave', address_2='Dock 4', address_3='Rotterdam, NL',
           phone_no='+31-20-555-1234', contact_person='Hans Gruber', email='info@globalsolvents.com',
           bank_name='ING Bank', bank_ac_no='NL99INGB0102030405', bank_ifsc='INGBNL2AXXX', bank_branch='Rotterdam Port',
           payment_terms='Net 45, 2% discount if paid in 10 days'
       ),
       Party_Master(
           party_code='P1003', party_name='Zenith Packaging Ltd',
           address_1='15 Cardboard Way', address_2='Industrial Zone 3', address_3='Mumbai, IN',
           phone_no='+91-22-555-6677', contact_person='Raj Patel', email='bids@zenithpack.com',
           bank_name='State Bank of India', bank_ac_no='300400500600', bank_ifsc='SBIN0001234', bank_branch='Kurla West, Mumbai',
           payment_terms='Cash on Delivery (COD)'
       ),
       Party_Master(
           party_code='P1004', party_name='Prime Reagents Inc',
           address_1='88 Science Park Dr', address_2='Building 4B', address_3='Boston, MA',
           phone_no='+1-617-555-0987', contact_person='Dr. Alan Grant', email='orders@primereagents.com',
           bank_name='Bank of America', bank_ac_no='998877665544', bank_ifsc='BOFAUS3NXXX', bank_branch='Cambridge MIT',
           payment_terms='Net 15'
       )
   ]
   for pty in parties:
       db.session.merge(pty)
   db.session.commit()

   # 5. Recipes and Recipe Transactions
   # Recipe 1: Nitrobenzene Production
   rcp1 = Recipe_Master(rcp_code='RC0001', rcp_name='Nitrobenzene Production', rcp_yield=100.00, comp_id='NC')
   db.session.merge(rcp1)
   
   rt1_1 = Recipe_Tran(rcp_code='RC0001', item_code='RM001', item_name='Benzene', item_qty=80.00)
   rt1_2 = Recipe_Tran(rcp_code='RC0001', item_code='RM002', item_name='Sulfuric Acid', item_qty=40.00)
   rt1_3 = Recipe_Tran(rcp_code='RC0001', item_code='RM003', item_name='Sodium Hydroxide', item_qty=10.00)
   db.session.merge(rt1_1)
   db.session.merge(rt1_2)
   db.session.merge(rt1_3)

   # Recipe 2: Aniline Production
   rcp2 = Recipe_Master(rcp_code='RC0002', rcp_name='Aniline Synthesis', rcp_yield=50.00, comp_id='NC')
   db.session.merge(rcp2)
   
   rt2_1 = Recipe_Tran(rcp_code='RC0002', item_code='RM004', item_name='Chlorobenzene', item_qty=45.00)
   rt2_2 = Recipe_Tran(rcp_code='RC0002', item_code='RM003', item_name='Sodium Hydroxide', item_qty=15.00)
   db.session.merge(rt2_1)
   db.session.merge(rt2_2)

   # Recipe 3: Blue Indigo Dye
   rcp3 = Recipe_Master(rcp_code='RD0001', rcp_name='Blue Indigo Dye Synthesis', rcp_yield=200.00, comp_id='ND')
   db.session.merge(rcp3)
   
   rt3_1 = Recipe_Tran(rcp_code='RD0001', item_code='RM005', item_name='Indigo Dye Base', item_qty=150.00)
   rt3_2 = Recipe_Tran(rcp_code='RD0001', item_code='RM006', item_name='Aniline Feedstock', item_qty=80.00)
   rt3_3 = Recipe_Tran(rcp_code='RD0001', item_code='RM007', item_name='Formaldehyde', item_qty=20.00)
   db.session.merge(rt3_1)
   db.session.merge(rt3_2)
   db.session.merge(rt3_3)

   # Recipe 4: DEMO Recipe
   rcp4 = Recipe_Master(rcp_code='RC0003', rcp_name='DEMO Production Recipe X', rcp_yield=50.00, comp_id='NC')
   db.session.merge(rcp4)
   
   rt4_1 = Recipe_Tran(rcp_code='RC0003', item_code='RM008', item_name='DEMO Raw Material Alpha', item_qty=25.00)
   rt4_2 = Recipe_Tran(rcp_code='RC0003', item_code='RM003', item_name='Sodium Hydroxide', item_qty=10.00)
   db.session.merge(rt4_1)
   db.session.merge(rt4_2)

   db.session.commit()

   # 6. Pre-existing Mock MPRs (Historical Sourcing Cases)
   mpr1 = MPRMAIN(mpr_no='MPR881023', mpr_date=date(2026, 6, 20), comp_id='NC', status='ORDERED')
   mpr2 = MPRMAIN(mpr_no='MPR991045', mpr_date=date(2026, 6, 24), comp_id='ND', status='STAGED')
   mpr3 = MPRMAIN(mpr_no='MPR111222', mpr_date=date(2026, 6, 25), comp_id='ND', status='STAGED')  # DEMO MPR
   db.session.merge(mpr1)
   db.session.merge(mpr2)
   db.session.merge(mpr3)
   db.session.commit()

   mt1 = MPRTRAN(mpr_no='MPR881023', item_code='RM003', req_qty=100.0, deficit_qty=80.0, status='ORDERED')
   mt2 = MPRTRAN(mpr_no='MPR991045', item_code='RM006', req_qty=160.0, deficit_qty=145.0, status='PENDING')
   mt3 = MPRTRAN(mpr_no='MPR111222', item_code='RM009', req_qty=250.0, deficit_qty=238.0, status='PENDING')  # DEMO line
   db.session.merge(mt1)
   db.session.merge(mt2)
   db.session.merge(mt3)
   db.session.commit()

   # 7. Pre-existing Mock Purchase Orders (Disaggregated Execution)
   po1 = POMAIN(
       po_no='PO901021', po_date=date(2026, 6, 21), party_code='P1001', comp_id='NC', 
       total_po_amount=72.00, payment_status='PAID', status='RECEIVED'
   )
   pt1 = POTRAN(po_no='PO901021', item_code='RM003', order_qty=80.0, rate=0.90, amount=72.00)
   
   po2 = POMAIN(
       po_no='PO901022', po_date=date(2026, 6, 22), party_code='P1004', comp_id='NC', 
       total_po_amount=150.00, payment_status='UNPAID', status='ORDERED'
   )
   pt2 = POTRAN(po_no='PO901022', item_code='RM004', order_qty=50.0, rate=3.00, amount=150.00)

   po3 = POMAIN(
       po_no='PO995011', po_date=date(2026, 6, 24), party_code='P1002', comp_id='ND', 
       total_po_amount=986.00, payment_status='UNPAID', status='ORDERED'
   )
   pt3 = POTRAN(po_no='PO995011', item_code='RM006', order_qty=145.0, rate=6.80, amount=986.00)

   # DEMO Purchase Orders
   po4 = POMAIN(
       po_no='PO888777', po_date=date(2026, 6, 25), party_code='P1001', comp_id='NC',
       total_po_amount=449.35, payment_status='UNPAID', status='ORDERED'
   )
   pt4 = POTRAN(po_no='PO888777', item_code='RM008', order_qty=95.0, rate=4.73, amount=449.35)

   po5 = POMAIN(
       po_no='PO555666', po_date=date(2026, 6, 25), party_code='P1002', comp_id='ND',
       total_po_amount=1666.00, payment_status='PAID', status='RECEIVED'
   )
   pt5 = POTRAN(po_no='PO555666', item_code='RM009', order_qty=238.0, rate=7.00, amount=1666.00)

   db.session.merge(po1)
   db.session.merge(po2)
   db.session.merge(po3)
   db.session.merge(po4)
   db.session.merge(po5)
   db.session.merge(pt1)
   db.session.merge(pt2)
   db.session.merge(pt3)
   db.session.merge(pt4)
   db.session.merge(pt5)
   db.session.commit()


   # Seed initial vendor offerings
   offerings = [
       Party_Item(party_code='P1001', item_code='RM001', last_rate=1.50),
       Party_Item(party_code='P1001', item_code='RM002', last_rate=2.20),
       Party_Item(party_code='P1001', item_code='RM003', last_rate=0.85),
       Party_Item(party_code='P1001', item_code='RM004', last_rate=3.10),
       Party_Item(party_code='P1002', item_code='RM005', last_rate=4.50),
       Party_Item(party_code='P1002', item_code='RM006', last_rate=6.80),
       Party_Item(party_code='P1002', item_code='RM007', last_rate=1.90),
       Party_Item(party_code='P1003', item_code='RM003', last_rate=0.90),
       Party_Item(party_code='P1004', item_code='RM004', last_rate=3.00),
       Party_Item(party_code='P1004', item_code='RM008', last_rate=4.50)
   ]
   for off in offerings:
       db.session.merge(off)
   db.session.commit()

   # 8. Seed Audit Logs
   logs = [
       Audit_Log(
           timestamp=datetime.now() - timedelta(days=5), target_table='item_master', 
           modified_field='RM003.bal_qt', old_value_snapshot='10.0', new_value_snapshot='90.0'
       ),
       Audit_Log(
           timestamp=datetime.now() - timedelta(days=5), target_table='pomain', 
           modified_field='PO901021.status', old_value_snapshot='ORDERED', new_value_snapshot='RECEIVED'
       ),
       Audit_Log(
           timestamp=datetime.now() - timedelta(days=4), target_table='pomain', 
           modified_field='PO901021.payment_status', old_value_snapshot='UNPAID', new_value_snapshot='PAID'
       ),
       Audit_Log(
           timestamp=datetime.now() - timedelta(days=1), target_table='mprmain', 
           modified_field='STAGE_MPR', old_value_snapshot=None, new_value_snapshot='Created MPR991045 for recipe RD0001 (ND)'
       ),
       Audit_Log(
           timestamp=datetime.now() - timedelta(minutes=45), target_table='item_master',
           modified_field='RM009.bal_qt', old_value_snapshot='12.0', new_value_snapshot='250.0'
       ),
       Audit_Log(
           timestamp=datetime.now() - timedelta(minutes=45), target_table='pomain',
           modified_field='PO555666.status', old_value_snapshot='ORDERED', new_value_snapshot='RECEIVED'
       )
   ]
   for log in logs:
       db.session.add(log)
   db.session.commit()

   print("Rich database seeding with sequence prefix schema and DEMO records completed.")

if __name__ == '__main__':
   app = create_app()
   with app.app_context():
       db.drop_all()
       db.create_all()
       seed_database()
