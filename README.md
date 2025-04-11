# Expenso - Smart Expense Tracking

Expenso is a modern, feature-rich expense tracking application built with React and TypeScript. It helps users manage their finances by tracking expenses, setting budgets, and visualizing spending patterns.

## 🌍 Live Demo

Check out the live version of Expenso -Smart Expense Tracking Website: [Expenso Website Live](https://expens-by-partha.netlify.app/)


## Features

### Transaction Management
- Add, edit, and delete transactions with a user-friendly interface
- Categorize expenses with custom categories
- Track both income and expenses
- Support for multiple payment methods
- Detailed transaction history with advanced filtering and search

### Data Visualization
- Interactive charts showing expense distribution:
  - Pie chart for category-wise breakdown
  - Line chart for tracking trends
  - Bar chart for monthly comparison
- Category-wise expense analysis
- Export data to CSV and PDF formats

### User Experience
- Responsive design that works on all devices
- Clean, modern interface with high contrast for better readability
- Advanced filtering and search capabilities
- Smooth animations and transitions

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **PDF Generation**: jsPDF
- **Icons**: Lucide React

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # React components
│   ├── AddTransaction.tsx
│   ├── Dashboard.tsx
│   ├── ExpenseChart.tsx
│   ├── Sidebar.tsx
│   └── TransactionList.tsx
├── store/              # Zustand store
├── types/              # TypeScript types
├── App.tsx            # Main application component
└── main.tsx          # Application entry point
```

## Features in Detail

### Transaction Management
- **Quick Entry**: Easy-to-use form for adding transactions
- **Categorization**: Organize expenses by categories
- **Payment Methods**: Support for cash, card, UPI, and net banking
- **Search & Filter**: Global search and advanced filtering options

### Data Analysis
- **Visual Reports**: Multiple chart types for expense analysis
- **Time Ranges**: View data for different periods (3, 6, or 12 months)
- **Export Options**: Download reports in CSV or PDF format

### Responsive Design
- Works seamlessly on:
  - Desktop computers
  - Tablets
  - Mobile phones
- Optimized layouts for different screen sizes
- Touch-friendly interface

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
