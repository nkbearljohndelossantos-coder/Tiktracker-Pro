export class HeaderNormalizer {
    /**
     * Normalizes an array of raw header strings based on business rules.
     * - Trims spaces, converts to lowercase
     * - Replaces "/", "-", "_" with spaces
     * - Collapses multiple spaces
     * - Removes hidden characters and non-breaking spaces
     * - Generates generic names for empty columns (e.g., unnamed_column_1)
     */
    static normalize(rawHeaders) {
        let unnamedCounter = 1;
        return Array.from(rawHeaders).map(header => {
            if (header === undefined || header === null || header === '') {
                return `unnamed_column_${unnamedCounter++}`;
            }
            let str = String(header);
            // Remove hidden characters and non-breaking spaces (\u00A0)
            str = str.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ');
            // Convert to lowercase
            str = str.toLowerCase();
            // Replace / - _ with spaces
            str = str.replace(/[\/\-_]/g, ' ');
            // Collapse multiple spaces and trim
            str = str.replace(/\s+/g, ' ').trim();
            if (!str) {
                return `unnamed_column_${unnamedCounter++}`;
            }
            return str;
        });
    }
}
