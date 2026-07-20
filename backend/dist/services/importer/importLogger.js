export class ImportLogger {
    log;
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
    setWorksheetInfo(sheetName, originalHeaders, mapping) {
        this.log.detectedWorksheet = sheetName;
        this.log.detectedColumns = originalHeaders;
        const matchedIndices = new Set();
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
    addError(rowNumber, reason, originalData) {
        this.log.errors.push({
            rowNumber,
            reason,
            // Safely stringify
            originalData: typeof originalData === 'object' ? JSON.stringify(originalData) : String(originalData)
        });
        this.log.skippedRows++;
    }
    addWarning(message) {
        this.log.warnings.push(message);
    }
    incrementImported() {
        this.log.importedRows++;
    }
    incrementSkipped() {
        this.log.skippedRows++;
    }
    getLog() {
        return this.log;
    }
}
