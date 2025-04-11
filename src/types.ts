export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
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