import React, { useState, useMemo } from 'react';
import { useExpenseStore } from '../store';
import { PieChart as PieChartIcon, Download, LineChart as LineChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, subMonths } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  BarChart,
  Bar,
  LabelList
} from 'recharts';

type ChartType = 'pie' | 'line' | 'bar';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs md:text-sm font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200/20">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span style={{ color: entry.color }}>
              {entry.name}: {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
              }).format(entry.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ExpenseChart = () => {
  const { transactions, categories } = useExpenseStore();
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [timeRange, setTimeRange] = useState<number>(6);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categories.slice(0, 5).map(c => c.id)
  );

  const { categoryExpenses, totalExpense, monthlyData } = useMemo(() => {
    const categoryExp = categories
      .filter(c => selectedCategories.includes(c.id))
      .map(category => {
        const total = transactions
          .filter(t => t.category === category.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          id: category.id,
          name: category.name,
          value: total,
          color: category.color,
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalExp = categoryExp.reduce((sum, item) => sum + item.value, 0);

    const months = Array.from({ length: timeRange }, (_, i) => {
      const date = subMonths(new Date(), i);
      return format(date, 'MMM yyyy');
    }).reverse();

    const monthlyD = months.map(month => {
      const monthData = categories
        .filter(c => selectedCategories.includes(c.id))
        .reduce((acc, category) => {
          const total = transactions
            .filter(t => 
              t.category === category.id && 
              t.type === 'expense' &&
              format(new Date(t.date), 'MMM yyyy') === month
            )
            .reduce((sum, t) => sum + t.amount, 0);
          
          return {
            ...acc,
            [category.name]: total,
            month
          };
        }, { month });

      return monthData;
    });

    return { categoryExpenses: categoryExp, totalExpense: totalExp, monthlyData: monthlyD };
  }, [transactions, categories, selectedCategories, timeRange]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const centerText = (text: string, y: number, size = 10) => {
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    doc.setFillColor(75, 85, 99);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    centerText('Expense Distribution Report', 25, 24);
    
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(10);
    doc.text('Report Details:', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 60);
    doc.text(`Period: Last ${timeRange} months`, 14, 70);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Expenses: ${new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(totalExpense)}`, 14, 100);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown', 14, 120);
    
    const tableColumn = [
      "Category",
      "Amount",
      "Percentage",
      "vs. Previous Month"
    ];
    
    const tableRows = categoryExpenses.map(item => {
      const prevMonthTotal = transactions
        .filter(t => 
          t.category === categories.find(c => c.name === item.name)?.id &&
          t.type === 'expense' &&
          new Date(t.date) >= subMonths(new Date(), 1) &&
          new Date(t.date) < new Date()
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentChange = prevMonthTotal ? 
        ((item.value - prevMonthTotal) / prevMonthTotal) * 100 : 0;
      
      return [
        item.name,
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(item.value),
        `${((item.value / totalExpense) * 100).toFixed(1)}%`,
        `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`
      ];
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 130,
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [75, 85, 99],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 130;
    
    if (finalY + 60 > pageHeight) {
      doc.addPage();
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Key Insights', 14, finalY + 20);
    doc.setFont('helvetica', 'normal');
    
    const highestCategory = categoryExpenses.reduce((prev, current) => 
      (current.value > prev.value) ? current : prev
    );
    
    const insights = [
      `Highest spending category: ${highestCategory.name} (${((highestCategory.value / totalExpense) * 100).toFixed(1)}% of total)`,
      `Average monthly expense: ${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(totalExpense / timeRange)}`,
    ];
    
    insights.forEach((insight, index) => {
      doc.text(`• ${insight}`, 14, finalY + 30 + (index * 10));
    });
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerText = 'Generated by Expenso - Smart Expense Tracking';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
    
    doc.save("expense-report.pdf");
  };

  const csvData = categoryExpenses.map(item => ({
    Category: item.name,
    Amount: item.value,
    Percentage: `${((item.value / totalExpense) * 100).toFixed(1)}%`
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col w-full sm:w-auto">
          <label className="text-sm font-medium text-slate-900 mb-1">Select Categories</label>
          <select
            multiple
            value={selectedCategories}
            onChange={(e) => setSelectedCategories(
              Array.from(e.target.selectedOptions, option => option.value)
            )}
            className="w-full sm:w-64 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900"
            size={3}
          >
            {categories.map(category => (
              <option 
                key={category.id} 
                value={category.id}
                className="py-1"
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900"
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>

          <div className="flex space-x-1">
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'pie' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 border border-slate-300'
              }`}
            >
              <PieChartIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'line' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 border border-slate-300'
              }`}
            >
              <LineChartIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'bar' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 border border-slate-300'
              }`}
            >
              <BarChartIcon className="h-5 w-5" />
            </button>
          </div>

          {totalExpense > 0 && (
            <div className="flex space-x-1">
              <CSVLink
                data={csvData}
                filename="expense-report.csv"
                className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 hover:bg-slate-50"
              >
                <Download className="h-5 w-5" />
              </CSVLink>
              <button
                onClick={exportPDF}
                className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 hover:bg-slate-50"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {totalExpense > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Summary</h3>
          <p className="text-sm text-slate-600">
            Total expenses in {format(new Date(), 'MMMM yyyy')}: 
            <span className="font-medium ml-1 text-slate-900">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
              }).format(totalExpense)}
            </span>
          </p>
          {categoryExpenses[0] && (
            <p className="text-sm text-slate-600">
              Highest in {categoryExpenses[0].name}:
              <span className="font-medium ml-1 text-slate-900">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(categoryExpenses[0].value)}
              </span>
            </p>
          )}
        </div>
      )}

      {totalExpense > 0 ? (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={chartType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-[400px] md:h-[500px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={categoryExpenses}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      label={renderCustomizedLabel}
                      labelLine={false}
                    >
                      {categoryExpenses.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      formatter={(value, entry: any) => (
                        <span className="text-sm">
                          {value} ({((entry.payload.value / totalExpense) * 100).toFixed(1)}%)
                        </span>
                      )}
                    />
                  </PieChart>
                ) : chartType === 'line' ? (
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          notation: 'compact',
                          maximumFractionDigits: 1
                        }).format(value)
                      }
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {categories
                      .filter(c => selectedCategories.includes(c.id))
                      .map((category) => (
                        <Line
                          key={category.id}
                          type="monotone"
                          dataKey={category.name}
                          stroke={category.color}
                          strokeWidth={2}
                          dot={{ r: 4, fill: category.color }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                  </LineChart>
                ) : (
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          notation: 'compact',
                          maximumFractionDigits: 1
                        }).format(value)
                      }
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {categories
                      .filter(c => selectedCategories.includes(c.id))
                      .map((category) => (
                        <Bar
                          key={category.id}
                          dataKey={category.name}
                          fill={category.color}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-600 bg-white rounded-lg">
          No expense data to display
        </div>
      )}
    </div>
  );
};

export default ExpenseChart;