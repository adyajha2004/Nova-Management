from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Company(db.Model):
    __tablename__ = 'company'
    comp_id = db.Column(db.String(2), primary_key=True)  # 'NC' or 'ND'
    comp_name = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(200))
    email = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    license_no = db.Column(db.String(50))
    gstno = db.Column(db.String(50))
    panno = db.Column(db.String(50))

    def serialize(self):
        return {
            'comp_id': self.comp_id,
            'comp_name': self.comp_name,
            'address': self.address,
            'email': self.email,
            'phone': self.phone,
            'license_no': self.license_no,
            'gstno': self.gstno,
            'panno': self.panno
        }

class Item_Group(db.Model):
    __tablename__ = 'item_group'
    itg_code = db.Column(db.String(6), primary_key=True)
    itg_name = db.Column(db.String(50), nullable=False)
    itg_cgkey = db.Column(db.String(2))
    prefix = db.Column(db.String(4))
    last_sequence = db.Column(db.Integer, default=0)

    def serialize(self):
        return {
            'itg_code': self.itg_code,
            'itg_name': self.itg_name,
            'itg_cgkey': self.itg_cgkey,
            'prefix': self.prefix,
            'last_sequence': self.last_sequence
        }

class Item_Master(db.Model):
    __tablename__ = 'item_master'
    item_code = db.Column(db.String(6), primary_key=True)
    item_name = db.Column(db.String(50), nullable=False)
    itg_code = db.Column(db.String(6), db.ForeignKey('item_group.itg_code'), nullable=False)
    comp_id = db.Column(db.String(2), db.ForeignKey('company.comp_id'), nullable=False)
    units = db.Column(db.String(10))
    gst_pr = db.Column(db.Numeric(10, 2), default=0.0)
    itc_comp = db.Column(db.String(6))
    packing = db.Column(db.String(50))
    bal_qt = db.Column(db.Numeric(12, 3), default=0.0)  # Primary current inventory tracking
    opn_qt = db.Column(db.Numeric(12, 3), default=0.0)
    inw_qt = db.Column(db.Numeric(12, 3), default=0.0)
    out_qt = db.Column(db.Numeric(12, 3), default=0.0)
    ror_qt = db.Column(db.Numeric(12, 3), default=0.0)
    min_qt = db.Column(db.Numeric(12, 3), default=0.0)
    last_rate = db.Column(db.Numeric(10, 2), default=0.0)
    liss_date = db.Column(db.Date)
    lrec_date = db.Column(db.Date)
    lead_time = db.Column(db.Integer, default=0)
    is_lic = db.Column(db.Boolean, default=False)
    is_imp = db.Column(db.Boolean, default=False)
    pack_qty = db.Column(db.Numeric(10, 2), default=0.0)

    # Relationships
    group = db.relationship('Item_Group', backref='items')
    company = db.relationship('Company', backref='items')

    def serialize(self):
        return {
            'item_code': self.item_code,
            'item_name': self.item_name,
            'itg_code': self.itg_code,
            'comp_id': self.comp_id,
            'units': self.units,
            'gst_pr': float(self.gst_pr) if self.gst_pr is not None else 0.0,
            'itc_comp': self.itc_comp,
            'packing': self.packing,
            'bal_qt': float(self.bal_qt) if self.bal_qt is not None else 0.0,
            'opn_qt': float(self.opn_qt) if self.opn_qt is not None else 0.0,
            'inw_qt': float(self.inw_qt) if self.inw_qt is not None else 0.0,
            'out_qt': float(self.out_qt) if self.out_qt is not None else 0.0,
            'ror_qt': float(self.ror_qt) if self.ror_qt is not None else 0.0,
            'min_qt': float(self.min_qt) if self.min_qt is not None else 0.0,
            'last_rate': float(self.last_rate) if self.last_rate is not None else 0.0,
            'liss_date': self.liss_date.isoformat() if self.liss_date else None,
            'lrec_date': self.lrec_date.isoformat() if self.lrec_date else None,
            'lead_time': self.lead_time,
            'is_lic': self.is_lic,
            'is_imp': self.is_imp,
            'pack_qty': float(self.pack_qty) if self.pack_qty is not None else 0.0
        }

