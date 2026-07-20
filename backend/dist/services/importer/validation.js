export class Validation {
    /**
     * Checks if all required business fields are present in the mapping.
     *
     * @param mapping The output of ColumnMatcher.match
     * @returns An array of missing required field names. Empty array if valid.
     */
    static validateRequiredFields(mapping) {
        const required = [
            'external_transaction_id',
            'transaction_type',
            'order_created_time',
            'order_settled_time',
            'currency'
        ];
        const missing = [];
        for (const req of required) {
            if (mapping[req] === undefined || mapping[req] === -1) {
                missing.push(req);
            }
        }
        return missing;
    }
}
