import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, Budget, Theme, Category, SortOption } from './types';
import { addDays, addMonths, addYears, format } from 'date-fns';

interface ExpenseState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  theme: Theme;
  hasOnboarded: boolean;
  hasToured: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (transaction: Transaction) => void;
  setBudget: (budget: Budget) => void;
  toggleTheme: () => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  processRecurringTransactions: () => void;
  setOnboarded: () => void;
  setToured: () => void;
  loadSampleData: () => void;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Food',          icon: 'utensils',        color: '#FF6B6B' },
  { id: '2', name: 'Transport',     icon: 'car',             color: '#4ECDC4' },
  { id: '3', name: 'Bills',         icon: 'file-text',       color: '#45B7D1' },
  { id: '4', name: 'Shopping',      icon: 'shopping-bag',    color: '#96CEB4' },
  { id: '5', name: 'Entertainment', icon: 'tv',              color: '#FFEEAD' },
  { id: '6', name: 'Health',        icon: 'heart',           color: '#D4A5A5' },
  { id: '7', name: 'Salary',        icon: 'wallet',          color: '#9ACD32' },
  { id: '8', name: 'Other',         icon: 'more-horizontal', color: '#A9A9A9' },
];

const getNextRecurringDate = (date: string, interval: 'monthly' | 'weekly' | 'yearly') => {
  const currentDate = new Date(date);
  switch (interval) {
    case 'weekly':  return addDays(currentDate, 7);
    case 'monthly': return addMonths(currentDate, 1);
    case 'yearly':  return addYears(currentDate, 1);
    default:        return currentDate;
  }
};

// Returns a local date string for N days ago
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const buildSampleTransactions = (): Transaction[] => [
  { id: crypto.randomUUID(), date: daysAgo(0),  type: 'expense', amount: 320,   category: '1', description: 'Lunch at office canteen', isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(1),  type: 'expense', amount: 150,   category: '2', description: 'Auto rickshaw to office',  isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(2),  type: 'expense', amount: 2200,  category: '3', description: 'Electricity bill',          isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(3),  type: 'expense', amount: 1800,  category: '4', description: 'New sneakers',               isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(4),  type: 'expense', amount: 550,   category: '5', description: 'Movie + dinner',             isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(5),  type: 'expense', amount: 700,   category: '6', description: 'Doctor + pharmacy',          isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(6),  type: 'income',  amount: 72000, category: '7', description: 'Monthly salary',             isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(7),  type: 'expense', amount: 480,   category: '1', description: 'Weekly groceries',           isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(8),  type: 'expense', amount: 280,   category: '2', description: 'Cab to airport',             isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(9),  type: 'expense', amount: 1299,  category: '3', description: 'Mobile recharge + OTT',      isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(10), type: 'expense', amount: 2500,  category: '4', description: 'Clothes shopping',            isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(11), type: 'expense', amount: 399,   category: '5', description: 'Netflix subscription',        isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(12), type: 'expense', amount: 420,   category: '1', description: 'Dinner with friends',         isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(14), type: 'income',  amount: 12000, category: '8', description: 'Freelance design project',    isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(15), type: 'expense', amount: 15000, category: '3', description: 'Monthly rent',                isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(18), type: 'expense', amount: 260,   category: '1', description: 'Tea & snacks',                isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(20), type: 'expense', amount: 950,   category: '2', description: 'Monthly metro pass',          isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(22), type: 'expense', amount: 600,   category: '6', description: 'Gym membership',              isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(25), type: 'expense', amount: 340,   category: '5', description: 'Board game night',            isRecurring: false },
  { id: crypto.randomUUID(), date: daysAgo(28), type: 'expense', amount: 1100,  category: '4', description: 'Home decor',                  isRecurring: false },
];

const buildSampleBudgets = (): Budget[] => [
  { categoryId: '1', limit: 4000  }, // Food
  { categoryId: '2', limit: 2000  }, // Transport
  { categoryId: '3', limit: 20000 }, // Bills (rent + utilities)
  { categoryId: '4', limit: 5000  }, // Shopping
  { categoryId: '5', limit: 1500  }, // Entertainment
  { categoryId: '6', limit: 2000  }, // Health
];

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: defaultCategories,
      budgets: [],
      theme: 'light',
      hasOnboarded: false,
      hasToured: false,

      addTransaction: (transaction) => {
        const newTransaction = { ...transaction, id: crypto.randomUUID() };
        if (transaction.isRecurring && transaction.recurringInterval) {
          newTransaction.nextRecurringDate = format(
            getNextRecurringDate(transaction.date, transaction.recurringInterval),
            'yyyy-MM-dd'
          );
        }
        set((state) => ({ transactions: [...state.transactions, newTransaction] }));
      },

      deleteTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),

      updateTransaction: (transaction) =>
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === transaction.id ? transaction : t)),
        })),

      setBudget: (budget) =>
        set((state) => ({
          budgets: [...state.budgets.filter((b) => b.categoryId !== budget.categoryId), budget],
        })),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, { ...category, id: crypto.randomUUID() }] })),

      updateCategory: (category) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === category.id ? category : c)),
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
            newTransactions.push({
              ...transaction,
              id: crypto.randomUUID(),
              date: transaction.nextRecurringDate,
              nextRecurringDate: format(
                getNextRecurringDate(transaction.nextRecurringDate, transaction.recurringInterval!),
                'yyyy-MM-dd'
              ),
            });
          }
        });

        if (newTransactions.length > 0) {
          set((state) => ({ transactions: [...state.transactions, ...newTransactions] }));
        }
      },

      setOnboarded: () => set({ hasOnboarded: true }),
      setToured:    () => set({ hasToured: true }),

      loadSampleData: () =>
        set({
          hasOnboarded: true,
          hasToured:    true,
          transactions: buildSampleTransactions(),
          budgets:      buildSampleBudgets(),
        }),
    }),
    {
      name: 'expense-tracker',
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as ExpenseState;
        // v0 → v1: strip invalid-date transactions
        if (state?.transactions) {
          state.transactions = state.transactions.filter((t) => {
            if (!t.date) return false;
            const d = new Date(`${t.date}T00:00:00`);
            return !isNaN(d.getTime());
          });
        }
        // v1 → v2: mark existing users as already onboarded so they skip the modal
        if (version < 2) {
          const hasData = (state.transactions?.length ?? 0) > 0;
          state.hasOnboarded = hasData;
          state.hasToured    = hasData;
        }
        return state;
      },
      version: 2,
    }
  )
);
