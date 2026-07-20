export interface ImportError {
  rowNumber: number;
  reason: string;
  originalData: string;
}

export interface ImportLog {
  detectedWorksheet: string;
  detectedColumns: string[];
  matchedAliases: Record<string, string>;
  skippedColumns: string[];
  importedRows: number;
  skippedRows: number;
  warnings: string[];
  errors: ImportError[];
}

export class ImportLogger {
  private log: ImportLog;

  constructor() {
    this.log = {
      detectedWorksheet: '',
      detectedColumns: [],
      matchedAliases: {},
      skippedColumns: [],
      importedRows: 0,
      skippedRows: 0,
      warnings: [],
      errors: []
    };
  }

  setWorksheetInfo(sheetName: string, originalHeaders: string[], mapping: Record<string, number>) {
    this.log.detectedWorksheet = sheetName;
    this.log.detectedColumns = originalHeaders;

    const matchedIndices = new Set<number>();

    for (const [key, index] of Object.entries(mapping)) {
      if (index !== -1) {
        this.log.matchedAliases[key] = originalHeaders[index];
        matchedIndices.add(index);
      }
    }

    for (let i = 0; i < originalHeaders.length; i++) {
      if (!matchedIndices.has(i)) {
        this.log.skippedColumns.push(originalHeaders[i] || `[Empty Header ${i}]`);
      }
    }
  }

  addError(rowNumber: number, reason: string, originalData: any) {
    this.log.errors.push({
      rowNumber,
      reason,
      // Safely stringify
      originalData: typeof originalData === 'object' ? JSON.stringify(originalData) : String(originalData)
    });
    this.log.skippedRows++;
  }

  addWarning(message: string) {
    this.log.warnings.push(message);
  }

  incrementImported() {
    this.log.importedRows++;
  }
  
  incrementSkipped() {
    this.log.skippedRows++;
  }

  getLog(): ImportLog {
    return this.log;
  }
}
