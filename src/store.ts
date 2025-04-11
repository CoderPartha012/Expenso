import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, Budget, Theme, Category, SortOption } from './types';
import { addDays, addMonths, addYears, format } from 'date-fns';

interface ExpenseState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  theme: Theme;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (transaction: Transaction) => void;
  setBudget: (budget: Budget) => void;
  toggleTheme: () => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  processRecurringTransactions: () => void;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Food', icon: 'utensils', color: '#FF6B6B' },
  { id: '2', name: 'Transport', icon: 'car', color: '#4ECDC4' },
  { id: '3', name: 'Bills', icon: 'file-text', color: '#45B7D1' },
  { id: '4', name: 'Shopping', icon: 'shopping-bag', color: '#96CEB4' },
  { id: '5', name: 'Entertainment', icon: 'tv', color: '#FFEEAD' },
  { id: '6', name: 'Health', icon: 'heart', color: '#D4A5A5' },
  { id: '7', name: 'Salary', icon: 'wallet', color: '#9ACD32' },
  { id: '8', name: 'Other', icon: 'more-horizontal', color: '#A9A9A9' },
];

const getNextRecurringDate = (date: string, interval: 'monthly' | 'weekly' | 'yearly') => {
  const currentDate = new Date(date);
  switch (interval) {
    case 'weekly':
      return addDays(currentDate, 7);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'yearly':
      return addYears(currentDate, 1);
    default:
      return currentDate;
  }
};

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: defaultCategories,
      budgets: [],
      theme: 'light',
      addTransaction: (transaction) => {
        const newTransaction = {
          ...transaction,
          id: crypto.randomUUID(),
        };

        if (transaction.isRecurring && transaction.recurringInterval) {
          newTransaction.nextRecurringDate = format(
            getNextRecurringDate(transaction.date, transaction.recurringInterval),
            'yyyy-MM-dd'
          );
        }

        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));
      },
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
      updateTransaction: (transaction) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === transaction.id ? transaction : t
          ),
        })),
      setBudget: (budget) =>
        set((state) => ({
          budgets: [
            ...state.budgets.filter((b) => b.categoryId !== budget.categoryId),
            budget,
          ],
        })),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      addCategory: (category) =>
        set((state) => ({
          categories: [...state.categories, { ...category, id: crypto.randomUUID() }],
        })),
      updateCategory: (category) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === category.id ? category : c
          ),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          transactions: state.transactions.filter((t) => t.category !== id),
          budgets: state.budgets.filter((b) => b.categoryId !== id),
        })),
      processRecurringTransactions: () => {
        const { transactions } = get();
        const today = new Date();
        const newTransactions: Transaction[] = [];

        transactions.forEach((transaction) => {
          if (
            transaction.isRecurring &&
            transaction.nextRecurringDate &&
            new Date(transaction.nextRecurringDate) <= today
          ) {
            const newTransaction = {
              ...transaction,
              id: crypto.randomUUID(),
              date: transaction.nextRecurringDate,
              nextRecurringDate: format(
                getNextRecurringDate(
                  transaction.nextRecurringDate,
                  transaction.recurringInterval!
                ),
                'yyyy-MM-dd'
              ),
            };
            newTransactions.push(newTransaction);
          }
        });

        if (newTransactions.length > 0) {
          set((state) => ({
            transactions: [...state.transactions, ...newTransactions],
          }));
        }
      },
    }),
    {
      name: 'expense-tracker',
    }
  )
);