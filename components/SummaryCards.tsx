import * as React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, RefreshCw, AlertTriangle, Layers, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryItem {
  id: string;
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
}

interface SummaryCardsProps {
  summary: {
    totalBank: number;
    totalQB: number;
    missingCount: number;
    duplicateCount: number;
    extraCount: number;
    matchedCount: number;
  };
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export const SummaryCards = ({ summary, activeFilter, onFilterChange }: SummaryCardsProps) => {
  const items: SummaryItem[] = [
    { id: 'matched', label: 'Matched', value: summary.matchedCount, color: 'hover:bg-emerald-50 border-emerald-100/50 text-emerald-700', icon: CheckCircle2 },
    { id: 'missing', label: 'Missing', value: summary.missingCount, color: 'hover:bg-amber-50 border-amber-100/50 text-amber-700', icon: AlertCircle },
    { id: 'duplicate', label: 'Duplicates', value: summary.duplicateCount, color: 'hover:bg-rose-50 border-rose-100/50 text-rose-700', icon: RefreshCw },
    { id: 'extra', label: 'Extra', value: summary.extraCount, color: 'hover:bg-orange-50 border-orange-100/50 text-orange-700', icon: AlertTriangle },
    { id: 'bank', label: 'Bank Total', value: summary.totalBank, color: 'border-slate-100 text-slate-600', icon: Layers },
    { id: 'qb', label: 'QB Total', value: summary.totalQB, color: 'border-slate-100 text-slate-600', icon: Layers },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          whileHover={!['bank', 'qb'].includes(item.id) ? { y: -4 } : {}}
        >
          <Card 
            className={`
              relative border shadow-sm rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer group h-full
              ${activeFilter === item.id ? 'ring-2 ring-[#2ca01c] border-transparent' : 'bg-white'}
              ${['bank', 'qb'].includes(item.id) ? 'cursor-default' : ''}
              ${item.color}
            `}
            onClick={() => !['bank', 'qb'].includes(item.id) && onFilterChange(activeFilter === item.id ? null : item.id)}
          >
            <CardContent className="p-5 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold uppercase opacity-50">{item.label}</p>
                <item.icon className="w-4 h-4 opacity-40" />
              </div>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
