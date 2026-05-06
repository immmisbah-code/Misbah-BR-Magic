import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate } from '@/lib/utils';
import { Transaction } from '@/lib/excelProcessor';

interface TransactionTableProps {
  bankData: (Transaction & { status: string })[];
  qbData: (Transaction & { status: string })[];
}

export const TransactionTable = React.memo(({ bankData, qbData }: TransactionTableProps) => {
  const maxRows = Math.max(bankData.length, qbData.length);
  
  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
      <CardHeader className="bg-[#393a3d] px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xs font-bold uppercase text-[#2ca01c]">
              Master Reconciliation View
            </CardTitle>
            <p className="text-[10px] text-slate-400 font-bold">Unified Bank & Quickbooks Data</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] border-[#2ca01c]/30 text-[#2ca01c]">BANK</Badge>
            <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-500">QUICKBOOKS</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-[600px] overflow-auto custom-scrollbar">
        <div className="min-w-[1000px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 z-10">
              <tr>
                <th colSpan={3} className="px-6 py-3 text-[10px] font-bold text-[#2ca01c] uppercase bg-emerald-50/50 text-center border-r border-slate-100">Bank Statement</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30 text-center border-r border-slate-100">Status</th>
                <th colSpan={3} className="px-6 py-3 text-[10px] font-bold text-blue-500 uppercase bg-blue-50/50 text-center">Quickbooks Data</th>
              </tr>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase">Date</th>
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase">Description</th>
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-100">Amount</th>
                <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase text-center border-r border-slate-100">Match</th>
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase">Date</th>
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase">Description</th>
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Array.from({ length: maxRows }).map((_, idx) => {
                const bankTx = bankData[idx];
                const qbTx = qbData[idx];
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {/* Bank Side */}
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {bankTx ? formatDate(bankTx.date) : ''}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-600 max-w-[150px] truncate">
                      {bankTx ? bankTx.description : ''}
                    </td>
                    <td className={`px-6 py-4 text-[11px] font-bold text-right tabular-nums border-r border-slate-100 ${bankTx?.amount < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                      {bankTx ? bankTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                    </td>

                    {/* Status Middle */}
                    <td className="px-4 py-4 text-center border-r border-slate-100">
                      {bankTx && (
                        <Badge className={`text-[8px] px-1.5 py-0 rounded-md ${bankTx.status === 'matched' ? 'bg-[#2ca01c] text-white' : 'bg-amber-400 text-white'}`}>
                          {bankTx.status.toUpperCase()}
                        </Badge>
                      )}
                    </td>

                    {/* QB Side */}
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {qbTx ? formatDate(qbTx.date) : ''}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-600 max-w-[150px] truncate">
                      {qbTx ? qbTx.description : ''}
                    </td>
                    <td className={`px-6 py-4 text-[11px] font-bold text-right tabular-nums ${qbTx?.amount < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                      {qbTx ? qbTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

TransactionTable.displayName = 'TransactionTable';
