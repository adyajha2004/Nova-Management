import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layers, Database, ShoppingCart, ClipboardList, Download, AlertTriangle, 
  CheckCircle, TrendingUp, User, Globe, RefreshCw, FileText, Mail, Plus, 
  Search, DollarSign, Sliders, Calendar, ChevronRight, X, Printer, Info, LogOut, Lock,
  FileSpreadsheet
} from 'lucide-react';


// Setup Axios defaults
axios.defaults.baseURL = 'http://localhost:5000';

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('Viewer');
  const [userName, setUserName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Navigation & Toast states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Unified Data states (Mixed NC + ND)
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [mprs, setMprs] = useState([]);
  const [pos, setPos] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({ items: 0, recipes: 0, pos: 0, deficits: 0, ncItems: 0, ndItems: 0 });
  const [companies, setCompanies] = useState([]);

  // Company Edit states
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyFormData, setCompanyFormData] = useState({ comp_name: '', address: '', email: '', phone: '', license_no: '' });

  // Groups states
  const [groups, setGroups] = useState([]);
  const [newGroupModal, setNewGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({ itg_code: '', itg_name: '', prefix: '', last_sequence: 0 });

  // Item master detail edit states
  const [editingItem, setEditingItem] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    item_name: '', itg_code: 'R00001', comp_id: 'NC', units: 'KG', gst_pr: 18.0,
    packing: '', bal_qt: 0, min_qt: 0, ror_qt: 0, lead_time: 5, pack_qty: 1.0,
    is_lic: false, is_imp: false, last_rate: 0.0
  });

  // Recipe master CRUD states
  const [newRecipeModal, setNewRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeFormData, setRecipeFormData] = useState({
    rcp_name: '', rcp_yield: 100.0, comp_id: 'NC', ingredients: []
  });
  const [ingItemCode, setIngItemCode] = useState('');
  const [ingQty, setIngQty] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  
  // Recipe scaling sub-states
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [scaleYield, setScaleYield] = useState('');
  const [scalingResult, setScalingResult] = useState(null);
  
  // RFP & PO creation sub-states
  const [rfpMpr, setRfpMpr] = useState(null);
  const [rfpEmails, setRfpEmails] = useState([]);
  const [bidsInput, setBidsInput] = useState({}); // { item_code: { party_code: rate } }
  const [selectedBids, setSelectedBids] = useState({}); // { item_code: party_code }
  
  // Search, Filters, & Modal states
  const [itemSearch, setItemSearch] = useState('');
  const [itemGroupFilter, setItemGroupFilter] = useState('ALL');
  const [newItemModal, setNewItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({
    item_name: '', itg_code: 'R00001', comp_id: 'NC', units: 'KG', gst_pr: 18,
    packing: '', bal_qt: 0, min_qt: 0, ror_qt: 0, lead_time: 5, pack_qty: 1,
    is_lic: false, is_imp: false
  });
  
  // Party Master states
  const [newPartyModal, setNewPartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [partyFormData, setPartyFormData] = useState({
    party_code: '', party_name: '', address_1: '', address_2: '', address_3: '',
    phone_no: '', contact_person: '', email: '', bank_name: '', bank_ac_no: '',
    bank_ifsc: '', bank_branch: '', payment_terms: ''
  });
  const [selectedPartyForOrders, setSelectedPartyForOrders] = useState(null);
  const [partyOrdersModal, setPartyOrdersModal] = useState(false);
  const [partySearch, setPartySearch] = useState('');

  // Party Item Offerings states
  const [selectedPartyForOfferings, setSelectedPartyForOfferings] = useState(null);
  const [partyOfferingsModal, setPartyOfferingsModal] = useState(false);
  const [offeringsList, setOfferingsList] = useState([]);
  const [offeringItemCode, setOfferingItemCode] = useState('');
  const [offeringLastRate, setOfferingLastRate] = useState('');

  // Item Master Supplier Management states
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const [itemDetailsModal, setItemDetailsModal] = useState(false);
  const [itemVendorsList, setItemVendorsList] = useState([]);
  const [itemVendorCode, setItemVendorCode] = useState('');
  const [itemVendorLastRate, setItemVendorLastRate] = useState('');
  const [newItemOfferings, setNewItemOfferings] = useState([]);

  // Excel bulk editor states
  const [excelActiveSheet, setExcelActiveSheet] = useState('items'); // 'items' | 'groups' | 'parties'
  const [excelItems, setExcelItems] = useState([]);
  const [excelGroups, setExcelGroups] = useState([]);
  const [excelVendors, setExcelVendors] = useState([]);


  // Recipe Master Details & Feasibility states
  const [selectedRecipeForDetails, setSelectedRecipeForDetails] = useState(null);
  const [recipeDetailsModal, setRecipeDetailsModal] = useState(false);
  const [detailsTargetYield, setDetailsTargetYield] = useState('');

  // Date range picker filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Persist session check
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    const savedName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    
    if (token && savedRole) {
      setUserRole(savedRole);
      setUserName(savedName || 'Nova User');
      setIsAuthenticated(true);
      
      // Configure Axios global headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Fetch data on authentication status change
  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated, userRole]);

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        username: loginUsername,
        password: loginPassword
      });
      
      const { role, username, token } = res.data;
      
      // Store locally
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', username);
      localStorage.setItem('token', token);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUserRole(role);
      setUserName(username);
      setIsAuthenticated(true);
      showToast(`Welcome back, ${username}! Authenticated as ${role}.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('token');
    
    delete axios.defaults.headers.common['Authorization'];
    
    setIsAuthenticated(false);
    setUserRole('Viewer');
    setUserName('');
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('dashboard');
    showToast('Logged out successfully.');
  };

  // Fetch all mixed company datasets
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const itemsRes = await axios.get('/api/inventory/items');
      setItems(itemsRes.data);

      const recipesRes = await axios.get('/api/recipes');
      setRecipes(recipesRes.data);

      const vendorsRes = await axios.get('/api/procurement/vendors');
      setVendors(vendorsRes.data);

      const mprsRes = await axios.get('/api/procurement/mprs');
      setMprs(mprsRes.data);

      const posRes = await axios.get('/api/procurement/pos');
      setPos(posRes.data);

      const auditRes = await axios.get('/api/audit/logs');
      setAuditLogs(auditRes.data);

      const groupsRes = await axios.get('/api/inventory/groups');
      setGroups(groupsRes.data);

      const companiesRes = await axios.get('/api/companies');
      setCompanies(companiesRes.data);

      setExcelItems(itemsRes.data.map(itm => ({ ...itm, isNew: false, isDeleted: false })));
      setExcelGroups(groupsRes.data.map(g => ({ ...g, isNew: false, isDeleted: false })));
      setExcelVendors(vendorsRes.data.map(v => ({ ...v, isNew: false, isDeleted: false })));

      const deficitCount = itemsRes.data.filter(item => item.bal_qt < item.min_qt).length;
      const ncCount = itemsRes.data.filter(item => item.comp_id === 'NC').length;
      const ndCount = itemsRes.data.filter(item => item.comp_id === 'ND').length;
      
      setStats({
        items: itemsRes.data.length,
        recipes: recipesRes.data.length,
        pos: posRes.data.length,
        deficits: deficitCount,
        ncItems: ncCount,
        ndItems: ndCount
      });

    } catch (err) {
      console.error(err);
      showToast('Error syncing with database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Company Profile CRUD Handlers
  const handleOpenCompanyModal = (company) => {
    setEditingCompany(company);
    setCompanyFormData({
      comp_name: company.comp_name,
      address: company.address,
      email: company.email || '',
      phone: company.phone || '',
      license_no: company.license_no || '',
      gstno: company.gstno || '',
      panno: company.panno || ''
    });
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(`/api/companies/${editingCompany.comp_id}`, companyFormData);
      showToast(`Company profile ${res.data.comp_id} updated successfully.`);
      setEditingCompany(null);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update company.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Group CRUD Handlers
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      await axios.post('/api/inventory/groups', groupFormData);
      showToast(`Group ${groupFormData.itg_code} created successfully.`);
      setNewGroupModal(false);
      setGroupFormData({ itg_code: '', itg_name: '', prefix: '', last_sequence: 0 });
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create group.', 'error');
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      await axios.put(`/api/inventory/groups/${editingGroup.itg_code}`, groupFormData);
      showToast(`Group ${editingGroup.itg_code} updated successfully.`);
      setEditingGroup(null);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update group.', 'error');
    }
  };

  const handleDeleteGroup = async (itg_code) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Group ${itg_code}?`)) return;
    try {
      await axios.delete(`/api/inventory/groups/${itg_code}`);
      showToast(`Group ${itg_code} deleted successfully.`);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete group.', 'error');
    }
  };

  // Add Item (Admin only)
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      const payload = {
        ...newItemData,
        offerings: newItemOfferings
      };
      const res = await axios.post('/api/inventory/items', payload);
      showToast(`Item ${res.data.item_code} created successfully for company ${res.data.comp_id}.`);
      setNewItemModal(false);
      setNewItemOfferings([]);
      setNewItemData({
        item_name: '', itg_code: 'R00001', comp_id: 'NC', units: 'KG', gst_pr: 18,
        packing: '', bal_qt: 0, min_qt: 0, ror_qt: 0, lead_time: 5, pack_qty: 1,
        is_lic: false, is_imp: false
      });
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create item.', 'error');
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      await axios.put(`/api/inventory/items/${editingItem.item_code}`, itemFormData);
      showToast(`Item ${editingItem.item_code} updated successfully.`);
      setEditingItem(null);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update item.', 'error');
    }
  };

  const handleDeleteItem = async (item_code) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Item ${item_code}?`)) return;
    try {
      await axios.delete(`/api/inventory/items/${item_code}`);
      showToast(`Item ${item_code} deleted successfully.`);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete item.', 'error');
    }
  };

  // Edit stock balance directly (Admin only)
  const handleAdjustBalance = async (item_code, newBal) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      await axios.put(`/api/inventory/items/${item_code}`, { bal_qt: parseFloat(newBal) });
      showToast(`Balance updated for ${item_code}.`);
      fetchInitialData();
    } catch (err) {
      showToast('Failed to update balance.', 'error');
    }
  };

  // Recipe CRUD Handlers
  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (recipeFormData.ingredients.length === 0) {
      showToast('Please add at least one ingredient.', 'error');
      return;
    }
    try {
      const res = await axios.post('/api/recipes', recipeFormData);
      showToast(`Recipe ${res.data.rcp_code} created successfully.`);
      setNewRecipeModal(false);
      setRecipeFormData({ rcp_name: '', rcp_yield: 100.0, comp_id: 'NC', ingredients: [] });
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create recipe.', 'error');
    }
  };

  const handleUpdateRecipe = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (recipeFormData.ingredients.length === 0) {
      showToast('Please add at least one ingredient.', 'error');
      return;
    }
    try {
      await axios.put(`/api/recipes/${editingRecipe.rcp_code}`, recipeFormData);
      showToast(`Recipe ${editingRecipe.rcp_code} updated successfully.`);
      setEditingRecipe(null);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update recipe.', 'error');
    }
  };

  const handleDeleteRecipe = async (rcp_code) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Recipe ${rcp_code}?`)) return;
    try {
      await axios.delete(`/api/recipes/${rcp_code}`);
      showToast(`Recipe ${rcp_code} deleted successfully.`);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete recipe.', 'error');
    }
  };

  // Recipe scaling calculations
  const handleScaleRecipe = async (e) => {
    e.preventDefault();
    if (!scaleYield || isNaN(scaleYield) || parseFloat(scaleYield) <= 0) {
      showToast('Please enter a valid target yield.', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('/api/recipes/scale', {
        rcp_code: selectedRecipe.rcp_code,
        target_yield: parseFloat(scaleYield)
      });
      
      setScalingResult(res.data);
      if (res.data.has_deficits) {
        showToast('Deficits identified. Requirements successfully staged under MPR.', 'warning');
      } else {
        showToast('Inventory sufficient. No staged requirements generated.');
      }
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Recipe process calculation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Recipe Details & Feasibility handlers
  const fetchRecipeDetailsAndOpen = async (rcp) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/recipes/${rcp.rcp_code}`);
      const updated = recipes.map(r => r.rcp_code === rcp.rcp_code ? res.data : r);
      setRecipes(updated);
      setSelectedRecipeForDetails(res.data);
      setDetailsTargetYield(res.data.rcp_yield.toString());
      setRecipeDetailsModal(true);
    } catch (err) {
      showToast('Failed to load recipe details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMprFromDetails = async () => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!detailsTargetYield || isNaN(detailsTargetYield) || parseFloat(detailsTargetYield) <= 0) {
      showToast('Please enter a valid target yield.', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('/api/recipes/scale', {
        rcp_code: selectedRecipeForDetails.rcp_code,
        target_yield: parseFloat(detailsTargetYield)
      });
      if (res.data.has_deficits) {
        showToast(`Deficits identified. MPR ${res.data.mpr_no} staged successfully.`);
      } else {
        showToast('Inventory sufficient. No staged requirements generated.');
      }
      setRecipeDetailsModal(false);
      setSelectedRecipeForDetails(null);
      setDetailsTargetYield('');
      setActiveTab('mpr_ledger');
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Recipe process calculation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Excel spreadsheet handlers
  const discardExcelChanges = () => {
    setExcelItems(items.map(itm => ({ ...itm, isNew: false, isDeleted: false })));
    setExcelGroups(groups.map(g => ({ ...g, isNew: false, isDeleted: false })));
    setExcelVendors(vendors.map(v => ({ ...v, isNew: false, isDeleted: false })));
    showToast('All staged changes discarded.');
  };

  const addExcelItemRow = () => {
    const newRow = {
      item_code: `[Auto-${Math.random().toString(36).substr(2, 5).toUpperCase()}]`,
      item_name: '',
      itg_code: groups[0]?.itg_code || 'R00001',
      comp_id: 'NC',
      units: 'KG',
      gst_pr: 18.0,
      packing: '',
      pack_qty: 1.0,
      bal_qt: 0.0,
      min_qt: 0.0,
      ror_qt: 0.0,
      lead_time: 5,
      last_rate: 0.0,
      lrec_date: '',
      liss_date: '',
      is_lic: false,
      is_imp: false,
      isNew: true,
      isDeleted: false
    };
    setExcelItems([...excelItems, newRow]);
  };

  const addExcelGroupRow = () => {
    const newRow = {
      itg_code: '',
      itg_name: '',
      itg_cgkey: '',
      prefix: '',
      last_sequence: 0,
      isNew: true,
      isDeleted: false
    };
    setExcelGroups([...excelGroups, newRow]);
  };

  const addExcelVendorRow = () => {
    const newRow = {
      party_code: '',
      party_name: '',
      address_1: '',
      address_2: '',
      address_3: '',
      phone_no: '',
      contact_person: '',
      email: '',
      bank_name: '',
      bank_ac_no: '',
      bank_ifsc: '',
      bank_branch: '',
      payment_terms: '',
      isNew: true,
      isDeleted: false
    };
    setExcelVendors([...excelVendors, newRow]);
  };

  const saveExcelItemsChanges = async () => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    
    const invalidItem = excelItems.find(itm => !itm.isDeleted && !itm.item_name.trim());
    if (invalidItem) {
      showToast('Please enter an Item Name for all items.', 'error');
      return;
    }

    const creates = [];
    const updates = [];
    const deletes = [];

    excelItems.forEach(itm => {
      if (itm.isDeleted) {
        if (!itm.isNew) {
          deletes.push(itm.item_code);
        }
      } else if (itm.isNew) {
        creates.push({
          item_name: itm.item_name,
          itg_code: itm.itg_code,
          comp_id: itm.comp_id,
          units: itm.units,
          gst_pr: parseFloat(itm.gst_pr) || 0.0,
          packing: itm.packing,
          pack_qty: parseFloat(itm.pack_qty) || 1.0,
          bal_qt: parseFloat(itm.bal_qt) || 0.0,
          min_qt: parseFloat(itm.min_qt) || 0.0,
          ror_qt: parseFloat(itm.ror_qt) || 0.0,
          lead_time: parseInt(itm.lead_time) || 5,
          last_rate: parseFloat(itm.last_rate) || 0.0,
          lrec_date: itm.lrec_date,
          liss_date: itm.liss_date,
          is_lic: !!itm.is_lic,
          is_imp: !!itm.is_imp
        });
      } else {
        const original = items.find(o => o.item_code === itm.item_code);
        const isModified = !original ||
          original.item_name !== itm.item_name ||
          original.itg_code !== itm.itg_code ||
          original.comp_id !== itm.comp_id ||
          original.units !== itm.units ||
          original.gst_pr !== itm.gst_pr ||
          original.packing !== itm.packing ||
          original.pack_qty !== itm.pack_qty ||
          original.bal_qt !== itm.bal_qt ||
          original.min_qt !== itm.min_qt ||
          original.ror_qt !== itm.ror_qt ||
          original.lead_time !== itm.lead_time ||
          original.last_rate !== itm.last_rate ||
          original.is_lic !== itm.is_lic ||
          original.lrec_date !== itm.lrec_date ||
          original.liss_date !== itm.liss_date ||
          original.is_imp !== itm.is_imp;
          
        if (isModified) {
          updates.push({
            item_code: itm.item_code,
            item_name: itm.item_name,
            itg_code: itm.itg_code,
            comp_id: itm.comp_id,
            units: itm.units,
            gst_pr: parseFloat(itm.gst_pr) || 0.0,
            packing: itm.packing,
            pack_qty: parseFloat(itm.pack_qty) || 1.0,
            bal_qt: parseFloat(itm.bal_qt) || 0.0,
            min_qt: parseFloat(itm.min_qt) || 0.0,
            ror_qt: parseFloat(itm.ror_qt) || 0.0,
            lead_time: parseInt(itm.lead_time) || 0,
            last_rate: parseFloat(itm.last_rate) || 0.0,
            lrec_date: itm.lrec_date || null,
            liss_date: itm.liss_date || null,
            is_lic: !!itm.is_lic,
            is_imp: !!itm.is_imp
          });
        }
      }
    });

    if (creates.length === 0 && updates.length === 0 && deletes.length === 0) {
      showToast('No changes detected.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/inventory/items/bulk', {
        creates,
        updates,
        deletes
      });
      showToast(res.data.message || 'Changes saved successfully.');
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save excel changes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveExcelGroupsChanges = async () => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    
    const invalidGroup = excelGroups.find(g => !g.isDeleted && (!g.itg_code.trim() || !g.itg_name.trim()));
    if (invalidGroup) {
      showToast('Please enter both Group Code and Group Name for all groups.', 'error');
      return;
    }

    const creates = [];
    const updates = [];
    const deletes = [];

    excelGroups.forEach(g => {
      if (g.isDeleted) {
        if (!g.isNew) {
          deletes.push(g.itg_code);
        }
      } else if (g.isNew) {
        creates.push({
          itg_code: g.itg_code.toUpperCase(),
          itg_name: g.itg_name,
          itg_cgkey: g.itg_cgkey || g.itg_code.substring(0, 2).toUpperCase(),
          prefix: g.prefix || g.itg_code.substring(0, 2).toUpperCase(),
          last_sequence: parseInt(g.last_sequence) || 0
        });
      } else {
        const original = groups.find(o => o.itg_code === g.itg_code);
        const isModified = !original ||
          original.itg_name !== g.itg_name ||
          original.itg_cgkey !== g.itg_cgkey ||
          original.prefix !== g.prefix ||
          original.last_sequence !== g.last_sequence;
          
        if (isModified) {
          updates.push({
            itg_code: g.itg_code,
            itg_name: g.itg_name,
            itg_cgkey: g.itg_cgkey,
            prefix: g.prefix,
            last_sequence: parseInt(g.last_sequence) || 0
          });
        }
      }
    });

    if (creates.length === 0 && updates.length === 0 && deletes.length === 0) {
      showToast('No changes detected.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/inventory/groups/bulk', {
        creates,
        updates,
        deletes
      });
      showToast(res.data.message || 'Changes saved successfully.');
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save group changes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveExcelVendorsChanges = async () => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    
    const invalidVendor = excelVendors.find(v => !v.isDeleted && (!v.party_code.trim() || !v.party_name.trim()));
    if (invalidVendor) {
      showToast('Please enter both Vendor Code and Vendor Name for all entries.', 'error');
      return;
    }

    const creates = [];
    const updates = [];
    const deletes = [];

    excelVendors.forEach(v => {
      if (v.isDeleted) {
        if (!v.isNew) {
          deletes.push(v.party_code);
        }
      } else if (v.isNew) {
        creates.push({
          party_code: v.party_code.toUpperCase(),
          party_name: v.party_name,
          address_1: v.address_1 || '',
          address_2: v.address_2 || '',
          address_3: v.address_3 || '',
          phone_no: v.phone_no || '',
          contact_person: v.contact_person || '',
          email: v.email || '',
          bank_name: v.bank_name || '',
          bank_ac_no: v.bank_ac_no || '',
          bank_ifsc: v.bank_ifsc || '',
          bank_branch: v.bank_branch || '',
          payment_terms: v.payment_terms || ''
        });
      } else {
        const original = vendors.find(o => o.party_code === v.party_code);
        const isModified = !original ||
          original.party_name !== v.party_name ||
          original.address_1 !== v.address_1 ||
          original.address_2 !== v.address_2 ||
          original.address_3 !== v.address_3 ||
          original.phone_no !== v.phone_no ||
          original.contact_person !== v.contact_person ||
          original.email !== v.email ||
          original.bank_name !== v.bank_name ||
          original.bank_ac_no !== v.bank_ac_no ||
          original.bank_ifsc !== v.bank_ifsc ||
          original.bank_branch !== v.bank_branch ||
          original.payment_terms !== v.payment_terms;
          
        if (isModified) {
          updates.push({
            party_code: v.party_code,
            party_name: v.party_name,
            address_1: v.address_1 || '',
            address_2: v.address_2 || '',
            address_3: v.address_3 || '',
            phone_no: v.phone_no || '',
            contact_person: v.contact_person || '',
            email: v.email || '',
            bank_name: v.bank_name || '',
            bank_ac_no: v.bank_ac_no || '',
            bank_ifsc: v.bank_ifsc || '',
            bank_branch: v.bank_branch || '',
            payment_terms: v.payment_terms || ''
          });
        }
      }
    });

    if (creates.length === 0 && updates.length === 0 && deletes.length === 0) {
      showToast('No changes detected.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/procurement/vendors/bulk', {
        creates,
        updates,
        deletes
      });
      showToast(res.data.message || 'Changes saved successfully.');
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save vendor changes.', 'error');
    } finally {
      setLoading(false);
    }
  };


  // Party Master CRUD Handlers
  const handleCreateParty = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      const res = await axios.post('/api/procurement/vendors', partyFormData);
      showToast(`Party ${res.data.party_code} created successfully.`);
      setNewPartyModal(false);
      setPartyFormData({
        party_code: '', party_name: '', address_1: '', address_2: '', address_3: '',
        phone_no: '', contact_person: '', email: '', bank_name: '', bank_ac_no: '',
        bank_ifsc: '', bank_branch: '', payment_terms: ''
      });
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create party.', 'error');
    }
  };

  const handleUpdateParty = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      await axios.put(`/api/procurement/vendors/${editingParty.party_code}`, partyFormData);
      showToast(`Party ${editingParty.party_code} updated successfully.`);
      setEditingParty(null);
      setNewPartyModal(false);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update party.', 'error');
    }
  };

  const handleDeleteParty = async (party_code) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Party ${party_code}?`)) return;
    try {
      await axios.delete(`/api/procurement/vendors/${party_code}`);
      showToast(`Party ${party_code} deleted successfully.`);
      fetchInitialData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete party.', 'error');
    }
  };

  // Vendor offerings actions
  const fetchPartyOfferings = async (party_code) => {
    try {
      const res = await axios.get(`/api/procurement/vendors/${party_code}/items`);
      setOfferingsList(res.data);
    } catch (err) {
      showToast('Failed to fetch party offerings.', 'error');
    }
  };

  const handleAddOffering = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!offeringItemCode) {
      showToast('Please select an item.', 'error');
      return;
    }
    try {
      const rateToSend = offeringLastRate === '' ? null : offeringLastRate;
      await axios.post(`/api/procurement/vendors/${selectedPartyForOfferings.party_code}/items`, {
        item_code: offeringItemCode,
        last_rate: rateToSend
      });
      showToast('Item offering added successfully.');
      setOfferingItemCode('');
      setOfferingLastRate('');
      fetchPartyOfferings(selectedPartyForOfferings.party_code);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add offering.', 'error');
    }
  };

  const handleUpdateOfferingRate = async (item_code, newRate) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      const rateToSend = newRate === '' ? null : newRate;
      await axios.put(`/api/procurement/vendors/${selectedPartyForOfferings.party_code}/items/${item_code}`, {
        last_rate: rateToSend
      });
      showToast('Offering rate updated.');
      fetchPartyOfferings(selectedPartyForOfferings.party_code);
    } catch (err) {
      showToast('Failed to update offering rate.', 'error');
    }
  };

  const handleDeleteOffering = async (item_code) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this item offering?')) return;
    try {
      await axios.delete(`/api/procurement/vendors/${selectedPartyForOfferings.party_code}/items/${item_code}`);
      showToast('Offering removed.');
      fetchPartyOfferings(selectedPartyForOfferings.party_code);
    } catch (err) {
      showToast('Failed to remove offering.', 'error');
    }
  };

  // Item Master Supplier handlers
  const fetchItemVendors = async (item_code) => {
    try {
      const res = await axios.get(`/api/inventory/items/${item_code}/vendors`);
      setItemVendorsList(res.data);
    } catch (err) {
      showToast('Failed to fetch item vendors.', 'error');
    }
  };

  const handleAddItemVendor = async (e) => {
    e.preventDefault();
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!itemVendorCode) {
      showToast('Please select a vendor.', 'error');
      return;
    }
    try {
      const rateToSend = itemVendorLastRate === '' ? null : itemVendorLastRate;
      await axios.post(`/api/inventory/items/${selectedItemForDetails.item_code}/vendors`, {
        party_code: itemVendorCode,
        last_rate: rateToSend
      });
      showToast('Supplier added successfully.');
      setItemVendorCode('');
      setItemVendorLastRate('');
      fetchItemVendors(selectedItemForDetails.item_code);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add vendor.', 'error');
    }
  };

  const handleUpdateItemVendorRate = async (party_code, newRate) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      const rateToSend = newRate === '' ? null : newRate;
      await axios.put(`/api/inventory/items/${selectedItemForDetails.item_code}/vendors/${party_code}`, {
        last_rate: rateToSend
      });
      showToast('Supplier offering rate updated.');
      fetchItemVendors(selectedItemForDetails.item_code);
    } catch (err) {
      showToast('Failed to update offering rate.', 'error');
    }
  };

  const handleDeleteItemVendor = async (party_code) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this supplier offering?')) return;
    try {
      await axios.delete(`/api/inventory/items/${selectedItemForDetails.item_code}/vendors/${party_code}`);
      showToast('Supplier offering removed.');
      fetchItemVendors(selectedItemForDetails.item_code);
    } catch (err) {
      showToast('Failed to remove supplier offering.', 'error');
    }
  };

  // Dispatch RFP simulated emails
  const handleDispatchRfp = async (mpr) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/procurement/rfp/dispatch', { mpr_no: mpr.mpr_no });
      setRfpEmails(res.data.email_payloads);
      setRfpMpr(mpr);
      
      const initialBids = {};
      const initialSelected = {};
      mpr.items.forEach(itm => {
        initialBids[itm.item_code] = {};
        vendors.forEach(v => {
          initialBids[itm.item_code][v.party_code] = '';
        });
      });
      setBidsInput(initialBids);
      setSelectedBids(initialSelected);
      
      showToast(`Outbound RFP payloads staged for ${mpr.mpr_no}.`);
    } catch (err) {
      showToast('Failed to dispatch RFPs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm pricing and generate disaggregated POs
  const handleGeneratePOs = async () => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }

    const bidsToSubmit = [];
    const missingBids = [];

    rfpMpr.items.forEach(itm => {
      if (itm.status === 'ORDERED') return;
      
      const winningVendor = selectedBids[itm.item_code];
      const rate = bidsInput[itm.item_code]?.[winningVendor];
      
      if (!winningVendor || !rate || parseFloat(rate) <= 0) {
        missingBids.push(itm.item_name);
      } else {
        bidsToSubmit.push({
          item_code: itm.item_code,
          party_code: winningVendor,
          qty: itm.deficit_qty,
          rate: parseFloat(rate)
        });
      }
    });

    if (missingBids.length > 0) {
      showToast(`Enter quote & select a vendor for: ${missingBids.join(', ')}`, 'error');
      return;
    }

    if (bidsToSubmit.length === 0) {
      showToast('No pending requirements to process.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/procurement/po/generate', {
        mpr_no: rfpMpr.mpr_no,
        bids: bidsToSubmit
      });
      showToast(`Generated ${res.data.generated_pos.length} disaggregated Purchase Orders.`);
      setRfpMpr(null);
      setRfpEmails([]);
      setActiveTab('procurement');
      fetchInitialData();
    } catch (err) {
      showToast('Failed to generate purchase orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Receive Purchase Order (Inventory Settle Hook)
  const handleReceivePO = async (po_no) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    try {
      setLoading(true);
      await axios.put(`/api/procurement/pos/${po_no}/receive`);
      showToast(`PO ${po_no} items successfully received. Stock balance adjusted.`);
      fetchInitialData();
    } catch (err) {
      showToast('Failed to receive items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Settle PO payment status (Admin only)
  const handleTogglePayment = async (po_no, currentStatus) => {
    if (userRole !== 'Admin') {
      showToast('Permission Denied: Viewer role is read-only.', 'error');
      return;
    }
    const nextStatus = currentStatus === 'UNPAID' ? 'PAID' : 'UNPAID';
    try {
      await axios.put(`/api/procurement/pos/${po_no}/payment`, { payment_status: nextStatus });
      showToast(`PO ${po_no} marked as ${nextStatus}.`);
      fetchInitialData();
    } catch (err) {
      showToast('Failed to toggle payment status.', 'error');
    }
  };

  // Date range presets helper
  const applyDatePreset = (preset) => {
    const today = new Date();
    let start = new Date();
    
    if (preset === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      start.setMonth(today.getMonth() - 1);
    } else if (preset === 'fiscal') {
      const currentYear = today.getFullYear();
      if (today.getMonth() >= 3) {
        start = new Date(currentYear, 3, 1);
      } else {
        start = new Date(currentYear - 1, 3, 1);
      }
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  // Render company pills helper
  const renderCompanyBadge = (comp_id) => {
    return comp_id === 'NC' ? (
      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400">NC</span>
    ) : (
      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">ND</span>
    );
  };

  // 1. RENDER LOGIN SCREEN (IF NOT AUTHENTICATED)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060814] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        
        {/* Background Decorative Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-75"></div>
        
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl relative z-10 border border-slate-800/80">
          <div className="flex flex-col items-center gap-3 mb-8 text-center">
            <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-400 p-3.5 rounded-2xl shadow-xl shadow-indigo-500/10">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Nova Group</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">Production & Material Requirements Planning</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5 text-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
              <input 
                type="text"
                required
                placeholder="Enter admin or viewer"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-600 font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <input 
                type="password"
                required
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-600"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>

          {/* Credentials Helper Box */}
          <div className="mt-8 p-4 border border-slate-900 rounded-2xl bg-slate-950/40 text-xs">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <Info className="h-4 w-4 text-teal-400" />
              Mock Credentials
            </h4>
            <ul className="flex flex-col gap-1.5 text-slate-400 leading-relaxed font-mono">
              <li>• <span className="text-indigo-400">Admin</span>: admin / admin123</li>
              <li>• <span className="text-indigo-400">Viewer</span>: viewer / viewer123</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const ncCompany = companies.find(c => c.comp_id === 'NC') || {
    comp_id: 'NC',
    comp_name: 'Nova Chem Solutions',
    address: '100 Chemical Blvd, Sector 4, Ind. Area',
    email: 'contact@novachem.com',
    phone: '+1-555-0192',
    license_no: 'LIC-NC-2026-9901'
  };

  const ndCompany = companies.find(c => c.comp_id === 'ND') || {
    comp_id: 'ND',
    comp_name: 'Nova Dye & Colorants',
    address: '202 Textile park, Sector 9, Ind. Area',
    email: 'info@novadye.com',
    phone: '+1-555-0195',
    license_no: 'LIC-ND-2026-7788'
  };

  // 2. RENDER MAIN APPLICATION LOGGED IN
  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl transition-all duration-300 transform scale-100 flex items-center gap-3 border ${
          toast.type === 'error' ? 'bg-red-950/80 border-red-500 text-red-200' :
          toast.type === 'warning' ? 'bg-amber-950/80 border-amber-500 text-amber-200' :
          'bg-teal-950/80 border-teal-500 text-teal-200'
        } glass-panel`}>
          {toast.type === 'error' ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <CheckCircle className="h-5 w-5 text-teal-400" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Premium Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-400 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Layers className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Nova Group</h1>
            <p className="text-xs text-slate-400 font-medium">Production & Material Requirements Planning</p>
          </div>
        </div>

        {/* Global User profile controls (no company context switcher) */}
        <div className="flex items-center gap-4">
          
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <User className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Authenticated:</span>
            <span className="text-sm font-bold text-white">{userName}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${userRole === 'Admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>
              {userRole}
            </span>
          </div>

          <button 
            onClick={fetchInitialData}
            disabled={loading}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all hover:bg-slate-800 disabled:opacity-50"
            title="Refresh database state"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 text-sm font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-slate-950/45 border-r border-slate-900 p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 py-1">Operations</p>
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('group_master')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'group_master' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Layers className="h-4 w-4" />
            Group Master
          </button>

          <button 
            onClick={() => setActiveTab('item_master')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'item_master' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Database className="h-4 w-4" />
            Item Master
          </button>

          <button 
            onClick={() => setActiveTab('recipe_master')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'recipe_master' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Recipe Master
          </button>

          <button 
            onClick={() => setActiveTab('recipe_scaling')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'recipe_scaling' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Recipe Scaling
          </button>

          <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 py-1 mt-4">Procurement</p>

          <button 
            onClick={() => setActiveTab('mpr_ledger')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'mpr_ledger' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            MPR Ledger
          </button>

          <button 
            onClick={() => setActiveTab('po_ledger')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'po_ledger' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </button>

          <button 
            onClick={() => setActiveTab('party_master')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'party_master' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <User className="h-4 w-4" />
            Party Master
          </button>

          <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 py-1 mt-4">Security & Exports</p>
          
          <button 
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'audit' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            System Audit Log
          </button>

          <button 
            onClick={() => setActiveTab('exports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'exports' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Download className="h-4 w-4" />
            Temporal Exporter
          </button>

          {userRole === 'Admin' && (
            <>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 py-1 mt-4">System Admin</p>
              <button 
                onClick={() => setActiveTab('excel_editor')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'excel_editor' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                Excel Bulk Editor
              </button>
              <button 
                onClick={() => setActiveTab('database_admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'database_admin' ? 'bg-gradient-to-r from-indigo-950 to-indigo-900 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Sliders className="h-4 w-4 text-indigo-400" />
                Testing Tools
              </button>
            </>
          )}

          <div className="mt-auto p-4 border border-slate-900 rounded-2xl glass-card bg-slate-950/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="h-4 w-4 text-teal-400" />
              <span className="text-xs font-bold text-white">Unified System View</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Corporate entities <strong>NC</strong> and <strong>ND</strong> are displayed mixed together in all views. Colorful tags denote ownership transparently.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-[#0b0f19] p-8 overflow-y-auto">

          {/* LOADING SPINNER */}
          {loading && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-200">Updating registry state...</p>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                <p className="text-sm text-slate-400">Blended analytics metrics across both NC and ND operating companies.</p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Items</p>
                    <h3 className="text-3xl font-black text-white mt-1">{stats.items}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                      <span className="text-teal-400 font-bold">{stats.ncItems} NC</span> | <span className="text-indigo-400 font-bold">{stats.ndItems} ND</span>
                    </div>
                  </div>
                  <div className="bg-teal-500/10 p-3 rounded-xl">
                    <Database className="h-6 w-6 text-teal-400" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recipes</p>
                    <h3 className="text-3xl font-black text-white mt-1">{stats.recipes}</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">BOM definitions</p>
                  </div>
                  <div className="bg-indigo-500/10 p-3 rounded-xl">
                    <ClipboardList className="h-6 w-6 text-indigo-400" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total POs issued</p>
                    <h3 className="text-3xl font-black text-white mt-1">{stats.pos}</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Disaggregated orders</p>
                  </div>
                  <div className="bg-purple-500/10 p-3 rounded-xl">
                    <ShoppingCart className="h-6 w-6 text-purple-400" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock alerts</p>
                    <h3 className={`text-3xl font-black mt-1 ${stats.deficits > 0 ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`}>
                      {stats.deficits}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Current deficits</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stats.deficits > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                    <AlertTriangle className={`h-6 w-6 ${stats.deficits > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                  </div>
                </div>

              </div>

              {/* Operating Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div 
                  onClick={() => handleOpenCompanyModal(ncCompany)}
                  className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 flex flex-col justify-between hover:border-slate-700 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div>
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-teal-500/15 border border-teal-500/30 text-teal-400">NC</span>
                      {ncCompany.comp_name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal">
                      Specialized in industrial organic solvents, pure acids, and Nitrobenzene production. Click to view or edit full regulatory and contact profiles.
                    </p>
                    <div className="border-t border-slate-800/60 mt-4 pt-4 flex flex-col gap-1.5 text-xs text-slate-300 font-mono">
                      <div><span className="text-slate-500 font-sans">Address:</span> {ncCompany.address}</div>
                      <div><span className="text-slate-500 font-sans">Email:</span> {ncCompany.email || 'N/A'}</div>
                      <div><span className="text-slate-500 font-sans">Phone:</span> {ncCompany.phone || 'N/A'}</div>
                      <div><span className="text-slate-500 font-sans">License:</span> {ncCompany.license_no}</div>
                      <div><span className="text-slate-500 font-sans">GST No:</span> {ncCompany.gstno || 'N/A'}</div>
                      <div><span className="text-slate-500 font-sans">PAN:</span> {ncCompany.panno || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => handleOpenCompanyModal(ndCompany)}
                  className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 flex flex-col justify-between hover:border-slate-700 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div>
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">ND</span>
                      {ndCompany.comp_name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal">
                      Focuses on organic indigo dye syntheses and pigment formulations. Click to view or edit full regulatory and contact profiles.
                    </p>
                    <div className="border-t border-slate-800/60 mt-4 pt-4 flex flex-col gap-1.5 text-xs text-slate-300 font-mono">
                      <div><span className="text-slate-500 font-sans">Address:</span> {ndCompany.address}</div>
                      <div><span className="text-slate-500 font-sans">Email:</span> {ndCompany.email || 'N/A'}</div>
                      <div><span className="text-slate-500 font-sans">Phone:</span> {ndCompany.phone || 'N/A'}</div>
                      <div><span className="text-slate-500 font-sans">License:</span> {ndCompany.license_no}</div>
                      <div><span className="text-slate-500 font-sans">GST No:</span> {ndCompany.gstno || 'N/A'}</div>
                      <div><span className="text-slate-500 font-sans">PAN:</span> {ndCompany.panno || 'N/A'}</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Company Profile Edit Modal */}
              {editingCompany && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${editingCompany.comp_id === 'NC' ? 'bg-teal-500/15 border border-teal-500/30 text-teal-400' : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'}`}>
                          {editingCompany.comp_id}
                        </span>
                        Company Profile Details
                      </h3>
                      <button onClick={() => setEditingCompany(null)} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleUpdateCompany} className="flex flex-col gap-4 text-sm">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Company Name</label>
                        <input 
                          type="text" 
                          required
                          disabled={userRole !== 'Admin'}
                          value={companyFormData.comp_name}
                          onChange={(e) => setCompanyFormData({...companyFormData, comp_name: e.target.value})}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Operating Address</label>
                        <textarea 
                          rows="2"
                          required
                          disabled={userRole !== 'Admin'}
                          value={companyFormData.address}
                          onChange={(e) => setCompanyFormData({...companyFormData, address: e.target.value})}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Email Contact</label>
                          <input 
                            type="email" 
                            required
                            disabled={userRole !== 'Admin'}
                            value={companyFormData.email}
                            onChange={(e) => setCompanyFormData({...companyFormData, email: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Phone No</label>
                          <input 
                            type="text" 
                            required
                            disabled={userRole !== 'Admin'}
                            value={companyFormData.phone}
                            onChange={(e) => setCompanyFormData({...companyFormData, phone: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">License / Regulatory No</label>
                        <input 
                          type="text" 
                          required
                          disabled={userRole !== 'Admin'}
                          value={companyFormData.license_no}
                          onChange={(e) => setCompanyFormData({...companyFormData, license_no: e.target.value})}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">GST Number</label>
                          <input 
                            type="text" 
                            disabled={userRole !== 'Admin'}
                            value={companyFormData.gstno || ''}
                            onChange={(e) => setCompanyFormData({...companyFormData, gstno: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50 font-mono uppercase"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">PAN Number</label>
                          <input 
                            type="text" 
                            disabled={userRole !== 'Admin'}
                            value={companyFormData.panno || ''}
                            onChange={(e) => setCompanyFormData({...companyFormData, panno: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50 font-mono uppercase"
                          />
                        </div>
                      </div>

                      {userRole !== 'Admin' && (
                        <div className="bg-amber-950/20 border border-amber-900/30 text-amber-400 p-2.5 rounded-xl text-xs flex gap-2">
                          <Info className="h-4 w-4 shrink-0" />
                          <span>Viewing in read-only mode. Only administrators can save modifications.</span>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-2 border-t border-slate-800 pt-4">
                        <button 
                          type="button"
                          onClick={() => setEditingCompany(null)}
                          className="bg-slate-950 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Close
                        </button>
                        {userRole === 'Admin' && (
                          <button 
                            type="submit"
                            className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          >
                            Save Changes
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GROUP MASTER TAB */}
          {activeTab === 'group_master' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Item Group Master Registry</h2>
                  <p className="text-sm text-slate-400">Create, view, edit, and delete item group definitions for code auto-generation prefixes.</p>
                </div>
                {userRole === 'Admin' && (
                  <button 
                    onClick={() => {
                      setGroupFormData({ itg_code: '[Auto]', itg_name: '', prefix: '', last_sequence: 0 });
                      setEditingGroup(null);
                      setNewGroupModal(true);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Group
                  </button>
                )}
              </div>

              {/* Group Grid (Table) View */}
              <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Group Code</th>
                        <th className="py-4 px-6">Group Name</th>
                        <th className="py-4 px-6">Prefix Format</th>
                        <th className="py-4 px-6">CG Key</th>
                        <th className="py-4 px-6">Sequence</th>
                        {userRole === 'Admin' && <th className="py-4 px-6 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {groups.map((group) => (
                        <tr key={group.itg_code} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-4 px-6 font-semibold">
                            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20 uppercase">
                              {group.itg_code}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-white">{group.itg_name}</td>
                          <td className="py-4 px-6 font-mono text-slate-300 font-bold">{group.prefix}</td>
                          <td className="py-4 px-6 font-mono text-slate-400">{group.itg_cgkey}</td>
                          <td className="py-4 px-6 text-slate-400 font-bold font-mono">{group.last_sequence}</td>
                          {userRole === 'Admin' && (
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingGroup(group);
                                    setGroupFormData({
                                      itg_code: group.itg_code,
                                      itg_name: group.itg_name,
                                      prefix: group.prefix,
                                      last_sequence: group.last_sequence
                                    });
                                    setNewGroupModal(true);
                                  }}
                                  className="px-3 py-1.5 text-center bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white text-[11px] font-bold rounded-lg hover:bg-indigo-900/45 transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(group.itg_code)}
                                  className="px-3 py-1.5 text-center bg-slate-900 border border-slate-800 text-red-400 hover:text-red-300 text-[11px] font-bold rounded-lg hover:bg-red-950/20 hover:border-red-900 transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Group CRUD Modal */}
              {newGroupModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <h3 className="text-lg font-bold text-white">{editingGroup ? 'Edit Group Details' : 'Create New Item Group'}</h3>
                      <button onClick={() => setNewGroupModal(false)} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup} className="flex flex-col gap-4 text-sm">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Group Code (ID)</label>
                        <input 
                          type="text" 
                          required
                          disabled={true}
                          value={editingGroup ? groupFormData.itg_code : '[Auto]'}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Group Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Organic Solvents"
                          value={groupFormData.itg_name}
                          onChange={(e) => setGroupFormData({...groupFormData, itg_name: e.target.value})}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Code Prefix</label>
                          <input 
                            type="text" 
                            required
                            maxLength="4"
                            placeholder="e.g. SV"
                            value={groupFormData.prefix}
                            onChange={(e) => setGroupFormData({...groupFormData, prefix: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Last Sequence</label>
                          <input 
                            type="number" 
                            required
                            placeholder="e.g. 0"
                            value={groupFormData.last_sequence}
                            onChange={(e) => setGroupFormData({...groupFormData, last_sequence: parseInt(e.target.value)})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                        <button 
                          type="button" 
                          onClick={() => setNewGroupModal(false)}
                          className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 font-semibold hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 rounded-xl text-white font-semibold hover:bg-indigo-500 transition-colors"
                        >
                          {editingGroup ? 'Update Group' : 'Save Group'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ITEM MASTER TAB */}
          {activeTab === 'item_master' && (
            <div className="flex flex-col gap-6">
              
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Item Master Registry (Unified)</h2>
                  <p className="text-sm text-slate-400">Warehouse balances, GST percentages, and min/reorder levels for both companies.</p>
                </div>
                
                <div className="flex gap-3">
                  {userRole === 'Admin' && (
                    <button 
                      onClick={() => {
                        setEditingItem(null);
                        setNewItemData({
                          item_name: '', itg_code: 'R00001', comp_id: 'NC', units: 'KG', gst_pr: 18,
                          packing: '', bal_qt: 0, min_qt: 0, ror_qt: 0, lead_time: 5, pack_qty: 1,
                          is_lic: false, is_imp: false
                        });
                        setNewItemModal(true);
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Item
                    </button>
                  )}
                </div>
              </div>

              {/* Filters / Search */}
              <div className="flex gap-4 items-center bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search by name or code..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold uppercase">Group:</span>
                  <select 
                    value={itemGroupFilter} 
                    onChange={(e) => setItemGroupFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Groups</option>
                    {groups.map(g => (
                      <option key={g.itg_code} value={g.itg_code}>{g.itg_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Comp</th>
                      <th className="py-4 px-6 min-w-[200px]">Item Name</th>
                      <th className="py-4 px-8 min-w-[160px]" >Group</th>
                      <th className="py-4 px-2 text-center">Stk Qty</th>
                      <th className="py-4 px-2">Units</th>
                      {/* <th className="py-4 px-2 text-right">GST %</th> */}
                      <th className="py-4 px-2 text-right">Min Qty</th>
                      <th className="py-4 px-2 text-right">Last Rate</th>
                      <th className="py-4 px-2">Status</th>
                      {userRole === 'Admin' && <th className="py-4 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {items
                      .filter(itm => {
                        const matchesSearch = itm.item_name.toLowerCase().includes(itemSearch.toLowerCase()) || itm.item_code.toLowerCase().includes(itemSearch.toLowerCase());
                        const matchesGroup = itemGroupFilter === 'ALL' || itm.itg_code === itemGroupFilter;
                        return matchesSearch && matchesGroup;
                      })
                      .map((itm) => {
                        const isLow = itm.bal_qt < itm.min_qt;
                        return (
                          <tr key={itm.item_code} className="hover:bg-slate-900/30 transition-colors cursor-pointer" onClick={() => {
                            setSelectedItemForDetails(itm);
                            fetchItemVendors(itm.item_code);
                            setItemDetailsModal(true);
                          }}>
                            <td className="py-4 px-6">{renderCompanyBadge(itm.comp_id)}</td>
                            {/* <td className="py-4 px-6 font-mono font-bold text-indigo-400">{itm.item_code}</td> */}
                            <td className="py-4 px-2 text-white font-medium">{itm.item_name}</td>
                            <td className="py-4 px-6">
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold text-indigo-400 ">
                                {groups.find(group => group.itg_code === itm.itg_code)?.itg_name ?? itm.itg_code}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-white" onClick={(e) => e.stopPropagation()}>
                              {userRole === 'Admin' ? (
                                <input 
                                  type="number"
                                  defaultValue={itm.bal_qt}
                                  onBlur={(e) => handleAdjustBalance(itm.item_code, e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right text-white font-bold w-24 text-sm focus:border-indigo-500 focus:outline-none font-mono"
                                />
                              ) : (
                                <span>{itm.bal_qt}</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-400 text-xs uppercase">{itm.units}</td>
                            {/* <td className="py-4 px-6 text-right text-slate-300">{itm.gst_pr}%</td> */}
                            <td className="py-4 px-6 text-right text-slate-300">{itm.min_qt}</td>
                            <td className="py-4 px-6 text-right font-semibold text-teal-400 font-mono">₹{itm.last_rate}</td>
                            <td className="py-4 px-6">
                              {isLow ? (
                                <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg w-fit">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {/* Deficit */}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg w-fit">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  {/* Sufficient */}
                                </span>
                              )}
                            </td>
                            {userRole === 'Admin' && (
                              <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    onClick={() => {
                                      setEditingItem(itm);
                                      setItemFormData({
                                        item_name: itm.item_name,
                                        itg_code: itm.itg_code,
                                        comp_id: itm.comp_id,
                                        units: itm.units,
                                        gst_pr: itm.gst_pr,
                                        packing: itm.packing,
                                        bal_qt: itm.bal_qt,
                                        min_qt: itm.min_qt,
                                        ror_qt: itm.ror_qt,
                                        lead_time: itm.lead_time,
                                        pack_qty: itm.pack_qty,
                                        is_lic: itm.is_lic,
                                        is_imp: itm.is_imp,
                                        last_rate: itm.last_rate
                                      });
                                      setNewItemModal(true);
                                    }}
                                    className="text-xs bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-850 transition-all cursor-pointer font-bold"
                                    title="Edit details"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteItem(itm.item_code)}
                                    className="text-xs bg-slate-900 border border-slate-800 text-red-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-red-950/20 hover:border-red-900 transition-all cursor-pointer font-bold"
                                    title="Delete item"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                  </table>
                </div>
              </div>

              {/* Create/Edit Item Modal (Unified Code Auto-Generation) */}
              {newItemModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${editingItem ? 'max-w-xl' : 'max-w-3xl'}`}>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <h3 className="text-lg font-bold text-white">{editingItem ? `Edit Details for ${editingItem.item_code}` : 'Create New Item'}</h3>
                      <button onClick={() => setNewItemModal(false)} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem} className="flex flex-col gap-4 text-sm overflow-y-auto flex-1 pr-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Item Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Toluene"
                          value={editingItem ? itemFormData.item_name : newItemData.item_name}
                          onChange={(e) => {
                            if (editingItem) setItemFormData({...itemFormData, item_name: e.target.value});
                            else setNewItemData({...newItemData, item_name: e.target.value});
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Item Group</label>
                          <select 
                            value={editingItem ? itemFormData.itg_code : newItemData.itg_code}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, itg_code: e.target.value});
                              else setNewItemData({...newItemData, itg_code: e.target.value});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                          >
                            {groups.map(g => (
                              <option key={g.itg_code} value={g.itg_code}>{g.itg_code} - {g.itg_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Company (Ownership)</label>
                          <select 
                            value={editingItem ? itemFormData.comp_id : newItemData.comp_id}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, comp_id: e.target.value});
                              else setNewItemData({...newItemData, comp_id: e.target.value});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="NC">NC - Nova Chem Solutions</option>
                            <option value="ND">ND - Nova Dye & Colorants</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">UOM (Units)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. KG"
                            value={editingItem ? itemFormData.units : newItemData.units}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, units: e.target.value.toUpperCase()});
                              else setNewItemData({...newItemData, units: e.target.value.toUpperCase()});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono uppercase"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">GST Rate %</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={editingItem ? itemFormData.gst_pr : newItemData.gst_pr}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, gst_pr: parseFloat(e.target.value)});
                              else setNewItemData({...newItemData, gst_pr: parseFloat(e.target.value)});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Last Rate (₹)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editingItem ? itemFormData.last_rate : newItemData.last_rate}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, last_rate: parseFloat(e.target.value)});
                              else setNewItemData({...newItemData, last_rate: parseFloat(e.target.value)});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Minimum Stock Level</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editingItem ? itemFormData.min_qt : newItemData.min_qt}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, min_qt: parseFloat(e.target.value)});
                              else setNewItemData({...newItemData, min_qt: parseFloat(e.target.value)});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Reorder Level</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editingItem ? itemFormData.ror_qt : newItemData.ror_qt}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, ror_qt: parseFloat(e.target.value)});
                              else setNewItemData({...newItemData, ror_qt: parseFloat(e.target.value)});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Packing Style</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 200L Drum"
                            value={editingItem ? itemFormData.packing : newItemData.packing}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, packing: e.target.value});
                              else setNewItemData({...newItemData, packing: e.target.value});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Pack Size Qty</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={editingItem ? itemFormData.pack_qty : newItemData.pack_qty}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, pack_qty: parseFloat(e.target.value)});
                              else setNewItemData({...newItemData, pack_qty: parseFloat(e.target.value)});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Lead Time (Days)</label>
                          <input 
                            type="number" 
                            value={editingItem ? itemFormData.lead_time : newItemData.lead_time}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, lead_time: parseInt(e.target.value)});
                              else setNewItemData({...newItemData, lead_time: parseInt(e.target.value)});
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Checkboxes row */}
                      <div className="flex gap-6 mt-2">
                        <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={editingItem ? itemFormData.is_lic : newItemData.is_lic}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, is_lic: e.target.checked});
                              else setNewItemData({...newItemData, is_lic: e.target.checked});
                            }}
                            className="accent-indigo-500 cursor-pointer h-4 w-4"
                          />
                          Requires License
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={editingItem ? itemFormData.is_imp : newItemData.is_imp}
                            onChange={(e) => {
                              if (editingItem) setItemFormData({...itemFormData, is_imp: e.target.checked});
                              else setNewItemData({...newItemData, is_imp: e.target.checked});
                            }}
                            className="accent-indigo-500 cursor-pointer h-4 w-4"
                          />
                          Imported Material
                        </label>
                      </div>

                      {!editingItem && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Opening Balance Qty</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={newItemData.bal_qt}
                              onChange={(e) => setNewItemData({...newItemData, bal_qt: parseFloat(e.target.value)})}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-3 mt-2 border-t border-slate-800/60 pt-3">
                            <label className="text-xs font-bold text-slate-400 uppercase">Initial Offering Suppliers</label>
                            
                            {newItemOfferings.length > 0 && (
                              <div className="border border-slate-800 rounded-xl overflow-hidden mb-2">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-500 font-bold uppercase">
                                      <th className="py-2 px-3">Supplier</th>
                                      <th className="py-2 px-3">Last Rate</th>
                                      <th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                                    {newItemOfferings.map((off, oIdx) => (
                                      <tr key={oIdx}>
                                        <td className="py-2 px-3 text-white font-medium">{off.party_code}</td>
                                        <td className="py-2 px-3 text-slate-300">{off.last_rate !== '' ? `₹${off.last_rate}` : 'N/A'}</td>
                                        <td className="py-2 px-3 text-right">
                                          <button 
                                            type="button" 
                                            onClick={() => setNewItemOfferings(newItemOfferings.filter((_, i) => i !== oIdx))}
                                            className="text-red-400 hover:text-red-300 font-semibold"
                                          >
                                            Remove
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="flex gap-2 items-end">
                              <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Select Supplier</span>
                                <select 
                                  value={itemVendorCode}
                                  onChange={(e) => setItemVendorCode(e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                >
                                  <option value="">-- Select Supplier --</option>
                                  {vendors.map(v => (
                                    <option key={v.party_code} value={v.party_code}>{v.party_code} - {v.party_name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Rate (₹)</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="N/A"
                                  value={itemVendorLastRate}
                                  onChange={(e) => setItemVendorLastRate(e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none text-right font-mono"
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (!itemVendorCode) {
                                    showToast('Please select a supplier.', 'error');
                                    return;
                                  }
                                  if (newItemOfferings.some(off => off.party_code === itemVendorCode)) {
                                    showToast('Supplier already added to offerings list.', 'error');
                                    return;
                                  }
                                  setNewItemOfferings([...newItemOfferings, {
                                    party_code: itemVendorCode,
                                    last_rate: itemVendorLastRate
                                  }]);
                                  setItemVendorCode('');
                                  setItemVendorLastRate('');
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer h-fit"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      <button 
                        type="submit"
                        className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
                      >
                        {editingItem ? 'Save Item Changes' : 'Generate & Save Item'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Item Details drawer/modal */}
              {itemDetailsModal && selectedItemForDetails && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-end p-0">
                  <div className="bg-slate-900 border-l border-slate-800 h-full w-full max-w-lg p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
                    <div className="flex-1 flex flex-col overflow-y-auto pr-1">
                      
                      <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono tracking-wider mr-2">{selectedItemForDetails.comp_id}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">{selectedItemForDetails.item_code}</span>
                          <h3 className="text-xl font-bold text-white mt-1">{selectedItemForDetails.item_name}</h3>
                        </div>
                        <button onClick={() => setItemDetailsModal(false)} className="text-slate-500 hover:text-slate-200 p-1 bg-slate-950/40 border border-slate-850 rounded-lg">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-950/30 border border-slate-850 p-4 rounded-xl mb-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Item Group</p>
                          <p className="text-sm font-semibold text-white mt-0.5">{selectedItemForDetails.itg_code}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">UOM (Units)</p>
                          <p className="text-sm font-semibold text-white mt-0.5 uppercase">{selectedItemForDetails.units}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Packing Style</p>
                          <p className="text-sm font-semibold text-white mt-0.5">{selectedItemForDetails.packing || 'Bulk'} ({selectedItemForDetails.pack_qty || 1} qty)</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">GST Rate</p>
                          <p className="text-sm font-semibold text-white mt-0.5">{selectedItemForDetails.gst_pr}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Min Balance</p>
                          <p className="text-sm font-semibold text-white mt-0.5">{selectedItemForDetails.min_qt} {selectedItemForDetails.units}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Last Rate Paid</p>
                          <p className="text-sm font-bold text-teal-400 mt-0.5">₹{selectedItemForDetails.last_rate}</p>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Suppliers offering this item</h4>
                        
                        {itemVendorsList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 bg-slate-950/20 border border-dashed border-slate-850 rounded-xl text-center">
                            <User className="h-8 w-8 text-slate-600 mb-2" />
                            <p className="text-xs font-semibold text-slate-400">No offering suppliers registered</p>
                            <p className="text-[10px] text-slate-500 mt-1 max-w-[250px]">To add supplier pricing, select a supplier below and stage their pricing matrix.</p>
                          </div>
                        ) : (
                          <div className="border border-slate-850 rounded-xl overflow-hidden mb-6">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-500 font-bold uppercase">
                                  <th className="py-2.5 px-4">Supplier</th>
                                  <th className="py-2.5 px-4 text-right">Last Rate</th>
                                  {userRole === 'Admin' && <th className="py-2.5 px-4 text-right">Action</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                                {itemVendorsList.map((vend, vIdx) => (
                                  <tr key={vIdx} className="hover:bg-slate-950/10">
                                    <td className="py-2.5 px-4">
                                      <p className="font-semibold text-white">{vend.party_name}</p>
                                      <p className="text-[10px] text-slate-500 font-mono">{vend.party_code}</p>
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-teal-400">
                                      {vend.last_rate !== null ? `₹${vend.last_rate.toFixed(2)}` : 'N/A'}
                                    </td>
                                    {userRole === 'Admin' && (
                                      <td className="py-2.5 px-4 text-right">
                                        <button 
                                          onClick={async () => {
                                            if (!window.confirm("Remove this supplier offering?")) return;
                                            setLoading(true);
                                            try {
                                              await axios.delete(`/api/inventory/items/${selectedItemForDetails.item_code}/vendors/${vend.party_code}`);
                                              showToast('Supplier offering removed.');
                                              fetchItemVendors(selectedItemForDetails.item_code);
                                            } catch (err) {
                                              showToast(err.response?.data?.error || 'Failed to remove supplier offering.', 'error');
                                            } finally {
                                              setLoading(false);
                                            }
                                          }}
                                          className="text-red-400 hover:text-red-300 font-bold"
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {userRole === 'Admin' && (
                          <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl mt-4">
                            <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-3">Add Supplier Offering</h5>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Select Supplier</span>
                                <select 
                                  value={itemVendorCode}
                                  onChange={(e) => setItemVendorCode(e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                >
                                  <option value="">-- Select --</option>
                                  {vendors.map(v => (
                                    <option key={v.party_code} value={v.party_code}>{v.party_code} - {v.party_name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24 flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Rate (₹)</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="N/A"
                                  value={itemVendorLastRate}
                                  onChange={(e) => setItemVendorLastRate(e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none text-right font-mono"
                                />
                              </div>
                              <button 
                                onClick={async () => {
                                  if (!itemVendorCode) {
                                    showToast('Please select a supplier.', 'error');
                                    return;
                                  }
                                  setLoading(true);
                                  try {
                                    await axios.post(`/api/inventory/items/${selectedItemForDetails.item_code}/vendors`, {
                                      party_code: itemVendorCode,
                                      last_rate: itemVendorLastRate
                                    });
                                    showToast('Supplier offering registered successfully.');
                                    setItemVendorCode('');
                                    setItemVendorLastRate('');
                                    fetchItemVendors(selectedItemForDetails.item_code);
                                  } catch (err) {
                                    showToast(err.response?.data?.error || 'Failed to add supplier offering.', 'error');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition-all cursor-pointer h-fit"
                              >
                                Add Supplier
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RECIPE MASTER TAB */}
          {activeTab === 'recipe_master' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Recipe Master Registry</h2>
                  <p className="text-sm text-slate-400">Manage recipes and bills of materials (BOM) definitions for both corporate entities.</p>
                </div>
                {userRole === 'Admin' && (
                  <button 
                    onClick={() => {
                      setRecipeFormData({ rcp_name: '', rcp_yield: 100.0, comp_id: 'NC', ingredients: [] });
                      setEditingRecipe(null);
                      setIngItemCode('');
                      setIngQty('');
                      setNewRecipeModal(true);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Recipe
                  </button>
                )}
              </div>

              {/* Recipe Grid List Table */}
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-4">Comp</th>
                        <th className="py-4 px-4 font-mono">Recipe Code</th>
                        <th className="py-4 px-4">Recipe Name</th>
                        <th className="py-4 px-4 text-right">Yield</th>
                        {userRole === 'Admin' && <th className="py-4 px-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm">
                      {recipes.map((rcp) => (
                        <tr
                          key={rcp.rcp_code}
                          className="hover:bg-slate-900/30 transition-colors cursor-pointer"
                          onClick={() => fetchRecipeDetailsAndOpen(rcp)}
                        >
                          <td className="py-4 px-6">{renderCompanyBadge(rcp.comp_id)}</td>
                          <td className="py-4 px-6 font-mono font-bold text-indigo-400">{rcp.rcp_code}</td>
                          <td className="py-4 px-6 text-white font-medium">{rcp.rcp_name}</td>
                          <td className="py-4 px-6 text-right font-mono font-bold text-slate-300">
                            {rcp.rcp_yield} KG
                          </td>
                          {userRole === 'Admin' && (
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={async () => {
                                    setLoading(true);
                                    try {
                                      const res = await axios.get(`/api/recipes/${rcp.rcp_code}`);
                                      setEditingRecipe(rcp);
                                      setRecipeFormData({
                                        rcp_name: res.data.rcp_name,
                                        rcp_yield: res.data.rcp_yield,
                                        comp_id: res.data.comp_id,
                                        ingredients: res.data.ingredients.map(ing => ({
                                          item_code: ing.item_code,
                                          item_name: ing.item_name,
                                          item_qty: ing.item_qty
                                        }))
                                      });
                                      setIngItemCode('');
                                      setIngQty('');
                                      setNewRecipeModal(true);
                                    } catch (e) {
                                      showToast('Failed to load recipe details.', 'error');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="text-xs bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer font-bold"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRecipe(rcp.rcp_code)}
                                  className="text-xs bg-slate-900 border border-slate-800 text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-950/20 hover:border-red-900 transition-all cursor-pointer font-bold"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recipe Modal */}
              {newRecipeModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <h3 className="text-lg font-bold text-white">{editingRecipe ? 'Edit Recipe Sheet' : 'Create Recipe Sheet'}</h3>
                      <button onClick={() => setNewRecipeModal(false)} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={editingRecipe ? handleUpdateRecipe : handleCreateRecipe} className="flex flex-col gap-4 text-sm overflow-y-auto flex-1 pr-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Recipe Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Acid Dilution Sheet"
                          value={recipeFormData.rcp_name}
                          onChange={(e) => setRecipeFormData({...recipeFormData, rcp_name: e.target.value})}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Company Owner</label>
                          <select 
                            value={recipeFormData.comp_id}
                            onChange={(e) => setRecipeFormData({...recipeFormData, comp_id: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white cursor-pointer focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="NC">NC (Nova Chem)</option>
                            <option value="ND">ND (Nova Dye)</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Yield Output (KG)</label>
                          <input 
                            type="number" 
                            required
                            step="0.1"
                            value={recipeFormData.rcp_yield}
                            onChange={(e) => setRecipeFormData({...recipeFormData, rcp_yield: parseFloat(e.target.value)})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Ingredients Management Area */}
                      <div className="border-t border-slate-800/80 pt-4 mt-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Manage Ingredients</h4>
                        
                        {/* Add ingredient controls */}
                        <div className="flex gap-2 mb-4">
                          <div className="flex-1">
                            <select
                              value={ingItemCode}
                              onChange={(e) => setIngItemCode(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            >
                              <option value="">Select Item...</option>
                              {items.map(itm => (
                                <option key={itm.item_code} value={itm.item_code}>
                                  {itm.item_name} ({itm.item_code})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={ingQty}
                              onChange={(e) => setIngQty(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!ingItemCode || !ingQty || parseFloat(ingQty) <= 0) {
                                showToast('Select an item and quantity.', 'error');
                                return;
                              }
                              const selected = items.find(itm => itm.item_code === ingItemCode);
                              if (!selected) return;

                              const exists = recipeFormData.ingredients.some(ing => ing.item_code === ingItemCode);
                              if (exists) {
                                showToast('Ingredient already added.', 'error');
                                return;
                              }

                              setRecipeFormData({
                                ...recipeFormData,
                                ingredients: [
                                  ...recipeFormData.ingredients,
                                  {
                                    item_code: selected.item_code,
                                    item_name: selected.item_name,
                                    item_qty: parseFloat(ingQty)
                                  }
                                ]
                              });
                              setIngItemCode('');
                              setIngQty('');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-bold"
                          >
                            Add
                          </button>
                        </div>

                        {/* List of currently added ingredients */}
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {recipeFormData.ingredients.map((ing, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 px-3 py-2 rounded-xl text-xs">
                              <span className="text-white font-medium">{ing.item_name} <span className="text-[10px] text-slate-500 font-mono">({ing.item_code})</span></span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-300 font-mono">{ing.item_qty} KG</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecipeFormData({
                                      ...recipeFormData,
                                      ingredients: recipeFormData.ingredients.filter(i => i.item_code !== ing.item_code)
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-400 font-bold"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                          {recipeFormData.ingredients.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-xl">No ingredients added yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                        <button 
                          type="button" 
                          onClick={() => setNewRecipeModal(false)}
                          className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 font-semibold hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 rounded-xl text-white font-semibold hover:bg-indigo-500 transition-colors"
                        >
                          {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Recipe Details & Feasibility Modal */}
              {recipeDetailsModal && selectedRecipeForDetails && (() => {
                const targetYieldVal = parseFloat(detailsTargetYield);
                const standardYield = selectedRecipeForDetails.rcp_yield || 100.0;
                const scaleRatio = isNaN(targetYieldVal) || targetYieldVal <= 0 ? 0 : targetYieldVal / standardYield;

                let hasDeficits = false;
                const scaledIngredients = selectedRecipeForDetails.ingredients.map(ing => {
                  const scaledReq = ing.item_qty * scaleRatio;
                  const matchedItem = items.find(itm => itm.item_code === ing.item_code);
                  const bal_qt = matchedItem ? matchedItem.bal_qt : 0.0;
                  const units = matchedItem ? matchedItem.units : 'KG';
                  const deficit = Math.max(0, scaledReq - bal_qt);
                  if (deficit > 0) {
                    hasDeficits = true;
                  }
                  return {
                    item_code: ing.item_code,
                    item_name: ing.item_name,
                    req_qty: scaledReq,
                    bal_qt: bal_qt,
                    deficit_qty: deficit,
                    units: units
                  };
                });

                return (
                  <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      
                      {/* Header */}
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-white">{selectedRecipeForDetails.rcp_name}</h3>
                            {renderCompanyBadge(selectedRecipeForDetails.comp_id)}
                            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                              {selectedRecipeForDetails.rcp_code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Recipe specifications, standard inputs, and production feasibility checker.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setRecipeDetailsModal(false);
                            setSelectedRecipeForDetails(null);
                            setDetailsTargetYield('');
                          }} 
                          className="text-slate-500 hover:text-slate-200"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6">
                        
                        {/* Specs row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-800/80 bg-slate-950/20 rounded-2xl text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Company Owner</span>
                            <span className="text-slate-200 font-medium">{selectedRecipeForDetails.comp_id === 'NC' ? 'Nova Chem Solutions' : 'Nova Dye & Colorants'}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Standard Yield</span>
                            <span className="text-slate-250 font-bold">{selectedRecipeForDetails.rcp_yield} KG</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Total Unique Ingredients</span>
                            <span className="text-slate-200 font-medium">{selectedRecipeForDetails.ingredients.length} items</span>
                          </div>
                        </div>

                        {/* Feasibility Calculator */}
                        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/15 flex flex-col gap-4">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Sliders className="h-4 w-4 text-indigo-400" />
                            Feasibility Checker & Yield Scaling
                          </h4>
                          
                          <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-400 uppercase">Target Yield Production Output (KG)</label>
                              <input 
                                type="number" 
                                step="0.1"
                                placeholder="Enter yield to scale..."
                                value={detailsTargetYield}
                                onChange={(e) => setDetailsTargetYield(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-indigo-500 focus:outline-none w-full max-w-xs"
                              />
                            </div>
                            
                            {hasDeficits ? (
                              <span className="flex items-center gap-1.5 text-amber-500 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg h-fit">
                                <AlertTriangle className="h-4 w-4" />
                                Deficits Identified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg h-fit">
                                <CheckCircle className="h-4 w-4" />
                                Stock Sufficient
                              </span>
                            )}
                          </div>

                          {/* Dynamic Ingredient Table */}
                          <div className="border border-slate-800/80 rounded-xl overflow-hidden mt-2">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase">
                                  <th className="py-3 px-4">Ingredient Name</th>
                                  <th className="py-3 px-4 font-mono">Code</th>
                                  <th className="py-3 px-4 text-right">Scaled Needed</th>
                                  <th className="py-3 px-4 text-right">In Stock</th>
                                  <th className="py-3 px-4 text-right">Deficit Shortage</th>
                                  <th className="py-3 px-4">Units</th>
                                  <th className="py-3 px-4">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
                                {scaledIngredients.map((ing) => {
                                  const hasShortage = ing.deficit_qty > 0;
                                  return (
                                    <tr key={ing.item_code} className="hover:bg-slate-900/10 transition-all">
                                      <td className="py-3 px-4 text-white font-medium">{ing.item_name}</td>
                                      <td className="py-3 px-4 font-mono text-indigo-400">{ing.item_code}</td>
                                      <td className="py-3 px-4 text-right font-mono font-bold text-white">{ing.req_qty.toFixed(2)}</td>
                                      <td className="py-3 px-4 text-right font-mono text-slate-400">{ing.bal_qt.toFixed(2)}</td>
                                      <td className={`py-3 px-4 text-right font-mono font-bold ${hasShortage ? 'text-red-500' : 'text-slate-500'}`}>
                                        {hasShortage ? ing.deficit_qty.toFixed(2) : '-'}
                                      </td>
                                      <td className="py-3 px-4 text-slate-500 text-xs uppercase">{ing.units}</td>
                                      <td className="py-3 px-4">
                                        {hasShortage ? (
                                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Shortage</span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">In Stock</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>

                      {/* Footer Actions */}
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                        <button 
                          type="button" 
                          onClick={() => {
                            setRecipeDetailsModal(false);
                            setSelectedRecipeForDetails(null);
                            setDetailsTargetYield('');
                          }}
                          className="px-4 py-2.5 border border-slate-800 rounded-xl text-slate-400 font-semibold hover:bg-slate-800 hover:text-slate-200 transition-colors text-sm"
                        >
                          Close Details
                        </button>
                        <button
                          type="button"
                          disabled={userRole !== 'Admin' || !hasDeficits}
                          onClick={handleCreateMprFromDetails}
                          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg select-none ${
                            hasDeficits && userRole === 'Admin'
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                          }`}
                          title={userRole !== 'Admin' ? 'Viewer role is read-only' : !hasDeficits ? 'No deficits to purchase' : 'Create outbound Material Purchase Requirement'}
                        >
                          {userRole !== 'Admin' ? 'Create MPR (Admin Only)' : 'Create MPR'}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* RECIPE SCALING CALCULATOR TAB */}
          {activeTab === 'recipe_scaling' && (
            <div className="flex flex-col gap-6">
              
              <div>
                <h2 className="text-2xl font-bold text-white">Recipe Material Requirements Planning (MRP)</h2>
                <p className="text-sm text-slate-400">Select a recipe, enter the target yield, and calculate if you can make X quantity and check ingredient requirements.</p>
              </div>

              {/* Selector Screen */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 flex flex-col gap-4">
                <form onSubmit={handleScaleRecipe} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">1. Select Recipe Sheet</label>
                    <select
                      value={selectedRecipe ? selectedRecipe.rcp_code : ''}
                      onChange={async (e) => {
                        const code = e.target.value;
                        if (!code) {
                          setSelectedRecipe(null);
                          setScalingResult(null);
                          return;
                        }
                        const rcp = recipes.find(r => r.rcp_code === code);
                        if (rcp) {
                          setLoading(true);
                          try {
                            const res = await axios.get(`/api/recipes/${code}`);
                            setSelectedRecipe(res.data);
                            setScaleYield(res.data.rcp_yield);
                            setScalingResult(null);
                          } catch (err) {
                            showToast('Failed to load recipe details.', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold cursor-pointer focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="">Select recipe...</option>
                      {recipes.map(r => (
                        <option key={r.rcp_code} value={r.rcp_code}>{r.rcp_name} ({r.rcp_code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">2. Targeted Yield Quantity (KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 500.0"
                      value={scaleYield}
                      onChange={(e) => setScaleYield(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                  >
                    Calculate & Check Requirements
                  </button>
                </form>
              </div>

              {/* Scaling Results */}
              {scalingResult && selectedRecipe && (
                <div className="flex flex-col gap-6">
                  
                  <div className="flex justify-between items-center bg-slate-950/45 p-4 rounded-xl border border-slate-900">
                    <div className="flex items-center gap-3">
                      {renderCompanyBadge(selectedRecipe.comp_id)}
                      <div>
                        <h4 className="text-base font-bold text-white">{selectedRecipe.rcp_name}</h4>
                        <p className="text-xs text-slate-400">Yield target: {scaleYield} KG (vs standard yield of {selectedRecipe.rcp_yield} KG)</p>
                      </div>
                    </div>
                    {scalingResult.has_deficits ? (
                      <span className="flex items-center gap-1.5 text-amber-500 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        Deficits Found - Sourcing Staged
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="h-4 w-4" />
                        Inventory Sufficient
                      </span>
                    )}
                  </div>

                  {/* Ingredients scale table */}
                  <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-4 px-6">Ingredient Name</th>
                          <th className="py-4 px-6 font-mono">Item Code</th>
                          <th className="py-4 px-6 text-right">Scaled Needed</th>
                          <th className="py-4 px-6 text-right">Current Stock Balance</th>
                          <th className="py-4 px-6 text-right">Deficit Shortage</th>
                          <th className="py-4 px-6">Units</th>
                          <th className="py-4 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm">
                        {scalingResult.results.map((res) => {
                          const hasShortage = res.deficit_qty > 0;
                          return (
                            <tr key={res.item_code} className="hover:bg-slate-900/10 transition-all">
                              <td className="py-4 px-6 text-white font-medium">{res.item_name}</td>
                              <td className="py-4 px-6 font-mono text-indigo-400">{res.item_code}</td>
                              <td className="py-4 px-6 text-right font-mono font-bold text-white">{res.req_qty.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right font-mono text-slate-300">{res.bal_qt.toFixed(2)}</td>
                              <td className={`py-4 px-6 text-right font-mono font-bold ${hasShortage ? 'text-red-500' : 'text-slate-500'}`}>
                                {hasShortage ? res.deficit_qty.toFixed(2) : '-'}
                              </td>
                              <td className="py-4 px-6 text-slate-400 text-xs uppercase">{res.units}</td>
                              <td className="py-4 px-6">
                                {hasShortage ? (
                                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Shortage</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">In Stock</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                  {/* Deficit Staging Alert */}
                  {scalingResult.has_deficits && (
                    <div className="bg-amber-950/20 border border-amber-900/50 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Deficits Staged under {scalingResult.mpr_no}</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            An outbound Material Purchase Requirement (MPR) entry has been automatically staged. Settle with vendor bid collection immediately.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedRecipe(null);
                          setScalingResult(null);
                          setActiveTab('mpr_ledger');
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 shrink-0"
                      >
                        Open Sourcing Loop (MPR Ledger)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MPR LEDGER TAB */}
          {activeTab === 'mpr_ledger' && (
            <div className="flex flex-col gap-6">
              
              <div>
                <h2 className="text-2xl font-bold text-white">Material Purchase Requirements (MPR)</h2>
                <p className="text-sm text-slate-400">View staged recipe scaling deficits and initiate vendor RFPs for material bidding.</p>
              </div>

              {/* Staged MPR list */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-indigo-400" />
                  Active Staged MPR Entries
                </h3>

                {mprs.length === 0 ? (
                  <p className="text-sm text-slate-500">No active MPR records staged. Select a recipe in Recipe Scaling to calculate deficits first.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {mprs.map((mpr) => (
                      <div key={mpr.mpr_no} className="border border-slate-900 rounded-xl bg-slate-950/20 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            {renderCompanyBadge(mpr.comp_id)}
                            <span className="text-sm font-bold text-white font-mono">{mpr.mpr_no}</span>
                            <span className="text-xs text-slate-500">({mpr.mpr_date})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              mpr.status === 'STAGED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {mpr.status}
                            </span>
                            {mpr.status === 'STAGED' && (
                              <button
                                onClick={() => handleDispatchRfp(mpr)}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Sourcing RFP Loop
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items inside MPR */}
                        <div className="border border-slate-900 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/60 text-slate-500 font-bold uppercase">
                              <tr>
                                <th className="py-2.5 px-4">Item Name</th>
                                <th className="py-2.5 px-4 font-mono">Code</th>
                                <th className="py-2.5 px-4 text-right">Scaled Needed</th>
                                <th className="py-2.5 px-4 text-right">Deficit</th>
                                <th className="py-2.5 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/60 text-slate-300">
                              {mpr.items.map(itm => (
                                <tr key={itm.item_code}>
                                  <td className="py-2.5 px-4 font-medium text-slate-200">{itm.item_name}</td>
                                  <td className="py-2.5 px-4 font-mono text-indigo-400">{itm.item_code}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">{itm.req_qty}</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-red-400">{itm.deficit_qty}</td>
                                  <td className="py-2.5 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      itm.status === 'PENDING' ? 'text-amber-400 bg-amber-400/5' : 'text-emerald-400 bg-emerald-400/5'
                                    }`}>
                                      {itm.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RFP Dispatch & Active Bid quote entry panel */}
              {rfpMpr && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] p-6 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-white">Multi-Vendor Sourcing Loop ({rfpMpr.mpr_no})</h3>
                          {renderCompanyBadge(rfpMpr.comp_id)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Simulate RFPs and input comparative pricing bids manually.</p>
                      </div>
                      <button onClick={() => {
                        setRfpMpr(null);
                        setRfpEmails([]);
                      }} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 flex gap-6 overflow-hidden min-h-[300px]">
                      
                      <div className="w-1/2 flex flex-col gap-4 overflow-y-auto border-r border-slate-800/60 pr-6">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-indigo-400" />
                          Simulated Outbound RFP Mail queue ({rfpEmails.length} messages)
                        </h4>

                        <div className="flex flex-col gap-3">
                          {rfpEmails.map((email, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl text-xs font-mono flex flex-col gap-1 text-slate-300">
                              <div><span className="text-indigo-400 font-bold">TO:</span> {email.party_email}</div>
                              <div><span className="text-indigo-400 font-bold">SUBJECT:</span> Nova Co ({rfpMpr.comp_id}) Quote Request - {email.item_name}</div>
                              <div className="border-t border-slate-900 mt-1.5 pt-1.5 text-slate-400 leading-normal">
                                Please provide your best transactional pricing matrix for {email.item_name} required in quantity {email.deficit} {email.units || 'units'}.
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-teal-400" />
                          Active Bid Price Collection Screen
                        </h4>

                        <div className="flex flex-col gap-6">
                          {rfpMpr.items.map((itm) => {
                            if (itm.status === 'ORDERED') return null;
                            
                            return (
                              <div key={itm.item_code} className="border border-slate-800 rounded-xl p-4 bg-slate-950/10 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-white">{itm.item_name}</span>
                                  <span className="text-xs text-red-400 font-bold uppercase font-mono">Deficit: {itm.deficit_qty}</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                  {vendors.map((v) => (
                                    <div key={v.party_code} className="flex items-center gap-3 justify-between bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 text-xs">
                                      <span className="font-semibold text-slate-300">{v.party_name}</span>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-500">₹</span>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          placeholder="Rate"
                                          value={bidsInput[itm.item_code]?.[v.party_code] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setBidsInput(prev => ({
                                              ...prev,
                                              [itm.item_code]: {
                                                ...prev[itm.item_code],
                                                [v.party_code]: val
                                              }
                                            }));
                                          }}
                                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right text-white w-20 text-xs focus:outline-none"
                                        />
                                        <input 
                                          type="radio" 
                                          name={`winner-${itm.item_code}`}
                                          checked={selectedBids[itm.item_code] === v.party_code}
                                          onChange={() => {
                                            setSelectedBids(prev => ({
                                              ...prev,
                                              [itm.item_code]: v.party_code
                                            }));
                                          }}
                                          className="h-4 w-4 accent-teal-400 cursor-pointer ml-2"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-4">
                      <button 
                        onClick={() => {
                          setRfpMpr(null);
                          setRfpEmails([]);
                        }}
                        className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 font-semibold hover:bg-slate-800 hover:text-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleGeneratePOs}
                        className="px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/20 hover:scale-[1.02] transition-all cursor-pointer"
                      >
                        Confirm Bids & Generate POs
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* PURCHASE ORDERS TAB */}
          {activeTab === 'po_ledger' && (
            <div className="flex flex-col gap-6">
              
              <div>
                <h2 className="text-2xl font-bold text-white">Purchase Orders Ledger</h2>
                <p className="text-sm text-slate-400">Track disaggregated vendor Purchase Orders, settle stocks upon arrival, and manage payments.</p>
              </div>

              {/* Purchase Orders list */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-purple-400" />
                  Active Purchase Orders (Disaggregated Execution)
                </h3>

                {pos.length === 0 ? (
                  <p className="text-sm text-slate-500">No purchase orders created yet. Settle pending MPR quotes to generate orders.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-900 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-bold uppercase">
                          <th className="py-3 px-4">Company</th>
                          <th className="py-3 px-4">PO Number</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Vendor</th>
                          <th className="py-3 px-4">Item Detail</th>
                          <th className="py-3 px-4 text-right">Order Qty</th>
                          <th className="py-3 px-4 text-right">Rate</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300 text-sm">
                        {pos.map((po) => {
                          const subItem = po.items[0] || {};
                          return (
                            <tr key={po.po_no} className="hover:bg-slate-900/10">
                              <td className="py-3.5 px-4">{renderCompanyBadge(po.comp_id)}</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-purple-400">{po.po_no}</td>
                              <td className="py-3.5 px-4 text-slate-400 text-xs">{po.po_date}</td>
                              <td className="py-3.5 px-4 font-medium text-slate-200">{po.party_name}</td>
                              <td className="py-3.5 px-4 font-medium text-indigo-400">{subItem.item_name || 'N/A'}</td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">{subItem.order_qty}</td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-400">₹{subItem.rate?.toFixed(2)}</td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-white">₹{po.total_po_amount.toFixed(2)}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  po.status === 'ORDERED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => handleTogglePayment(po.po_no, po.payment_status)}
                                  disabled={userRole !== 'Admin'}
                                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    po.payment_status === 'PAID' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                                  }`}
                                >
                                  {po.payment_status}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {po.status === 'ORDERED' && (
                                  <button
                                    onClick={() => handleReceivePO(po.po_no)}
                                    disabled={userRole !== 'Admin'}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                                  >
                                    Settle Stock
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PARTY MASTER TAB */}
          {activeTab === 'party_master' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Party (Supplier/Vendor) Master</h2>
                  <p className="text-sm text-slate-400">Create, view, update, and delete supplier profiles, terms, and purchase orders.</p>
                </div>
                {userRole === 'Admin' && (
                  <button 
                    onClick={() => {
                      setPartyFormData({
                        party_code: '[Auto]', party_name: '', address_1: '', address_2: '', address_3: '',
                        phone_no: '', contact_person: '', email: '', bank_name: '', bank_ac_no: '',
                        bank_ifsc: '', bank_branch: '', payment_terms: ''
                      });
                      setEditingParty(null);
                      setNewPartyModal(true);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Register New Party
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="flex gap-4 items-center bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search suppliers by name or code..."
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Vendor List Table (Grid View) */}
              <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Code</th>
                        <th className="py-4 px-6">Supplier Name</th>
                        <th className="py-4 px-6">Contact Info</th>
                        <th className="py-4 px-6">Address</th>
                        <th className="py-4 px-6">Terms</th>
                        <th className="py-4 px-6">Bank Details</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {vendors
                        .filter(v => 
                          v.party_name.toLowerCase().includes(partySearch.toLowerCase()) || 
                          v.party_code.toLowerCase().includes(partySearch.toLowerCase())
                        )
                        .map((v) => (
                          <tr key={v.party_code} className="hover:bg-slate-900/20 transition-all align-top">
                            <td className="py-4 px-6">
                              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20 uppercase">
                                {v.party_code}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-bold text-white max-w-[200px] truncate">{v.party_name}</td>
                            <td className="py-4 px-6 text-slate-300">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-slate-200">{v.contact_person || 'N/A'}</span>
                                <span className="text-[11px] text-slate-400 font-mono">{v.email || 'N/A'}</span>
                                <span className="text-[11px] text-slate-400">{v.phone_no || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-400 max-w-[220px] leading-relaxed">
                              {v.address_1}{v.address_2 ? `, ${v.address_2}` : ''}{v.address_3 ? `, ${v.address_3}` : ''}
                            </td>
                            <td className="py-4 px-6 font-bold text-teal-400">{v.payment_terms || 'N/A'}</td>
                            <td className="py-4 px-6 text-slate-400 font-mono">
                              {v.bank_name ? (
                                <div className="flex flex-col gap-0.5 text-[11px]">
                                  <div>Bank: <span className="text-slate-300 font-sans font-medium">{v.bank_name}</span></div>
                                  <div>A/C: <span className="text-slate-300 font-medium">{v.bank_ac_no}</span></div>
                                  <div>IFSC: <span className="text-slate-300 font-medium">{v.bank_ifsc}</span></div>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-sans">N/A</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-1.5 flex-wrap max-w-[280px]">
                                <button
                                  onClick={() => {
                                    setSelectedPartyForOrders(v);
                                    setPartyOrdersModal(true);
                                  }}
                                  className="px-2.5 py-1.5 text-center bg-slate-900 border border-slate-800 text-teal-400 hover:text-white text-[11px] font-bold rounded-lg hover:bg-teal-950/20 transition-all cursor-pointer"
                                >
                                  Orders
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPartyForOfferings(v);
                                    fetchPartyOfferings(v.party_code);
                                    setPartyOfferingsModal(true);
                                  }}
                                  className="px-2.5 py-1.5 text-center bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white text-[11px] font-bold rounded-lg hover:bg-indigo-950/20 transition-all cursor-pointer"
                                >
                                  Offerings
                                </button>
                                {userRole === 'Admin' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingParty(v);
                                        setPartyFormData({
                                          party_code: v.party_code,
                                          party_name: v.party_name,
                                          address_1: v.address_1 || '',
                                          address_2: v.address_2 || '',
                                          address_3: v.address_3 || '',
                                          phone_no: v.phone_no || '',
                                          contact_person: v.contact_person || '',
                                          email: v.email || '',
                                          bank_name: v.bank_name || '',
                                          bank_ac_no: v.bank_ac_no || '',
                                          bank_ifsc: v.bank_ifsc || '',
                                          bank_branch: v.bank_branch || '',
                                          payment_terms: v.payment_terms || ''
                                        });
                                        setNewPartyModal(true);
                                      }}
                                      className="px-2.5 py-1.5 text-center bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white text-[11px] font-bold rounded-lg hover:bg-indigo-900/45 transition-all cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteParty(v.party_code)}
                                      className="px-2.5 py-1.5 text-center bg-slate-900 border border-slate-800 text-red-400 hover:text-red-300 text-[11px] font-bold rounded-lg hover:bg-red-950/20 hover:border-red-900 transition-all cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CRUD MODAL FOR SUPPLIERS */}
              {newPartyModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <h3 className="text-lg font-bold text-white">{editingParty ? `Edit Profile: ${editingParty.party_code}` : 'Register New Vendor / Supplier'}</h3>
                      <button onClick={() => setNewPartyModal(false)} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={editingParty ? handleUpdateParty : handleCreateParty} className="flex flex-col gap-4 text-sm overflow-y-auto pr-1 flex-1">
                      {/* Name & Code */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Supplier / Party Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Apex Chemical Corporation"
                            value={partyFormData.party_name}
                            onChange={(e) => setPartyFormData({...partyFormData, party_name: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 font-mono">
                          <label className="text-xs font-bold text-slate-400 uppercase font-sans">Party Code</label>
                          <input 
                            type="text" 
                            required
                            disabled={true}
                            value={editingParty ? partyFormData.party_code : '[Auto]'}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Contacts details */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Contact Person</label>
                          <input 
                            type="text"
                            placeholder="e.g. Sarah Connor"
                            value={partyFormData.contact_person}
                            onChange={(e) => setPartyFormData({...partyFormData, contact_person: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Contact Email</label>
                          <input 
                            type="email"
                            placeholder="e.g. sales@apexchem.com"
                            value={partyFormData.email}
                            onChange={(e) => setPartyFormData({...partyFormData, email: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                          <input 
                            type="text"
                            placeholder="e.g. +1-800-555-8123"
                            value={partyFormData.phone_no}
                            onChange={(e) => setPartyFormData({...partyFormData, phone_no: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Address Fields */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Address Lines</label>
                        <input 
                          type="text"
                          placeholder="Address Line 1"
                          value={partyFormData.address_1}
                          onChange={(e) => setPartyFormData({...partyFormData, address_1: e.target.value})}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none mb-2"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            type="text"
                            placeholder="Address Line 2"
                            value={partyFormData.address_2}
                            onChange={(e) => setPartyFormData({...partyFormData, address_2: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                          <input 
                            type="text"
                            placeholder="Address Line 3"
                            value={partyFormData.address_3}
                            onChange={(e) => setPartyFormData({...partyFormData, address_3: e.target.value})}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Banking Credentials & Terms */}
                      <div className="border-t border-slate-800/80 pt-4 mt-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Bank Details & Terms</h4>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Bank Name</label>
                            <input 
                              type="text"
                              placeholder="e.g. Chase Bank"
                              value={partyFormData.bank_name}
                              onChange={(e) => setPartyFormData({...partyFormData, bank_name: e.target.value})}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Payment Terms</label>
                            <input 
                              type="text"
                              placeholder="e.g. Net 30"
                              value={partyFormData.payment_terms}
                              onChange={(e) => setPartyFormData({...partyFormData, payment_terms: e.target.value})}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Bank Account No</label>
                            <input 
                              type="text"
                              placeholder="Bank A/C No"
                              value={partyFormData.bank_ac_no}
                              onChange={(e) => setPartyFormData({...partyFormData, bank_ac_no: e.target.value})}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Bank IFSC / Swift Code</label>
                            <input 
                              type="text"
                              placeholder="Bank IFSC / SWIFT"
                              value={partyFormData.bank_ifsc}
                              onChange={(e) => setPartyFormData({...partyFormData, bank_ifsc: e.target.value})}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase">Bank Branch</label>
                            <input 
                              type="text"
                              placeholder="e.g. Downtown Houston"
                              value={partyFormData.bank_branch}
                              onChange={(e) => setPartyFormData({...partyFormData, bank_branch: e.target.value})}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Modal Actions */}
                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                        <button 
                          type="button" 
                          onClick={() => setNewPartyModal(false)}
                          className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 font-semibold hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 rounded-xl text-white font-semibold hover:bg-indigo-500 transition-colors"
                        >
                          {editingParty ? 'Update Party' : 'Register Party'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* SUPPLIER ORDERS MODAL (ORDER HISTORY FOR A PARTICULAR PARTY) */}
              {partyOrdersModal && selectedPartyForOrders && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">Purchase Order History</h3>
                        <p className="text-xs text-slate-400 mt-1">Supplier: <strong className="text-indigo-400">{selectedPartyForOrders.party_name}</strong> ({selectedPartyForOrders.party_code})</p>
                      </div>
                      <button onClick={() => {
                        setPartyOrdersModal(false);
                        setSelectedPartyForOrders(null);
                      }} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                      {pos.filter(po => po.party_code === selectedPartyForOrders.party_code).length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">No purchase orders generated for this supplier.</p>
                      ) : (
                        <div className="overflow-x-auto border border-slate-900 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-bold uppercase">
                                <th className="py-3 px-4">Company</th>
                                <th className="py-3 px-4">PO Number</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Item Detail</th>
                                <th className="py-3 px-4 text-right">Order Qty</th>
                                <th className="py-3 px-4 text-right">Rate</th>
                                <th className="py-3 px-4 text-right">Total Amount</th>
                                <th className="py-3 px-4">Settle Status</th>
                                <th className="py-3 px-4">Payment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 text-slate-300 text-sm">
                              {pos
                                .filter(po => po.party_code === selectedPartyForOrders.party_code)
                                .map((po) => {
                                  const subItem = po.items[0] || {};
                                  return (
                                    <tr key={po.po_no} className="hover:bg-slate-900/10">
                                      <td className="py-3.5 px-4">{renderCompanyBadge(po.comp_id)}</td>
                                      <td className="py-3.5 px-4 font-mono font-bold text-purple-400">{po.po_no}</td>
                                      <td className="py-3.5 px-4 text-slate-400 text-xs">{po.po_date}</td>
                                      <td className="py-3.5 px-4 font-medium text-indigo-400">{subItem.item_name || 'N/A'}</td>
                                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">{subItem.order_qty}</td>
                                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">₹{subItem.rate?.toFixed(2)}</td>
                                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">₹{po.total_po_amount.toFixed(2)}</td>
                                      <td className="py-3.5 px-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                                          po.status === 'ORDERED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                          {po.status}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                          po.payment_status === 'PAID' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                                        }`}>
                                          {po.payment_status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PARTY ITEM OFFERINGS MODAL */}
              {partyOfferingsModal && selectedPartyForOfferings && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">Vendor Item Offerings</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Supplier: <strong className="text-indigo-400">{selectedPartyForOfferings.party_name}</strong> ({selectedPartyForOfferings.party_code})
                        </p>
                      </div>
                      <button onClick={() => {
                        setPartyOfferingsModal(false);
                        setSelectedPartyForOfferings(null);
                        setOfferingsList([]);
                        setOfferingItemCode('');
                        setOfferingLastRate('');
                      }} className="text-slate-500 hover:text-slate-200">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Add Offering Form (Admin only) */}
                    {userRole === 'Admin' && (
                      <form onSubmit={handleAddOffering} className="bg-slate-950/30 p-4 border border-slate-800 rounded-xl mb-4 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Offer New Item</label>
                          <select
                            required
                            value={offeringItemCode}
                            onChange={(e) => setOfferingItemCode(e.target.value)}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none font-medium w-full"
                          >
                            <option value="">-- Select an Item to Add --</option>
                            {items
                              .filter(item => !offeringsList.some(o => o.item_code === item.item_code))
                              .map(item => (
                                <option key={item.item_code} value={item.item_code}>
                                  [{item.item_code}] {item.item_name} ({item.units} - {item.packing || 'Bulk'})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="w-full md:w-44 flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase">Last Rate (Optional)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Keep empty if none"
                            value={offeringLastRate}
                            onChange={(e) => setOfferingLastRate(e.target.value)}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none placeholder-slate-600 font-mono font-medium w-full"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4 inline mr-1" /> Add Offering
                        </button>
                      </form>
                    )}

                    {/* Offerings Table */}
                    <div className="flex-1 overflow-y-auto pr-1">
                      {offeringsList.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-12 flex flex-col items-center gap-2">
                          <Info className="h-8 w-8 text-slate-600" />
                          <p>No items registered under this supplier's offering portfolio.</p>
                          {userRole === 'Admin' && <p className="text-xs text-slate-600">Select an item above to add it to their offerings.</p>}
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-bold uppercase">
                                <th className="py-3 px-4">Item Code</th>
                                <th className="py-3 px-4">Item Name</th>
                                <th className="py-3 px-4">Packing</th>
                                <th className="py-3 px-4">Units</th>
                                <th className="py-3 px-4 text-right">Last Rate</th>
                                {userRole === 'Admin' && <th className="py-3 px-4 text-center">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300 text-sm">
                              {offeringsList.map((o) => (
                                <tr key={o.item_code} className="hover:bg-slate-900/10">
                                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 uppercase">{o.item_code}</td>
                                  <td className="py-3.5 px-4 font-medium text-slate-200">{o.item_name}</td>
                                  <td className="py-3.5 px-4 text-slate-400 text-xs">{o.packing || 'N/A'}</td>
                                  <td className="py-3.5 px-4 text-slate-400 text-xs">{o.units}</td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                                    {userRole === 'Admin' ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="No rate"
                                        defaultValue={o.last_rate !== null ? o.last_rate : ''}
                                        onBlur={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            if (o.last_rate !== null) {
                                              handleUpdateOfferingRate(o.item_code, '');
                                            }
                                          } else {
                                            const parsed = parseFloat(val);
                                            if (!isNaN(parsed) && parsed !== o.last_rate) {
                                              handleUpdateOfferingRate(o.item_code, parsed);
                                            }
                                          }
                                        }}
                                        className="bg-slate-950 border border-slate-800/80 rounded-lg px-2.5 py-1 text-white text-xs focus:border-indigo-500 focus:outline-none placeholder-slate-600 font-mono font-bold text-right w-24"
                                      />
                                    ) : (
                                      o.last_rate !== null ? `₹${o.last_rate.toFixed(2)}` : <span className="text-slate-500 font-medium">Not Set</span>
                                    )}
                                  </td>
                                  {userRole === 'Admin' && (
                                    <td className="py-3.5 px-4 text-center">
                                      <button
                                        onClick={() => handleDeleteOffering(o.item_code)}
                                        className="text-red-400 hover:text-red-300 font-bold text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">System Security Audit Trail</h2>
                  <p className="text-sm text-slate-400">Verifiable trace logs capturing state changes with old and new snapshots.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5">
                  <button 
                    onClick={() => applyDatePreset('week')} 
                    className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 hover:bg-slate-800 rounded-lg transition-all"
                  >
                    1W
                  </button>
                  <button 
                    onClick={() => applyDatePreset('month')} 
                    className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 hover:bg-slate-800 rounded-lg transition-all"
                  >
                    1M
                  </button>
                  <button 
                    onClick={() => applyDatePreset('fiscal')} 
                    className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 hover:bg-slate-800 rounded-lg transition-all"
                  >
                    Fiscal Year
                  </button>
                </div>
              </div>

              {/* Date Filters Inputs */}
              <div className="flex gap-4 items-center bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-slate-500 uppercase">From:</span>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-slate-500 uppercase">To:</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await axios.get('/api/audit/logs', {
                        params: { start_date: startDate, end_date: endDate }
                      });
                      setAuditLogs(res.data);
                      showToast('Audit filter applied.');
                    } catch (err) {
                      showToast('Failed to filter logs.', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Apply Filter
                </button>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    fetchInitialData();
                  }}
                  className="border border-slate-800 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg transition-all"
                >
                  Reset
                </button>
              </div>

              {/* Logs Table */}
              <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-6">Target registry</th>
                      <th className="py-4 px-6">Field / Action</th>
                      <th className="py-4 px-6">Old Value Snapshot</th>
                      <th className="py-4 px-6">New Value Snapshot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/10">
                        <td className="py-3 px-6 text-slate-400 font-mono text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-white uppercase font-bold tracking-tight">
                          {log.target_table}
                        </td>
                        <td className="py-3 px-6 text-indigo-400 font-mono font-semibold">
                          {log.modified_field}
                        </td>
                        <td className="py-3 px-6 text-slate-400 font-mono text-xs max-w-xs truncate" title={log.old_value_snapshot}>
                          {log.old_value_snapshot || 'N/A'}
                        </td>
                        <td className="py-3 px-6 text-emerald-400 font-mono text-xs max-w-xs truncate" title={log.new_value_snapshot}>
                          {log.new_value_snapshot}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            </div>
          )}

          {/* TEMPORAL EXPORTER TAB */}
          {activeTab === 'exports' && (
            <div className="flex flex-col gap-6">
              
              <div>
                <h2 className="text-2xl font-bold text-white">Temporal Data Exporter</h2>
                <p className="text-sm text-slate-400">Export active company data registries as download-ready CSV spreadsheets.</p>
              </div>

              {/* Exporter UI Interface Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Export Options Form */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Sliders className="h-5 w-5 text-indigo-400" />
                    Configure Export Range
                  </h3>

                  {/* Preset Buttons */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="font-bold text-slate-500 uppercase">Select Preset Range:</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => applyDatePreset('week')}
                        className="bg-slate-900 border border-slate-800 text-slate-300 font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition-all flex-1 text-center"
                      >
                        Last 7 Days (Current Week)
                      </button>
                      <button 
                        onClick={() => applyDatePreset('month')}
                        className="bg-slate-900 border border-slate-800 text-slate-300 font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition-all flex-1 text-center"
                      >
                        Last 30 Days (Monthly Log)
                      </button>
                      <button 
                        onClick={() => applyDatePreset('fiscal')}
                        className="bg-slate-900 border border-slate-800 text-slate-300 font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition-all flex-1 text-center"
                      >
                        Fiscal Year (April 1st Start)
                      </button>
                    </div>
                  </div>

                  {/* Custom Pickers */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-slate-500 uppercase">Start Date (T_start)</span>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-slate-900 border border-slate-850 text-white rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-slate-500 uppercase">End Date (T_end)</span>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-slate-900 border border-slate-850 text-white rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Downloads triggers */}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-500 uppercase">Downloads Options (Mixed Companies Included):</span>
                    
                    <a 
                      href="http://localhost:5000/api/exports/inventory/csv"
                      download
                      onClick={() => showToast('Downloading mixed Inventory CSV...')}
                      className="flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white text-sm font-semibold p-3.5 rounded-xl transition-all hover:translate-x-1"
                    >
                      <span className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-teal-400" />
                        Inventory Table Export (CSV)
                      </span>
                      <Download className="h-4 w-4 text-slate-500" />
                    </a>

                    <a 
                      href={`http://localhost:5000/api/exports/pos/csv?start_date=${startDate}&end_date=${endDate}`}
                      download
                      onClick={() => showToast('Downloading mixed POs CSV...')}
                      className="flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white text-sm font-semibold p-3.5 rounded-xl transition-all hover:translate-x-1"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-purple-400" />
                        Purchase Orders Detail (CSV)
                      </span>
                      <Download className="h-4 w-4 text-slate-500" />
                    </a>

                    <a 
                      href={`http://localhost:5000/api/exports/audit/csv?start_date=${startDate}&end_date=${endDate}`}
                      download
                      onClick={() => showToast('Downloading Security Audit Logs CSV...')}
                      className="flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white text-sm font-semibold p-3.5 rounded-xl transition-all hover:translate-x-1"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-400" />
                        Audit Logs Export (CSV)
                      </span>
                      <Download className="h-4 w-4 text-slate-500" />
                    </a>
                  </div>
                </div>

                {/* Print Layout PDF Table mock */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Printer className="h-5 w-5 text-indigo-400" />
                      Formal PDF Report Layout
                    </h3>
                    <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                      Need a formal business report? Click below to load the print-optimized printable ledger containing purchase orders, vendor invoices, and security tracks matching the filters:
                    </p>
                    <div className="mt-4 p-4 border border-slate-800 bg-slate-950/20 rounded-xl text-xs font-mono text-slate-400 flex flex-col gap-1.5">
                      <div>Report Mode: Blended NC & ND</div>
                      <div>Query Filters: {startDate || 'N/A'} to {endDate || 'N/A'}</div>
                      <div>Record Counts: {pos.length} orders loaded.</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => window.print()}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    Print Ledger (Save to PDF)
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* DATABASE ADMIN / TESTING TOOLS TAB */}
          {activeTab === 'database_admin' && userRole === 'Admin' && (
            <div className="flex flex-col gap-6">
              
              <div>
                <h2 className="text-2xl font-bold text-white">Testing & Database Administration</h2>
                <p className="text-sm text-slate-400">Initialize and manage mock/demo testing data datasets or reset the database to a clean starting state.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Seed Mock Data Box */}
                <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                      <Database className="h-5 w-5 text-indigo-400" />
                      Seed Database with Demo Data
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal mb-4">
                      This will reset and pre-populate the database with a complete, rich set of sample data, including mock inventory items, recipes, vendors (parties), staged material requirements (MPRs), and sample purchase orders for both NC and ND companies.
                    </p>
                    <div className="p-4 border border-slate-800 bg-slate-950/40 rounded-xl text-xs text-slate-300 font-medium">
                      <p className="text-indigo-400 font-bold mb-2">Seed dataset includes:</p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                        <li>Standard chemical items (Benzene, Sulfuric Acid, etc.)</li>
                        <li>Explicitly labeled "DEMO" items for easy identification</li>
                        <li>4 default vendors with full payment and bank details</li>
                        <li>4 test recipes (Nitrobenzene, Blue Indigo Dye, Demo Recipe, etc.)</li>
                        <li>Simulated historical MPRs and Purchase Orders</li>
                      </ul>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      if (!window.confirm("WARNING: This will drop all tables and reload the complete mock data dataset. All current items, transactions, and logs will be lost. Proceed?")) return;
                      setLoading(true);
                      try {
                        const res = await axios.post('/api/admin/db/seed');
                        showToast(res.data.message || 'Database seeded successfully.');
                        fetchInitialData();
                        setActiveTab('dashboard');
                      } catch (err) {
                        showToast(err.response?.data?.error || 'Failed to seed database.', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Load/Reset Mock Data
                  </button>
                </div>

                {/* Clear Database Box */}
                <div className="p-6 rounded-2xl glass-panel border border-slate-850 shadow-xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                      <X className="h-5 w-5 text-red-400" />
                      Clear Database (Clean Slate)
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal mb-4">
                      This deletes all test/mock items, recipes, transactions (MPRs and POs), and audit logs. It leaves a clean system ready for production use, with only the core configuration loaded.
                    </p>
                    <div className="p-4 border border-slate-850 bg-slate-950/40 rounded-xl text-xs text-slate-300 font-medium">
                      <p className="text-red-400 font-bold mb-2">Clean slate keeps only:</p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                        <li>Core Company Records (NC and ND codes)</li>
                        <li>Standard Item Groups (RAW, FIN, PKG) with counter reset to 0</li>
                        <li>Standard Parties list (vendors) so you can immediately create items</li>
                        <li>All user-entered data, mock transactions, recipes, and items will be deleted</li>
                      </ul>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      if (!window.confirm("CRITICAL WARNING: This will delete ALL database records except companies and groups/vendors. This is intended to clean the system for production. Proceed?")) return;
                      setLoading(true);
                      try {
                        const res = await axios.post('/api/admin/db/clear');
                        showToast(res.data.message || 'Database cleared to clean slate.');
                        fetchInitialData();
                        setActiveTab('dashboard');
                      } catch (err) {
                        showToast(err.response?.data?.error || 'Failed to clear database.', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-650 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Clear Mock Data (Clean Slate)
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* EXCEL BULK EDITOR TAB (ADMIN ONLY) */}
          {activeTab === 'excel_editor' && userRole === 'Admin' && (
            <div className="flex flex-col gap-6">
              
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Excel Bulk Editor</h2>
                  <p className="text-sm text-slate-400">Directly add, modify, or delete registry records in bulk. Code prefixes are applied automatically.</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (excelActiveSheet === 'items') addExcelItemRow();
                      if (excelActiveSheet === 'groups') addExcelGroupRow();
                      if (excelActiveSheet === 'parties') addExcelVendorRow();
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all hover:scale-[1.01] cursor-pointer animate-fade-in"
                  >
                    <Plus className="h-4 w-4" />
                    Add Row
                  </button>
                  <button
                    onClick={() => {
                      if (excelActiveSheet === 'items') saveExcelItemsChanges();
                      if (excelActiveSheet === 'groups') saveExcelGroupsChanges();
                      if (excelActiveSheet === 'parties') saveExcelVendorsChanges();
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all hover:scale-[1.01] cursor-pointer font-bold"
                    title="Save all changes to database"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={discardExcelChanges}
                    className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all hover:bg-slate-800 cursor-pointer"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>

              {/* Sheet Selection Pills */}
              <div className="flex gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-900 w-fit">
                <button
                  onClick={() => setExcelActiveSheet('items')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    excelActiveSheet === 'items' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Items Sheet
                </button>
                <button
                  onClick={() => setExcelActiveSheet('groups')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    excelActiveSheet === 'groups' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Groups Sheet
                </button>
                <button
                  onClick={() => setExcelActiveSheet('parties')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    excelActiveSheet === 'parties' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parties Sheet
                </button>
              </div>

              {/* Spreadsheet Table Containers */}
              {excelActiveSheet === 'items' && (
                <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl animate-in fade-in duration-150">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-850">
                          <th className="py-3 px-3 w-10 text-center bg-slate-950/60">#</th>
                          <th className="py-3 px-3 w-20 text-center bg-slate-950/60">Action</th>
                          <th className="py-3 px-3 w-20 bg-slate-950/60">Company</th>
                          <th className="py-3 px-3 w-24 bg-slate-950/60">Code</th>
                          <th className="py-3 px-3 w-56 bg-slate-950/60">Item Name</th>
                          <th className="py-3 px-3 w-28 bg-slate-950/60">Group</th>
                          <th className="py-3 px-3 w-28 bg-slate-950/60">Packing</th>
                          <th className="py-3 px-3 w-24 bg-slate-950/60">Pack Qty</th>
                          <th className="py-3 px-3 w-28 text-right bg-slate-950/60">Bal Qty</th>
                          <th className="py-3 px-3 w-24 bg-slate-950/60">Units</th>
                          <th className="py-3 px-3 w-28 bg-slate-950/60">Last Receive</th>
                          <th className="py-3 px-3 w-28 bg-slate-950/60">Last Issue</th>
                          <th className="py-3 px-3 w-24 text-right bg-slate-950/60">GST %</th>
                          <th className="py-3 px-3 w-24 text-right bg-slate-950/60">Min Qty</th>
                          <th className="py-3 px-3 w-24 text-right bg-slate-950/60">Reorder Qty</th>
                          <th className="py-3 px-3 w-24 text-right bg-slate-950/60">Lead Time</th>
                          <th className="py-3 px-3 w-28 text-right bg-slate-950/60">Last Rate</th>
                          <th className="py-3 px-3 w-20 text-center bg-slate-950/60">License</th>
                          <th className="py-3 px-3 w-20 text-center bg-slate-950/60">Imported</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm bg-slate-900/10 font-mono">
                        {excelItems.map((itm, idx) => {
                          const isDeleted = itm.isDeleted;
                          const isNew = itm.isNew;
                          const handleCellChange = (field, val) => {
                            const updated = excelItems.map((item, i) => i === idx ? { ...item, [field]: val } : item);
                            setExcelItems(updated);
                          };

                          return (
                            <tr key={'itm-' + idx} className={`hover:bg-slate-900/10 transition-colors ${isDeleted ? 'bg-red-950/10 opacity-40 line-through' : ''} ${isNew ? 'bg-indigo-950/5' : ''}`}>
                              <td className="py-2 px-3 text-center text-xs text-slate-500 font-mono font-bold">{idx + 1}</td>
                              <td className="py-2 px-3 text-center">
                                {isDeleted ? (
                                  <button type="button" onClick={() => handleCellChange('isDeleted', false)} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded cursor-pointer">Undo</button>
                                ) : (
                                  <button type="button" onClick={() => isNew ? setExcelItems(excelItems.filter((_, i) => i !== idx)) : handleCellChange('isDeleted', true)} className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded cursor-pointer">Delete</button>
                                )}
                              </td>
                              <td className="py-1 px-2">
                                <select disabled={isDeleted} value={itm.comp_id} onChange={(e) => handleCellChange('comp_id', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none">
                                  <option value="NC">NC</option>
                                  <option value="ND">ND</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500 text-xs">{isNew ? <span className="text-indigo-400/70 font-semibold">[Auto]</span> : itm.item_code}</td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Item Name..." value={itm.item_name} onChange={(e) => handleCellChange('item_name', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none font-medium font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <select disabled={isDeleted} value={itm.itg_code} onChange={(e) => handleCellChange('itg_code', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none font-mono">
                                  {groups.map(g => <option key={g.itg_code} value={g.itg_code}>{g.itg_code}</option>)}
                                </select>
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="e.g. Bulk" value={itm.packing || ''} onChange={(e) => handleCellChange('packing', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" step="0.1" disabled={isDeleted} value={itm.pack_qty} onChange={(e) => handleCellChange('pack_qty', parseFloat(e.target.value) || 1.0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" step="0.01" disabled={isDeleted} value={itm.bal_qt} onChange={(e) => handleCellChange('bal_qt', parseFloat(e.target.value) || 0.0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono font-bold" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} value={itm.units} onChange={(e) => handleCellChange('units', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-mono uppercase" />
                              </td>
                              <td>
                                <input
                                    type="date"
                                    value={itm.lrec_date || ""}
                                    onChange={(e) => {
                                        const updated = [...excelItems];
                                        updated[index].lrec_date = e.target.value;
                                        setExcelItems(updated);
                                    }}
                                />
                            </td>

                            <td>
                                <input
                                    type="date"
                                    value={itm.liss_date || ""}
                                    onChange={(e) => {
                                        const updated = [...excelItems];
                                        updated[index].liss_date = e.target.value;
                                        setExcelItems(updated);
                                    }}
                                />
                            </td>
                              <td className="py-1 px-2">
                                <input type="number" step="0.1" disabled={isDeleted} value={itm.gst_pr} onChange={(e) => handleCellChange('gst_pr', parseFloat(e.target.value) || 0.0)} className="bg-slate-955 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" step="0.01" disabled={isDeleted} value={itm.min_qt} onChange={(e) => handleCellChange('min_qt', parseFloat(e.target.value) || 0.0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" step="0.01" disabled={isDeleted} value={itm.ror_qt} onChange={(e) => handleCellChange('ror_qt', parseFloat(e.target.value) || 0.0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" disabled={isDeleted} value={itm.lead_time} onChange={(e) => handleCellChange('lead_time', parseInt(e.target.value) || 0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" step="0.01" disabled={isDeleted} value={itm.last_rate} onChange={(e) => handleCellChange('last_rate', parseFloat(e.target.value) || 0.0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-teal-400 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono font-bold" />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input type="checkbox" disabled={isDeleted} checked={itm.is_lic} onChange={(e) => handleCellChange('is_lic', e.target.checked)} className="h-4 w-4 accent-indigo-500 cursor-pointer" />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input type="checkbox" disabled={isDeleted} checked={itm.is_imp} onChange={(e) => handleCellChange('is_imp', e.target.checked)} className="h-4 w-4 accent-indigo-500 cursor-pointer" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {excelActiveSheet === 'groups' && (
                <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl animate-in fade-in duration-150">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-850">
                          <th className="py-3 px-3 w-10 text-center bg-slate-950/60">#</th>
                          <th className="py-3 px-3 w-20 text-center bg-slate-950/60">Action</th>
                          <th className="py-3 px-3 w-28 bg-slate-950/60">Group Code</th>
                          <th className="py-3 px-3 w-56 bg-slate-950/60">Group Name</th>
                          <th className="py-3 px-3 w-24 bg-slate-950/60">CG Key</th>
                          <th className="py-3 px-3 w-24 bg-slate-950/60">Prefix</th>
                          <th className="py-3 px-3 w-28 text-right bg-slate-950/60">Last Sequence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm bg-slate-900/10 font-mono">
                        {excelGroups.map((g, idx) => {
                          const isDeleted = g.isDeleted;
                          const isNew = g.isNew;
                          const handleCellChange = (field, val) => {
                            const updated = excelGroups.map((group, i) => i === idx ? { ...group, [field]: val } : group);
                            setExcelGroups(updated);
                          };

                          return (
                            <tr key={'grp-' + idx} className={`hover:bg-slate-900/10 transition-colors ${isDeleted ? 'bg-red-950/10 opacity-40 line-through' : ''} ${isNew ? 'bg-indigo-950/5' : ''}`}>
                              <td className="py-2 px-3 text-center text-xs text-slate-500 font-mono font-bold">{idx + 1}</td>
                              <td className="py-2 px-3 text-center">
                                {isDeleted ? (
                                  <button type="button" onClick={() => handleCellChange('isDeleted', false)} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded cursor-pointer">Undo</button>
                                ) : (
                                  <button type="button" onClick={() => isNew ? setExcelGroups(excelGroups.filter((_, i) => i !== idx)) : handleCellChange('isDeleted', true)} className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded cursor-pointer">Delete</button>
                                )}
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted || !isNew} placeholder="e.g. RAW" value={g.itg_code} onChange={(e) => handleCellChange('itg_code', e.target.value.toUpperCase())} className="bg-slate-950 disabled:opacity-50 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none font-mono font-bold" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Group Name..." value={g.itg_name} onChange={(e) => handleCellChange('itg_name', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none font-medium font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="CG Key..." value={g.itg_cgkey} onChange={(e) => handleCellChange('itg_cgkey', e.target.value.toUpperCase())} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Prefix..." value={g.prefix} onChange={(e) => handleCellChange('prefix', e.target.value.toUpperCase())} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="number" disabled={isDeleted} value={g.last_sequence} onChange={(e) => handleCellChange('last_sequence', parseInt(e.target.value) || 0)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none text-right font-mono" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {excelActiveSheet === 'parties' && (
                <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl animate-in fade-in duration-150">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-sans">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-850">
                          <th className="py-3 px-3 w-10 text-center bg-slate-950/60 font-mono">#</th>
                          <th className="py-3 px-3 w-20 text-center bg-slate-950/60">Action</th>
                          <th className="py-3 px-3 w-28 bg-slate-950/60">Party Code</th>
                          <th className="py-3 px-3 w-56 bg-slate-950/60">Party Name</th>
                          <th className="py-3 px-3 w-48 bg-slate-950/60">Email</th>
                          <th className="py-3 px-3 w-32 bg-slate-950/60">Phone No</th>
                          <th className="py-3 px-3 w-36 bg-slate-950/60">Contact Person</th>
                          <th className="py-3 px-3 w-36 bg-slate-950/60">Payment Terms</th>
                          <th className="py-3 px-3 w-36 bg-slate-950/60">Bank Name</th>
                          <th className="py-3 px-3 w-36 bg-slate-950/60">Bank A/C No</th>
                          <th className="py-3 px-3 w-32 bg-slate-950/60">Bank IFSC</th>
                          <th className="py-3 px-3 w-36 bg-slate-950/60">Bank Branch</th>
                          <th className="py-3 px-3 w-48 bg-slate-950/60">Address 1</th>
                          <th className="py-3 px-3 w-48 bg-slate-950/60">Address 2</th>
                          <th className="py-3 px-3 w-48 bg-slate-950/60">Address 3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm bg-slate-900/10 font-mono">
                        {excelVendors.map((v, idx) => {
                          const isDeleted = v.isDeleted;
                          const isNew = v.isNew;
                          const handleCellChange = (field, val) => {
                            const updated = excelVendors.map((vendor, i) => i === idx ? { ...vendor, [field]: val } : vendor);
                            setExcelVendors(updated);
                          };

                          return (
                            <tr key={'vnd-' + idx} className={`hover:bg-slate-900/10 transition-colors ${isDeleted ? 'bg-red-950/10 opacity-40 line-through' : ''} ${isNew ? 'bg-indigo-950/5' : ''}`}>
                              <td className="py-2 px-3 text-center text-xs text-slate-500 font-mono font-bold">{idx + 1}</td>
                              <td className="py-2 px-3 text-center">
                                {isDeleted ? (
                                  <button type="button" onClick={() => handleCellChange('isDeleted', false)} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded cursor-pointer">Undo</button>
                                ) : (
                                  <button type="button" onClick={() => isNew ? setExcelVendors(excelVendors.filter((_, i) => i !== idx)) : handleCellChange('isDeleted', true)} className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded cursor-pointer">Delete</button>
                                )}
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted || !isNew} placeholder="e.g. P1001" value={v.party_code} onChange={(e) => handleCellChange('party_code', e.target.value.toUpperCase())} className="bg-slate-955 disabled:opacity-50 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none font-mono font-bold" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Party Name..." value={v.party_name} onChange={(e) => handleCellChange('party_name', e.target.value)} className="bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs w-full focus:border-indigo-500 focus:outline-none font-medium font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="email" disabled={isDeleted} placeholder="Email..." value={v.email || ''} onChange={(e) => handleCellChange('email', e.target.value)} className="bg-slate-950 border border-slate-850 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Phone No..." value={v.phone_no || ''} onChange={(e) => handleCellChange('phone_no', e.target.value)} className="bg-slate-950 border border-slate-850 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Contact Person..." value={v.contact_person || ''} onChange={(e) => handleCellChange('contact_person', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Payment Terms..." value={v.payment_terms || ''} onChange={(e) => handleCellChange('payment_terms', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Bank Name..." value={v.bank_name || ''} onChange={(e) => handleCellChange('bank_name', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Bank A/C No..." value={v.bank_ac_no || ''} onChange={(e) => handleCellChange('bank_ac_no', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="IFSC..." value={v.bank_ifsc || ''} onChange={(e) => handleCellChange('bank_ifsc', e.target.value.toUpperCase())} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-mono" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Branch..." value={v.bank_branch || ''} onChange={(e) => handleCellChange('bank_branch', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Address 1..." value={v.address_1 || ''} onChange={(e) => handleCellChange('address_1', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Address 2..." value={v.address_2 || ''} onChange={(e) => handleCellChange('address_2', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                              <td className="py-1 px-2">
                                <input type="text" disabled={isDeleted} placeholder="Address 3..." value={v.address_3 || ''} onChange={(e) => handleCellChange('address_3', e.target.value)} className="bg-slate-950 border border-slate-855 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-indigo-500 focus:outline-none font-sans" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
