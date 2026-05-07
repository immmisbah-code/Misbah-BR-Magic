import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export interface Transaction {
  date: any;
  description: string;
  amount: number;
  id: string; // Internal ID for tracking
}

export interface ReconciliationResult {
  bankData: (Transaction & { status: 'matched' | 'missing' })[];
  qbData: (Transaction & { status: 'matched' | 'duplicate' | 'extra' })[];
  summary: {
    totalBank: number;
    totalQB: number;
    missingCount: number;
    duplicateCount: number;
    extraCount: number;
    matchedCount: number;
  };
}

// Removed unused getMatchKey

const getCellValue = (row: any, keywords: string[]) => {
  const key = Object.keys(row).find(k => 
    keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase()))
  );
  return key ? row[key] : null;
};

const parseRow = (row: any, index: number): Transaction => {
  const dateVal = getCellValue(row, ['date', 'time', 'period']);
  let date: any = dateVal;
  
  // Robust date parsing
  if (dateVal !== null && dateVal !== undefined) {
    if (typeof dateVal === 'number') {
      // Handle Excel serial dates (XLSX utils sometimes returns them as numbers)
      // Excel base date is Dec 30, 1899
      date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    } else if (typeof dateVal === 'string') {
      const parsed = new Date(dateVal);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    } else if (dateVal instanceof Date) {
      date = dateVal;
    }
  }

  // Fallback if parsing failed or date is invalid
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    date = dateVal || '';
  }

  const description = String(getCellValue(row, ['description', 'desc', 'narrative', 'particulars', 'memo']) || '');
  
  const debitVal = getCellValue(row, ['debit', 'withdrawal', 'payment', 'out']);
  const creditVal = getCellValue(row, ['credit', 'deposit', 'receipt', 'in']);
  const amountVal = getCellValue(row, ['amount', 'value', 'total', 'price', 'balance']);

  let amount = 0;
  if (debitVal !== null && debitVal !== undefined && String(debitVal).trim() !== '') {
    amount = -Math.abs(parseFloat(String(debitVal).replace(/[$,]/g, '')) || 0);
  } else if (creditVal !== null && creditVal !== undefined && String(creditVal).trim() !== '') {
    amount = Math.abs(parseFloat(String(creditVal).replace(/[$,]/g, '')) || 0);
  } else {
    amount = parseFloat(String(amountVal || 0).replace(/[$,]/g, ''));
  }
  
  return {
    date,
    description,
    amount,
    id: `row-${index}-${Math.random().toString(36).substring(2, 11)}`
  };
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = (str1 || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const s2 = (str2 || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  
  if (s1.length === 0 && s2.length === 0) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  
  return intersection / Math.max(set1.size, set2.size);
};

export const reconcileTransactions = (bankTransactions: Transaction[], qbTransactions: Transaction[]): ReconciliationResult => {
  // Group QB by amount
  const qbByAmount = new Map<number, Transaction[]>();
  qbTransactions.forEach(tx => {
    const amt = Number(tx.amount.toFixed(2));
    if (!qbByAmount.has(amt)) qbByAmount.set(amt, []);
    qbByAmount.get(amt)!.push(tx);
  });

  const matchedQBIds = new Set<string>();
  const resultBank: (Transaction & { status: 'matched' | 'missing' })[] = [];
  
  let matchedCount = 0;
  let missingCount = 0;

  // 1. Match Bank to QB (Focus on Amount, use Similarity for disambiguation)
  bankTransactions.forEach(bankTx => {
    const amt = Number(bankTx.amount.toFixed(2));
    const candidates = qbByAmount.get(amt) || [];
    
    let bestMatch: Transaction | null = null;
    let maxSimilarity = -1;

    candidates.forEach(qbTx => {
      if (!matchedQBIds.has(qbTx.id)) {
        const sim = calculateSimilarity(bankTx.description, qbTx.description);
        if (sim > maxSimilarity) {
          maxSimilarity = sim;
          bestMatch = qbTx;
        }
      }
    });

    if (bestMatch) {
      resultBank.push({ ...bankTx, status: 'matched' });
      matchedQBIds.add((bestMatch as Transaction).id);
      matchedCount++;
    } else {
      resultBank.push({ ...bankTx, status: 'missing' });
      missingCount++;
    }
  });

  // 2. Determine QB statuses
  const resultQB: (Transaction & { status: 'matched' | 'duplicate' | 'extra' })[] = [];
  const bankAmountCounts = new Map<number, number>();
  bankTransactions.forEach(tx => {
    const amt = Number(tx.amount.toFixed(2));
    bankAmountCounts.set(amt, (bankAmountCounts.get(amt) || 0) + 1);
  });

  const qbAmountUsage = new Map<number, number>();

  qbTransactions.forEach(qbTx => {
    const amt = Number(qbTx.amount.toFixed(2));
    const bankCount = bankAmountCounts.get(amt) || 0;
    const currentUsage = (qbAmountUsage.get(amt) || 0) + 1;
    qbAmountUsage.set(amt, currentUsage);

    if (matchedQBIds.has(qbTx.id)) {
      resultQB.push({ ...qbTx, status: 'matched' });
    } else if (bankCount === 0) {
      resultQB.push({ ...qbTx, status: 'extra' });
    } else {
      resultQB.push({ ...qbTx, status: 'duplicate' });
    }
  });

  const duplicateCount = resultQB.filter(r => r.status === 'duplicate').length;
  const extraCount = resultQB.filter(r => r.status === 'extra').length;

  return {
    bankData: resultBank,
    qbData: resultQB,
    summary: {
      totalBank: bankTransactions.length,
      totalQB: qbTransactions.length,
      missingCount,
      duplicateCount,
      extraCount,
      matchedCount
    }
  };
};

export const processReconciliation = async (file: File): Promise<ReconciliationResult> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);

  const sheetNames = workbook.SheetNames;
  
  // Robust sheet detection
  const findSheet = (keywords: string[]) => {
    return sheetNames.find(name => 
      keywords.some(k => name.toLowerCase().includes(k.toLowerCase()))
    );
  };

  const bankSheetName = findSheet(['Bank Data', 'Bank Statement', 'Bank']) || sheetNames[0];
  const qbSheetName = findSheet(['Quickbook Data', 'Quickbook', 'QB Data', 'QB']) || sheetNames[1];

  if (!bankSheetName || !qbSheetName || bankSheetName === qbSheetName) {
    throw new Error('Excel file must contain two distinct sheets for "Bank Data" and "Quickbook Data". Please check sheet names.');
  }

  const bankSheet = workbook.Sheets[bankSheetName];
  const qbSheet = workbook.Sheets[qbSheetName];

  const bankRows: any[] = XLSX.utils.sheet_to_json(bankSheet);
  const qbRows: any[] = XLSX.utils.sheet_to_json(qbSheet);

  const bankTransactions = bankRows.map((r, i) => parseRow(r, i));
  const qbTransactions = qbRows.map((r, i) => parseRow(r, i));

  return reconcileTransactions(bankTransactions, qbTransactions);
};

