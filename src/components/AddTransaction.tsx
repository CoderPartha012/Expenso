import React, { useState } from 'react';
import { useExpenseStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const AddTransaction = () => {
  const { categories, addTransaction } = useExpenseStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: categories[0].id,
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      addTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
      });
      navigate('/');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Add New Transaction</h2>
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg bg-white border ${
                errors.amount ? 'border-rose-500' : 'border-slate-300'
              } text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Enter amount"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-rose-500">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg bg-white border ${
                errors.category ? 'border-rose-500' : 'border-slate-300'
              } text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-rose-500">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg bg-white border ${
                errors.description ? 'border-rose-500' : 'border-slate-300'
              } text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Enter description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-rose-500">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg bg-white border ${
                errors.paymentMethod ? 'border-rose-500' : 'border-slate-300'
              } text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="netbanking">Net Banking</option>
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-sm text-rose-500">{errors.paymentMethod}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
            >
              Save Transaction
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AddTransaction;