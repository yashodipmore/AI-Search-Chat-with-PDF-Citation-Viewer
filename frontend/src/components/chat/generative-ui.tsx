"use client";

import { motion } from "framer-motion";
import { BarChart3, Table, Info, LayoutGrid } from "lucide-react";
import type { UIComponent, ChartData } from "@/types";

interface GenerativeUIComponentProps {
  component: UIComponent;
}

export function GenerativeUIComponent({ component }: GenerativeUIComponentProps) {
  switch (component.type) {
    case "chart":
      return <ChartComponent component={component} />;
    case "table":
      return <TableComponent component={component} />;
    case "card":
      return <CardComponent component={component} />;
    case "info_box":
      return <InfoBoxComponent component={component} />;
    default:
      return null;
  }
}

function ChartComponent({ component }: { component: UIComponent }) {
  const data = component.data as unknown as ChartData;
  
  // Simple bar chart visualization
  const maxValue = Math.max(...(data.datasets?.[0]?.data || [100]));
  const bars = data.labels?.map((label, idx) => ({
    label,
    value: data.datasets?.[0]?.data?.[idx] || 0,
    color: data.datasets?.[0]?.backgroundColor?.[idx] || '#3b82f6',
  })) || [];
  
  return (
    <div className="gen-ui-component">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary-500" />
        <h4 className="font-medium text-surface-900 dark:text-white">
          {component.title || 'Analysis Chart'}
        </h4>
      </div>
      
      <div className="space-y-3">
        {bars.map((bar, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="space-y-1"
          >
            <div className="flex justify-between text-sm">
              <span className="text-surface-600 dark:text-surface-300">{bar.label}</span>
              <span className="font-medium text-surface-900 dark:text-white">{bar.value}%</span>
            </div>
            <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(bar.value / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: bar.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TableComponent({ component }: { component: UIComponent }) {
  const data = component.data as { headers?: string[]; rows?: string[][] };
  
  return (
    <div className="gen-ui-component overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <Table className="w-5 h-5 text-primary-500" />
        <h4 className="font-medium text-surface-900 dark:text-white">
          {component.title || 'Data Table'}
        </h4>
      </div>
      
      <table className="w-full text-sm">
        {data.headers && (
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              {data.headers.map((header, idx) => (
                <th key={idx} className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {data.rows?.map((row, rowIdx) => (
            <motion.tr
              key={rowIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: rowIdx * 0.05 }}
              className="border-b border-surface-100 dark:border-surface-800"
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="py-2 px-3 text-surface-900 dark:text-white">
                  {cell}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardComponent({ component }: { component: UIComponent }) {
  const data = component.data as { title?: string; value?: string | number; description?: string; icon?: string };
  
  return (
    <div className="gen-ui-component">
      <div className="flex items-center gap-2 mb-2">
        <LayoutGrid className="w-5 h-5 text-primary-500" />
        <h4 className="font-medium text-surface-900 dark:text-white">
          {component.title || data.title || 'Metric'}
        </h4>
      </div>
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-2"
      >
        <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {data.value}
        </p>
        {data.description && (
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {data.description}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function InfoBoxComponent({ component }: { component: UIComponent }) {
  const data = component.data as { message?: string; type?: 'info' | 'warning' | 'success' };
  
  const colors = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${colors[data.type || 'info']}`}
    >
      <div className="flex items-start gap-2">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium">{component.title || 'Information'}</h4>
          <p className="mt-1 text-sm opacity-90">{data.message}</p>
        </div>
      </div>
    </motion.div>
  );
}