export const processPDFReconciliation = async (bankTransactions: Transaction[], qbFile: File): Promise<ReconciliationResult> => {
  const data = await qbFile.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetNames = workbook.SheetNames;
  
  // For PDF mode, we assume the provided Excel file is the QB data
  // We'll look for a QB sheet or just use the first sheet
  const findSheet = (keywords: string[]) => {
    return sheetNames.find(name => 
      keywords.some(k => name.toLowerCase().includes(k.toLowerCase()))
    );
  };

  const qbSheetName = findSheet(['Quickbook Data', 'Quickbook', 'QB Data', 'QB']) || sheetNames[0];
  const qbSheet = workbook.Sheets[qbSheetName];
  const qbRows: any[] = XLSX.utils.sheet_to_json(qbSheet);
  const qbTransactions = qbRows.map((r, i) => parseRow(r, i));

  return reconcileTransactions(bankTransactions, qbTransactions);
};


export const generateExcelFile = async (result: ReconciliationResult): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Misbah\'s BR Magic');
  sheet.views = [{ showGridLines: false }];

  const skyBlue = 'FF87CEEB';
  const offWhite = 'FFF5F5F5';

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FF000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: skyBlue } }, // Sky Blue
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    }
  };

  const sectionHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, color: { argb: 'FF000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: skyBlue } }, // Sky Blue
    alignment: { horizontal: 'center', vertical: 'middle' } // Centered
  };

  // 1. Summary Section in Columns J and K
  sheet.mergeCells('J1:K1');
  sheet.getCell('J1').value = 'RECONCILIATION SUMMARY';
  sheet.getCell('J1').style = sectionHeaderStyle as ExcelJS.Style;

  const summaryItems = [
    { label: 'Total Bank', formula: 'COUNTA(A11:A5000)', color: offWhite, textColor: 'FF000000' },
    { label: 'Total QB', formula: 'COUNTA(F11:F5000)', color: offWhite, textColor: 'FF000000' },
    { label: 'Matched', formula: 'COUNTIF(D11:D5000, "MATCHED")', color: 'FF2CA01C', textColor: 'FFFFFFFF' },
    { label: 'Missing', formula: 'COUNTIF(D11:D5000, "MISSING")', color: 'FFFFD700', textColor: 'FF000000' },
    { label: 'Duplicates', formula: 'COUNTIF(I11:I5000, "DUPLICATE")', color: 'FFFFE0B3', textColor: 'FF000000' },
    { label: 'Extra', formula: 'COUNTIF(I11:I5000, "EXTRA")', color: 'FFB22222', textColor: 'FFFFFFFF' }
  ];

  summaryItems.forEach((item, i) => {
    const rowNum = i + 2;
    const labelCell = sheet.getCell(`J${rowNum}`);
    const valueCell = sheet.getCell(`K${rowNum}`);

    labelCell.value = item.label;
    labelCell.style = {
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'left' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: offWhite } },
      border: { 
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      }
    };

    valueCell.value = { formula: item.formula, result: 0 };
    valueCell.style = {
      font: { bold: true, color: { argb: item.textColor } },
      alignment: { horizontal: 'center' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color } },
      border: { 
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      }
    };
  });

  // 2. Data Headers (Row 10)
  const startRow = 10;
  sheet.mergeCells('A9:D9');
  sheet.getCell('A9').value = 'BANK DATA';
  sheet.getCell('A9').style = sectionHeaderStyle as ExcelJS.Style;

  sheet.mergeCells('F9:I9');
  sheet.getCell('F9').value = 'QUICKBOOK DATA';
  sheet.getCell('F9').style = sectionHeaderStyle as ExcelJS.Style;

  const bankHeaders = ['DATE', 'DESCRIPTION', 'AMOUNT', 'STATUS'];
  const qbHeaders = ['DATE', 'DESCRIPTION', 'AMOUNT', 'STATUS'];

  const headerRow = sheet.getRow(startRow);
  bankHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.style = headerStyle as ExcelJS.Style;
  });

  qbHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 6);
    cell.value = h;
    cell.style = headerStyle as ExcelJS.Style;
  });

  // 3. Add Data
  const maxRows = Math.max(result.bankData.length, result.qbData.length);
  
  for (let i = 0; i < maxRows; i++) {
    const currentRow = startRow + 1 + i;
    const row = sheet.getRow(currentRow);

    // Bank Data (Col A-D)
    if (i < result.bankData.length) {
      const tx = result.bankData[i];
      row.getCell(1).value = tx.date instanceof Date ? tx.date : new Date(tx.date);
      row.getCell(2).value = tx.description;
      row.getCell(3).value = tx.amount;
      row.getCell(4).value = {
        formula: `IF(C${currentRow}="", "", IF(COUNTIFS($H$11:$H$5000, C${currentRow}) >= COUNTIFS($C$11:C${currentRow}, C${currentRow}), "MATCHED", "MISSING"))`,
        result: tx.status.toUpperCase()
      };
    }

    // QB Data (Col F-I)
    if (i < result.qbData.length) {
      const tx = result.qbData[i];
      row.getCell(6).value = tx.date instanceof Date ? tx.date : new Date(tx.date);
      row.getCell(7).value = tx.description;
      row.getCell(8).value = tx.amount;
      row.getCell(9).value = {
        formula: `IF(H${currentRow}="", "", IF(COUNTIFS($C$11:$C$5000, H${currentRow}) = 0, "EXTRA", IF(COUNTIFS($H$11:H${currentRow}, H${currentRow}) > COUNTIFS($C$11:$C$5000, H${currentRow}), "DUPLICATE", "MATCHED")))`,
        result: tx.status.toUpperCase()
      };
    }

    // Styling
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(col => {
      const cell = row.getCell(col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
      // Date alignment: Left
      if (col === 1 || col === 6) {
        cell.numFmt = 'dd-mmm-yyyy';
        cell.alignment = { horizontal: 'left' };
      }
      
      // Amount alignment: Middle (Center)
      if (col === 3 || col === 8) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'center' };
      }
      
      if (col === 4 || col === 9) cell.alignment = { horizontal: 'center' };
    });
  }

  // Column Widths & Auto-fit
  sheet.getColumn(1).width = 15; // Date
  sheet.getColumn(2).width = 50; // Description (Large)
  sheet.getColumn(3).width = 15; // Amount
  sheet.getColumn(4).width = 15; // Status
  sheet.getColumn(5).width = 5;  // Spacer
  sheet.getColumn(6).width = 15; // Date
  sheet.getColumn(7).width = 50; // Description (Large)
  sheet.getColumn(8).width = 15; // Amount
  sheet.getColumn(9).width = 15; // Status
  sheet.getColumn(10).width = 25; // Summary Label
  sheet.getColumn(11).width = 15; // Summary Value

  // Conditional Formatting
  sheet.addConditionalFormatting({
    ref: `D11:D${startRow + maxRows}`,
    rules: [
      { priority: 1, type: 'expression', formulae: ['D11="MISSING"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFD700' } } } },
      { priority: 2, type: 'expression', formulae: ['D11="MATCHED"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF2CA01C' } }, font: { color: { argb: 'FFFFFFFF' } } } }
    ]
  });

  sheet.addConditionalFormatting({
    ref: `I11:I${startRow + maxRows}`,
    rules: [
      { priority: 1, type: 'expression', formulae: ['I11="DUPLICATE"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE0B3' } } } },
      { priority: 2, type: 'expression', formulae: ['I11="EXTRA"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFB22222' } }, font: { color: { argb: 'FFFFFFFF' }, bold: true } } },
      { priority: 3, type: 'expression', formulae: ['I11="MATCHED"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF2CA01C' } }, font: { color: { argb: 'FFFFFFFF' } } } }
    ]
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
