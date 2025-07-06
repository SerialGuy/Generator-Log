'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  DollarSign, 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Download,
  Eye,
  Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function BillingDashboard() {
  const { user } = useAuth();
  const [billing, setBilling] = useState([]);
  const [zones, setZones] = useState([]);
  const [fuelPrices, setFuelPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [showFuelPriceModal, setShowFuelPriceModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [billingPeriod, setBillingPeriod] = useState({
    start: '',
    end: ''
  });
  const [fuelPriceForm, setFuelPriceForm] = useState({
    price_per_liter: '',
    effective_date: ''
  });
  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    paidBills: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [billingRes, zonesRes, fuelPricesRes] = await Promise.all([
        fetch('/api/billing', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/zones', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/fuel-prices', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setBilling(billingData);
        calculateStats(billingData);
      }

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData);
      }

      if (fuelPricesRes.ok) {
        const fuelPricesData = await fuelPricesRes.json();
        setFuelPrices(fuelPricesData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const calculateStats = (billingData) => {
    const totalBills = billingData.length;
    const pendingBills = billingData.filter(b => b.status === 'pending').length;
    const paidBills = billingData.filter(b => b.status === 'paid').length;
    const totalRevenue = billingData
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

    setStats({
      totalBills,
      pendingBills,
      paidBills,
      totalRevenue
    });
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    
    if (!selectedZone || !billingPeriod.start || !billingPeriod.end) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          zoneId: selectedZone,
          billingPeriodStart: billingPeriod.start,
          billingPeriodEnd: billingPeriod.end
        })
      });

      if (response.ok) {
        const newBill = await response.json();
        setBilling([newBill, ...billing]);
        setShowCreateBillModal(false);
        setSelectedZone('');
        setBillingPeriod({ start: '', end: '' });
        toast.success('Bill created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create bill');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
    }
  };

  const handleCreateFuelPrice = async (e) => {
    e.preventDefault();
    
    if (!fuelPriceForm.price_per_liter || !fuelPriceForm.effective_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fuel-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fuelPriceForm)
      });

      if (response.ok) {
        const newPrice = await response.json();
        setFuelPrices([newPrice, ...fuelPrices]);
        setShowFuelPriceModal(false);
        setFuelPriceForm({ price_per_liter: '', effective_date: '' });
        toast.success('Fuel price updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update fuel price');
      }
    } catch (error) {
      console.error('Error updating fuel price:', error);
      toast.error('Failed to update fuel price');
    }
  };

  const updateBillStatus = async (billId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/billing/${billId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setBilling(billing.map(bill => 
          bill.id === billId 
            ? { ...bill, status, sent_date: status === 'sent' ? new Date().toISOString() : bill.sent_date,
                paid_date: status === 'paid' ? new Date().toISOString() : bill.paid_date }
            : bill
        ));
        toast.success(`Bill marked as ${status}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update bill status');
      }
    } catch (error) {
      console.error('Error updating bill status:', error);
      toast.error('Failed to update bill status');
    }
  };

  const generatePDF = (bill) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Generator Log System', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('INVOICE', 105, 35, { align: 'center' });
    
    // Bill details
    doc.setFontSize(12);
    doc.text(`Bill Number: ${bill.bill_number}`, 20, 50);
    doc.text(`Date: ${new Date(bill.created_at).toLocaleDateString()}`, 20, 60);
    doc.text(`Due Date: ${bill.due_date}`, 20, 70);
    doc.text(`Status: ${bill.status.toUpperCase()}`, 20, 80);
    
    // Client info
    doc.text('Bill To:', 20, 100);
    doc.text(bill.users?.name || 'Client', 20, 110);
    doc.text(bill.users?.email || '', 20, 120);
    
    // Zone info
    doc.text('Zone:', 20, 140);
    doc.text(bill.zones?.name || '', 20, 150);
    doc.text(bill.zones?.location || '', 20, 160);
    
    // Billing period
    doc.text('Billing Period:', 20, 180);
    doc.text(`${new Date(bill.billing_period_start).toLocaleDateString()} - ${new Date(bill.billing_period_end).toLocaleDateString()}`, 20, 190);
    
    // Summary table
    const tableData = [
      ['Description', 'Amount'],
      ['Fuel Cost', `$${bill.fuel_cost?.toFixed(2) || '0.00'}`],
      ['Service Fee', `$${bill.service_fee?.toFixed(2) || '0.00'}`],
      ['Total', `$${bill.total_amount?.toFixed(2) || '0.00'}`]
    ];
    
    doc.autoTable({
      startY: 210,
      head: [['Description', 'Amount']],
      body: tableData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Save PDF
    doc.save(`bill-${bill.bill_number}.pdf`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
              <p className="text-gray-600">Manage fuel costs, bills, and payments</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFuelPriceModal(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Update Fuel Price
              </button>
              <button
                onClick={() => setShowCreateBillModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Create Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalBills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingBills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.paidBills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Fuel Price */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Current Fuel Price</h3>
          </div>
          <div className="p-6">
            {fuelPrices.length > 0 && fuelPrices[0].is_active ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    ${fuelPrices[0].price_per_liter}/liter
                  </p>
                  <p className="text-sm text-gray-600">
                    Effective from {new Date(fuelPrices[0].effective_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(fuelPrices[0].created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No active fuel price set</p>
            )}
          </div>
        </div>

        {/* Billing Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billing.map(bill => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.bill_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.zones?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.users?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${bill.total_amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                        {getStatusIcon(bill.status)}
                        <span className="ml-1">{bill.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => generatePDF(bill)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {bill.status === 'pending' && (
                          <button
                            onClick={() => updateBillStatus(bill.id, 'sent')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Sent"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {bill.status === 'sent' && (
                          <button
                            onClick={() => updateBillStatus(bill.id, 'paid')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Bill Modal */}
      {showCreateBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Bill</h3>
            </div>
            
            <form onSubmit={handleCreateBill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a zone</option>
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period Start</label>
                <input
                  type="date"
                  value={billingPeriod.start}
                  onChange={(e) => setBillingPeriod({...billingPeriod, start: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period End</label>
                <input
                  type="date"
                  value={billingPeriod.end}
                  onChange={(e) => setBillingPeriod({...billingPeriod, end: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateBillModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Create Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Price Modal */}
      {showFuelPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Fuel Price</h3>
            </div>
            
            <form onSubmit={handleCreateFuelPrice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Liter ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelPriceForm.price_per_liter}
                  onChange={(e) => setFuelPriceForm({...fuelPriceForm, price_per_liter: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={fuelPriceForm.effective_date}
                  onChange={(e) => setFuelPriceForm({...fuelPriceForm, effective_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFuelPriceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                >
                  Update Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 