class Party_Master(db.Model):
    __tablename__ = 'party_master'
    party_code = db.Column(db.String(6), primary_key=True)
    party_name = db.Column(db.String(50), nullable=False)
    address_1 = db.Column(db.String(100))
    address_2 = db.Column(db.String(100))
    address_3 = db.Column(db.String(100))
    phone_no = db.Column(db.String(20))
    contact_person = db.Column(db.String(50))
    email = db.Column(db.String(100))
    bank_name = db.Column(db.String(50))
    bank_ac_no = db.Column(db.String(30))
    bank_ifsc = db.Column(db.String(15))
    bank_branch = db.Column(db.String(50))
    payment_terms = db.Column(db.String(100))

    def serialize(self):
        return {
            'party_code': self.party_code,
            'party_name': self.party_name,
            'address_1': self.address_1,
            'address_2': self.address_2,
            'address_3': self.address_3,
            'phone_no': self.phone_no,
            'contact_person': self.contact_person,
            'email': self.email,
            'bank_name': self.bank_name,
            'bank_ac_no': self.bank_ac_no,
            'bank_ifsc': self.bank_ifsc,
            'bank_branch': self.bank_branch,
            'payment_terms': self.payment_terms
        }

class Party_Item(db.Model):
    __tablename__ = 'party_item'
    party_code = db.Column(db.String(6), db.ForeignKey('party_master.party_code'), primary_key=True)
    item_code = db.Column(db.String(6), db.ForeignKey('item_master.item_code'), primary_key=True)
    last_rate = db.Column(db.Numeric(10, 2), nullable=True)

    # Relationships
    party = db.relationship('Party_Master', backref=db.backref('offerings', lazy=True, cascade="all, delete-orphan"))
    item = db.relationship('Item_Master', backref=db.backref('offered_by', lazy=True, cascade="all, delete-orphan"))

    def serialize(self):
        return {
            'party_code': self.party_code,
            'item_code': self.item_code,
            'item_name': self.item.item_name if self.item else 'Unknown Item',
            'units': self.item.units if self.item else '',
            'packing': self.item.packing if self.item else '',
            'last_rate': float(self.last_rate) if self.last_rate is not None else None
        }

class Recipe_Master(db.Model):
    __tablename__ = 'recipe_master'
    rcp_code = db.Column(db.String(6), primary_key=True)
    rcp_name = db.Column(db.String(50), nullable=False)
    rcp_yield = db.Column(db.Numeric(10, 2), default=1.0)
    comp_id = db.Column(db.String(2), db.ForeignKey('company.comp_id'), nullable=False)

    company = db.relationship('Company', backref='recipes')

    def serialize(self):
        return {
            'rcp_code': self.rcp_code,
            'rcp_name': self.rcp_name,
            'rcp_yield': float(self.rcp_yield) if self.rcp_yield is not None else 1.0,
            'comp_id': self.comp_id
        }

class Recipe_Tran(db.Model):
    __tablename__ = 'recipe_tran'
    rcp_code = db.Column(db.String(6), db.ForeignKey('recipe_master.rcp_code'), primary_key=True)
    item_code = db.Column(db.String(6), db.ForeignKey('item_master.item_code'), primary_key=True)
    item_name = db.Column(db.String(50), nullable=False)
    item_qty = db.Column(db.Numeric(12, 3), nullable=False)

    recipe = db.relationship('Recipe_Master', backref=db.backref('ingredients', lazy=True, cascade="all, delete-orphan"))
    item = db.relationship('Item_Master', backref='recipe_links')

    def serialize(self):
        return {
            'rcp_code': self.rcp_code,
            'item_code': self.item_code,
            'item_name': self.item_name,
            'item_qty': float(self.item_qty)
        }

