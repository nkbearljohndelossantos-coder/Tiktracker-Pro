import xlsx from 'xlsx';
import { HeaderNormalizer } from './headerNormalizer.js';

export interface DetectedSheet {
  sheetName: string;
  worksheet: xlsx.WorkSheet;
  headerRowIndex: number;
  normalizedHeaders: string[];
  rawData: any[][];
}

export class SheetDetector {
  /**
   * Finds the correct worksheet for settlement imports.
   * Prioritizes specific sheet names. If not found, scans all sheets.
   * 
   * @param workbook Parsed Excel workbook
   * @param validator Function that returns true if the normalized headers contain required fields
   */
  static detect(
    workbook: xlsx.WorkBook,
    validator: (headers: string[]) => boolean
  ): DetectedSheet | null {
    const priorityNames = ['order details', 'settlement details', 'transaction details'];
    const sheetNames = workbook.SheetNames;

    // Scan sheets in order: priority sheets first, then the rest
    const sortedNames = [
      ...sheetNames.filter(n => priorityNames.includes(n.toLowerCase().trim())),
      ...sheetNames.filter(n => !priorityNames.includes(n.toLowerCase().trim()))
    ];

    for (const name of sortedNames) {
      const worksheet = workbook.Sheets[name];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length === 0) continue;

      // Scan the first 20 rows to find a valid header row
      for (let r = 0; r < Math.min(rawData.length, 20); r++) {
        const row = rawData[r];
        if (row && Array.isArray(row)) {
          const normalized = HeaderNormalizer.normalize(row);
          if (validator(normalized)) {
            return {
              sheetName: name,
              worksheet,
              headerRowIndex: r,
              normalizedHeaders: normalized,
              rawData
            };
          }
        }
      }
    }

    return null;
  }
}
