export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type TransactionLog = {
  id:        string;
  timestamp: string;
  action:    'created' | 'edited';
  field?:    string;
  oldValue?: string;
  newValue?: string;
};

export type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  isRecurring?: boolean;
  recurringInterval?: 'monthly' | 'weekly' | 'yearly';
  nextRecurringDate?: string;
  createdAt?: string;
  updatedAt?: string;
  logs?: TransactionLog[];
};

export type Budget = {
  categoryId: string;
  limit: number;
};

export type Theme = 'light' | 'dark';

export type DateRange = 'day' | 'week' | 'month' | 'all';

export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export type FilterState = {
  date: string;
  category: string;
  description: string;
  amount: string;
  type: 'all' | 'income' | 'expense';
};