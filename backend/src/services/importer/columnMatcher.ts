export class ColumnMatcher {
  /**
   * Defines aliases for standardizing incoming column headers.
   * Keys are the internal application identifiers.
   * Values are arrays of possible string matches found in the Excel file.
   */
  private static aliases: Record<string, string[]> = {
    // Required fields (based on business rules)
    external_transaction_id: ['settlement id', 'statement id', 'order adjustment id', 'order id', 'transaction id'],
    related_order_id: ['related order id', 'order id', 'orderno'],
    transaction_type: ['transaction type'],
    order_created_time: ['order created time', 'created time', 'order creation date'],
    order_settled_time: ['order settled time', 'settled time', 'settlement time', 'statement date', 'date', 'release date'],
    currency: ['currency'],

    // Optional fields (Financials)
    gross_sales: ['total revenue', 'gross sales', 'revenue', 'amount', 'order amount', 'total settlement amount'],
    tiktok_fees: ['total fees', 'fee', 'tiktok fee', 'commission', 'transaction fee', 'platform fee', 'tiktok shop commission fee'],
    affiliate_commission: ['affiliate', 'affiliate commission', 'creator commission'],
    shipping_subsidy: ['shipping subsidy', 'shipping fee subsidy', 'platform shipping fee discount'],
    shipping_actual: ['seller shipping fee', 'actual shipping fee', 'shipping actual', 'shipping fee'],
    discount: ['seller discounts', 'discount', 'platform voucher', 'voucher'],
    adjustments: ['adjustments', 'other adjustment'],
    refund: ['refund', 'refund amount', 'refund subtotal after seller discounts'],
    return_loss: ['actual return shipping fee', 'return loss', 'return shipping cost'],
    tax: ['tax', 'vat', 'withholding tax'],
    net_payout: ['net payout', 'settlement amount', 'statement amount']
  };

  /**
   * Matches an array of normalized headers to the internal schema.
   * 
   * @param normalizedHeaders An array of headers cleaned by HeaderNormalizer
   * @returns A map where keys are internal IDs and values are the column indices (or -1 if not found)
   */
  static match(normalizedHeaders: string[]): Record<string, number> {
    const mapping: Record<string, number> = {};

    for (const [internalKey, possibleAliases] of Object.entries(this.aliases)) {
      mapping[internalKey] = -1; // Default to not found
      
      const cleanAliases = possibleAliases.map(a => a.toLowerCase().trim());

      // 1. Try exact match first
      let foundIndex = normalizedHeaders.findIndex(header => cleanAliases.includes(header));
      
      // 2. Try partial match (includes) if exact match fails
      if (foundIndex === -1) {
        foundIndex = normalizedHeaders.findIndex(header => 
          cleanAliases.some(alias => header.includes(alias))
        );
      }

      mapping[internalKey] = foundIndex;
    }

    return mapping;
  }
}