class MPRMAIN(db.Model):
    __tablename__ = 'mprmain'
    mpr_no = db.Column(db.String(10), primary_key=True)
    mpr_date = db.Column(db.Date, default=datetime.utcnow)
    comp_id = db.Column(db.String(2), db.ForeignKey('company.comp_id'), nullable=False)
    status = db.Column(db.String(20), default='STAGED')  # 'STAGED', 'ORDERED', 'COMPLETED'

    company = db.relationship('Company', backref='mprs')

    def serialize(self):
        return {
            'mpr_no': self.mpr_no,
            'mpr_date': self.mpr_date.isoformat() if self.mpr_date else None,
            'comp_id': self.comp_id,
            'status': self.status
        }

class MPRTRAN(db.Model):
    __tablename__ = 'mprtran'
    mpr_no = db.Column(db.String(10), db.ForeignKey('mprmain.mpr_no'), primary_key=True)
    item_code = db.Column(db.String(6), db.ForeignKey('item_master.item_code'), primary_key=True)
    req_qty = db.Column(db.Numeric(12, 3), nullable=False)
    deficit_qty = db.Column(db.Numeric(12, 3), nullable=False)
    status = db.Column(db.String(20), default='PENDING')  # 'PENDING', 'ORDERED'

    mpr = db.relationship('MPRMAIN', backref=db.backref('items', lazy=True, cascade="all, delete-orphan"))
    item = db.relationship('Item_Master', backref='mpr_links')

    def serialize(self):
        return {
            'mpr_no': self.mpr_no,
            'item_code': self.item_code,
            'item_name': self.item.item_name if self.item else 'Unknown Item',
            'req_qty': float(self.req_qty),
            'deficit_qty': float(self.deficit_qty),
            'status': self.status
        }

class POMAIN(db.Model):
    __tablename__ = 'pomain'
    po_no = db.Column(db.String(10), primary_key=True)
    po_date = db.Column(db.Date, default=datetime.utcnow)
    party_code = db.Column(db.String(6), db.ForeignKey('party_master.party_code'), nullable=False)
    comp_id = db.Column(db.String(2), db.ForeignKey('company.comp_id'), nullable=False)
    total_po_amount = db.Column(db.Numeric(12, 2), default=0.0)
    payment_status = db.Column(db.String(20), default='UNPAID')  # 'UNPAID', 'PAID'
    status = db.Column(db.String(20), default='ORDERED')  # 'ORDERED', 'RECEIVED'

    company = db.relationship('Company', backref='pos')
    party = db.relationship('Party_Master', backref='pos')

    def serialize(self):
        return {
            'po_no': self.po_no,
            'po_date': self.po_date.isoformat() if self.po_date else None,
            'party_code': self.party_code,
            'party_name': self.party.party_name if self.party else 'Unknown Vendor',
            'comp_id': self.comp_id,
            'total_po_amount': float(self.total_po_amount) if self.total_po_amount is not None else 0.0,
            'payment_status': self.payment_status,
            'status': self.status
        }

class POTRAN(db.Model):
    __tablename__ = 'potran'
    po_no = db.Column(db.String(10), db.ForeignKey('pomain.po_no'), primary_key=True)
    item_code = db.Column(db.String(6), db.ForeignKey('item_master.item_code'), primary_key=True)
    order_qty = db.Column(db.Numeric(12, 3), nullable=False)
    rate = db.Column(db.Numeric(10, 2), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)

    po = db.relationship('POMAIN', backref=db.backref('items', lazy=True, cascade="all, delete-orphan"))
    item = db.relationship('Item_Master', backref='po_links')

    def serialize(self):
        return {
            'po_no': self.po_no,
            'item_code': self.item_code,
            'item_name': self.item.item_name if self.item else 'Unknown Item',
            'order_qty': float(self.order_qty),
            'rate': float(self.rate),
            'amount': float(self.amount)
        }

class Audit_Log(db.Model):
    __tablename__ = 'audit_log'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    target_table = db.Column(db.String(50), nullable=False)
    modified_field = db.Column(db.String(50), nullable=False)
    old_value_snapshot = db.Column(db.Text)
    new_value_snapshot = db.Column(db.Text)

    def serialize(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'target_table': self.target_table,
            'modified_field': self.modified_field,
            'old_value_snapshot': self.old_value_snapshot,
            'new_value_snapshot': self.new_value_snapshot
        }
