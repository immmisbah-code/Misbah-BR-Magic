/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Play, 
  Download, 
  RefreshCw,
  FileText,
  AlertTriangle,
  Sparkles,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { LoginGate } from '@/components/LoginGate';
import { SummaryCards } from '@/components/SummaryCards';
import { TransactionTable } from '@/components/TransactionTable';

import { cn, formatDate } from '@/lib/utils';
import { processReconciliation, processPDFReconciliation, generateExcelFile, ReconciliationResult } from '@/lib/excelProcessor';
import { extractTransactionsFromPDF } from '@/services/geminiService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<'excel' | 'pdf'>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [qbFile, setQbFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const qbInputRef = useRef<HTMLInputElement>(null);
  
  const filteredData = React.useMemo(() => {
    if (!result) return null;
    if (!activeFilter) return result;

    if (activeFilter === 'matched') {
      return {
        ...result,
        bankData: result.bankData.filter(tx => tx.status === 'matched'),
        qbData: result.qbData.filter(tx => tx.status === 'matched')
      };
    }
    if (activeFilter === 'missing') {
      return {
        ...result,
        bankData: result.bankData.filter(tx => tx.status === 'missing'),
        qbData: []
      };
    }
    if (activeFilter === 'duplicate') {
      return {
        ...result,
        bankData: [],
        qbData: result.qbData.filter(tx => tx.status === 'duplicate')
      };
    }
    if (activeFilter === 'extra') {
      return {
        ...result,
        bankData: [],
        qbData: result.qbData.filter(tx => tx.status === 'extra')
      };
    }
    return result;
  }, [result, activeFilter]);

  if (!isLoggedIn) {
    return <LoginGate onLogin={(u, p) => {
      if (u === 'Misbah' && p === 'Mas*1686') {
        setIsLoggedIn(true);
        toast.success('Welcome back, Misbah!');
      } else {
        toast.error('Invalid username or password');
      }
    }} />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'single' | 'bank' | 'qb') => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      
      if (type === 'bank') {
        if (fileName.endsWith('.pdf')) {
          setBankFile(selectedFile);
          toast.success('Bank PDF selected');
        } else {
          toast.error('Please upload a PDF for Bank Statement');
        }
        return;
      }

      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));

      if (isValid) {
        if (type === 'single') setFile(selectedFile);
        if (type === 'qb') setQbFile(selectedFile);
        setResult(null);
        setActiveFilter(null);
        toast.success('File selected: ' + selectedFile.name);
      } else {
        toast.error('Invalid file format. Please upload .xlsx, .xls, or .csv');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const startReconciliation = async () => {
    if (mode === 'excel' && !file) return;
    if (mode === 'pdf' && (!bankFile || !qbFile)) return;

    setIsProcessing(true);
    setProgress(10);
    setActiveFilter(null);
    
    try {
      if (mode === 'excel') {
        const reconResult = await processReconciliation(file!);
        setResult(reconResult);
      } else {
        setProgress(20);
        toast.info('Extracting transactions from PDF...');
        const pdfBase64 = await fileToBase64(bankFile!);
        const extractedTransactions = await extractTransactionsFromPDF(pdfBase64);
        
        setProgress(60);
        toast.info('Matching with Quickbooks data...');
        const reconResult = await processPDFReconciliation(extractedTransactions as any, qbFile!);
        setResult(reconResult);
      }
      
      setProgress(100);
      toast.success('Completed successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = async () => {
    if (!result) return;
    try {
      const blob = await generateExcelFile(result);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reconciled_${file?.name || 'Result.xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate file');
    }
  };

  const reset = () => {
    setFile(null);
    setBankFile(null);
    setQbFile(null);
    setResult(null);
    setProgress(0);
    setActiveFilter(null);
    [fileInputRef, bankInputRef, qbInputRef].forEach(ref => {
      if (ref.current) ref.current.value = '';
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#1A1A1A] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Toaster position="top-center" richColors />
      
      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 bg-slate-50/50 pointer-events-none" />

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-default">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="bg-[#2ca01c] p-2.5 rounded-xl shadow-lg shadow-emerald-100"
            >
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-[#393a3d] leading-none">Misbah's BR Magic</h1>
              <p className="text-[10px] text-[#2ca01c] font-bold mt-1.5 uppercase">Bank Reconciliation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Ready</span>
            </div>
            <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
              v1.0.0
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Upload & Controls */}
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-2xl w-fit gap-1">
                <Button 
                  variant="ghost"
                  onClick={reset}
                  className="rounded-xl px-6 h-10 font-bold text-xs uppercase text-[#2ca01c] hover:text-white hover:bg-[#2ca01c] transition-all"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <div className="w-px h-6 bg-slate-200 self-center mx-1" />
                <Button 
                  variant={mode === 'excel' ? 'default' : 'ghost'}
                  onClick={() => { setMode('excel'); reset(); }}
                  className={`rounded-xl px-6 h-10 font-bold text-xs uppercase transition-all ${mode === 'excel' ? 'bg-[#393a3d] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel Mode
                </Button>
                <Button 
                  variant={mode === 'pdf' ? 'default' : 'ghost'}
                  onClick={() => { setMode('pdf'); reset(); }}
                  className={`rounded-xl px-6 h-10 font-bold text-xs uppercase transition-all ${mode === 'pdf' ? 'bg-[#2ca01c] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI PDF Mode
                </Button>
              </div>

              <div className="space-y-3">
                <motion.h2 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl font-bold text-[#393a3d]"
                >
                  {mode === 'excel' ? (
                    <>Transform your <span className="text-[#2ca01c]">Data.</span></>
                  ) : (
                    <>AI-Powered <span className="text-[#2ca01c]">PDF Magic.</span></>
                  )}
                </motion.h2>
              </div>
            </div>

            <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden rounded-[2rem] bg-white/80 backdrop-blur-sm">
              <CardContent className="p-10">
                {mode === 'excel' ? (
                  <div 
                    className={`
                      relative border-2 border-dashed rounded-[1.5rem] p-12 transition-all duration-500 flex flex-col items-center justify-center text-center group
                      ${file ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}
                    `}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedFile = e.dataTransfer.files[0];
                      if (droppedFile) {
                        const event = { target: { files: [droppedFile] } } as any;
                        handleFileChange(event, 'single');
                      }
                    }}
                  >
                    {file ? (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-5"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-indigo-400 blur-2xl opacity-20 animate-pulse" />
                          <div className="relative bg-white p-5 rounded-2xl w-fit mx-auto shadow-xl border border-indigo-50">
                            <FileSpreadsheet className="w-10 h-10 text-indigo-600" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-lg truncate max-w-[240px]">{file.name}</p>
                          <p className="text-[10px] text-indigo-500 mt-1.5 uppercase font-bold">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={reset} 
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-bold text-xs"
                        >
                          Change file
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="space-y-8">
                        <div className="relative group-hover:scale-110 transition-transform duration-500">
                          <div className="absolute inset-0 bg-slate-200 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
                          <div className="relative bg-white p-5 rounded-2xl w-fit mx-auto shadow-sm border border-slate-100">
                            <Upload className="w-10 h-10 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-slate-800 text-xl">Drop your file</p>
                          <p className="text-sm text-slate-400 font-medium">Excel or CSV files only</p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white border-slate-200 hover:border-indigo-600 hover:text-indigo-600 font-black px-8 h-12 rounded-xl transition-all shadow-sm hover:shadow-indigo-100"
                        >
                          Select from Device
                        </Button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e, 'single')}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Bank PDF Upload */}
                    <div 
                      className={`
                        relative border-2 border-dashed rounded-[1.5rem] p-8 transition-all duration-500 flex flex-col items-center justify-center text-center group
                        ${bankFile ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}
                      `}
                      onClick={() => !bankFile && bankInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile && droppedFile.type === 'application/pdf') {
                          const event = { target: { files: [droppedFile] } } as any;
                          handleFileChange(event, 'bank');
                        }
                      }}
                    >
                      {bankFile ? (
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-50">
                            <FileText className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{bankFile.name}</p>
                            <p className="text-[9px] text-indigo-500 uppercase font-black">Bank Statement PDF</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setBankFile(null); }} className="h-8 w-8 p-0 rounded-lg text-rose-500"><RefreshCw className="w-3 h-3 rotate-45" /></Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-800 text-sm">Upload Bank PDF</p>
                        </div>
                      )}
                      <input type="file" ref={bankInputRef} onChange={(e) => handleFileChange(e, 'bank')} accept=".pdf" className="hidden" />
                    </div>

                    {/* QB Excel Upload */}
                    <div 
                      className={`
                        relative border-2 border-dashed rounded-[1.5rem] p-8 transition-all duration-500 flex flex-col items-center justify-center text-center group
                        ${qbFile ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'}
                      `}
                      onClick={() => !qbFile && qbInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile) {
                          const event = { target: { files: [droppedFile] } } as any;
                          handleFileChange(event, 'qb');
                        }
                      }}
                    >
                      {qbFile ? (
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-50">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{qbFile.name}</p>
                            <p className="text-[9px] text-blue-500 uppercase font-black">Quickbook Excel</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setQbFile(null); }} className="h-8 w-8 p-0 rounded-lg text-rose-500"><RefreshCw className="w-3 h-3 rotate-45" /></Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-800 text-sm">Upload QB Excel</p>
                        </div>
                      )}
                      <input type="file" ref={qbInputRef} onChange={(e) => handleFileChange(e, 'qb')} accept=".xlsx, .xls, .csv" className="hidden" />
                    </div>
                  </div>
                )}

                <div className="mt-10 space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Required Data</p>
                    <div className="flex gap-2">
                      <Badge className="bg-[#393a3d] text-white border-none px-3 py-1 rounded-lg font-bold text-[9px]">DATE</Badge>
                      <Badge className="bg-[#393a3d] text-white border-none px-3 py-1 rounded-lg font-bold text-[9px]">DESC</Badge>
                      <Badge className="bg-[#393a3d] text-white border-none px-3 py-1 rounded-lg font-bold text-[9px]">AMOUNT</Badge>
                    </div>
                  </div>
                  
                  <Button 
                    className={`w-full text-white shadow-lg h-16 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] group overflow-hidden relative ${mode === 'excel' ? 'bg-[#393a3d] hover:bg-black' : 'bg-[#2ca01c] hover:bg-[#248a18]'}`}
                    disabled={(mode === 'excel' ? !file : (!bankFile || !qbFile)) || isProcessing}
                    onClick={startReconciliation}
                  >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${mode === 'excel' ? 'bg-gradient-to-r from-indigo-600 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`} />
                    <span className="relative flex items-center justify-center">
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                          {mode === 'pdf' ? 'AI is Thinking...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          {mode === 'pdf' ? <Sparkles className="w-5 h-5 mr-3" /> : <Play className="w-5 h-5 mr-3 fill-current" />}
                          {mode === 'pdf' ? 'Run AI Magic' : 'Run Magic'}
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>


            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 px-4"
              >
                <div className="flex justify-between text-[10px] font-bold uppercase text-[#2ca01c]">
                  <span>Analyzing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-[#2ca01c]"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-10"
                >
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold text-[#393a3d]">Analysis Report</h2>
                    <div className="bg-[#2ca01c] p-2 rounded-xl">
                      <RefreshCw className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <SummaryCards 
                    summary={result.summary} 
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />

                  {/* Unified Transaction List */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <TransactionTable 
                      bankData={filteredData?.bankData || []} 
                      qbData={filteredData?.qbData || []} 
                    />
                  </motion.div>

                  <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                    <CardHeader className="px-8 py-6 border-b border-slate-50">
                      <CardTitle className="text-sm font-bold text-slate-400 uppercase">
                        Export Legend
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { color: 'bg-[#FFFFD7]', label: 'Missing in Quickbooks' },
                          { color: 'bg-[#FFFFFFE0]', label: 'Duplicate entries in QB' },
                          { color: 'bg-[#B22222]', label: 'Extra entries in QB' },
                          { color: 'bg-[#90EE90]', label: 'Perfectly matched' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                            <div className={`w-4 h-4 rounded-full ${item.color} border border-black/5`} />
                            <p className="text-xs font-medium text-slate-600">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="p-8 pt-0">
                      <Button 
                        onClick={downloadResult}
                        className="w-full bg-[#2ca01c] hover:bg-[#248a18] text-white h-14 rounded-xl font-bold text-base transition-all"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm"
                >
                  <AlertTriangle className="w-12 h-12 text-slate-200 mb-6" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Yet</h3>
                  <p className="text-slate-400 text-sm max-w-xs font-medium">
                    Upload your files to see the analysis report here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-50 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3 opacity-30 grayscale">
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase">Misbah's BR Magic</span>
          </div>
          <div className="flex items-center gap-8">
          </div>
        </div>
      </footer>
    </div>
  );
}

