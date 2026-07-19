import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { query } from '../config/db.js';
export class OCRService {
    /**
     * Main entry point to process a waybill file (Buffer) and extract metadata.
     */
    static async processWaybill(fileBuffer, fileName, mimeType) {
        let textContent = '';
        const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        if (isPdf) {
            try {
                // Attempt fast direct text extraction from vector PDF
                const pdfData = await pdfParse(fileBuffer);
                textContent = pdfData.text;
            }
            catch (err) {
                console.warn('Direct PDF text parse failed. Falling back to PDF-to-image OCR:', err);
            }
        }
        // If PDF yielded no text or it's an image, use Tesseract OCR
        if (!textContent.trim()) {
            textContent = await this.performImageOCR(fileBuffer);
        }
        // Parse text contents using regex
        const parsed = this.parseText(textContent);
        // Perform database matching
        return await this.matchWithOrders(parsed);
    }
    /**
     * Enhanced OCR engine using sharp (image preprocessing) and tesseract.js
     */
    static async performImageOCR(imageBuffer) {
        try {
            // Preprocess image for OCR using sharp:
            // - Convert to grayscale
            // - Enhance contrast / thresholding
            // - Double size to increase readability of barcode/small text
            const processedImageBuffer = await sharp(imageBuffer)
                .resize({ width: 2000, fit: 'inside', withoutEnlargement: false })
                .grayscale()
                .normalize() // stretch contrast
                .sharpen()
                .toBuffer();
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(processedImageBuffer);
            await worker.terminate();
            return text;
        }
        catch (err) {
            console.error('OCR Error:', err);
            return '';
        }
    }
    /**
     * Run heuristics to identify Order ID, tracking numbers, and details
     */
    static parseText(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        // Heuristic 1: TikTok Order IDs are 18-19 digit numbers starting with 5 (sometimes 57)
        const orderIdRegex = /\b5\d{17,18}\b/;
        const orderIdMatch = text.match(orderIdRegex);
        const orderId = orderIdMatch ? orderIdMatch[0] : null;
        // Heuristic 2: Tracking Numbers
        // Common couriers in TikTok Shop: J&T (e.g. JX..., 78...), SPX (SPXPH...), Flash (FLA...)
        const trackingRegexes = [
            /\b(JX\d{9,11}PH)\b/i,
            /\b(SPXPH\d{10,14})\b/i,
            /\b(FLA\d{10,14})\b/i,
            /\b(78\d{10,12})\b/ // alternate J&T formats
        ];
        let trackingNumber = null;
        for (const regex of trackingRegexes) {
            const match = text.match(regex);
            if (match) {
                trackingNumber = match[0].toUpperCase();
                break;
            }
        }
        // Heuristic 3: Courier name detection
        let courier = null;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('j&t') || lowerText.includes('j and t') || lowerText.includes('jt express')) {
            courier = 'J&T Express';
        }
        else if (lowerText.includes('shopee xpress') || lowerText.includes('spx')) {
            courier = 'Shopee Xpress';
        }
        else if (lowerText.includes('flash express')) {
            courier = 'Flash Express';
        }
        else if (lowerText.includes('ninja van') || lowerText.includes('ninjavan')) {
            courier = 'Ninja Van';
        }
        // Heuristic 4: Contact details (Phone Numbers)
        const phoneRegex = /(\+?63\s?9\d{9})|(\b09\d{9}\b)/;
        const phoneMatch = text.match(phoneRegex);
        const phoneNumber = phoneMatch ? phoneMatch[0] : null;
        // Heuristic 5: Customer Name and Shipping Address detection
        // Usually waybills place Receiver/To label before the name
        let customerName = null;
        let shippingAddress = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if ((line.startsWith('to:') || line.startsWith('consignee:') || line.startsWith('receiver:') || line.startsWith('deliver to:')) && i + 1 < lines.length) {
                customerName = lines[i + 1];
                // The subsequent lines usually make up the address until a separator or barcode label
                const addressLines = [];
                for (let j = i + 2; j < Math.min(i + 7, lines.length); j++) {
                    if (lines[j].toLowerCase().includes('phone') || lines[j].toLowerCase().includes('order id') || lines[j].toLowerCase().includes('tracking')) {
                        break;
                    }
                    addressLines.push(lines[j]);
                }
                shippingAddress = addressLines.join(', ');
                break;
            }
        }
        // Clean up customer name if it includes prefixes
        if (customerName) {
            customerName = customerName.replace(/^(to:|consignee:|receiver:)\s*/i, '').trim();
        }
        // Barcode/QR is often equivalent to tracking number or order ID in waybills
        const barcodeData = trackingNumber || orderId || null;
        const qrData = orderId || trackingNumber || null;
        return {
            orderId,
            trackingNumber,
            customerName,
            phoneNumber,
            shippingAddress,
            courier,
            barcodeData,
            qrData,
            ocrText: text
        };
    }
    /**
     * Matches parsed waybill metrics against the Orders table to retrieve items, SKU and variations
     */
    static async matchWithOrders(parsed) {
        let orderId = parsed.orderId;
        let trackingNumber = parsed.trackingNumber;
        let isMatched = false;
        let matchedMethod = null;
        let productDetails = '';
        // Search by Order ID first
        if (orderId) {
            const rows = await query('SELECT order_id, tracking_number FROM orders WHERE order_id = ?', [orderId]);
            if (rows.length > 0) {
                isMatched = true;
                matchedMethod = 'ORDER_ID';
                if (!trackingNumber)
                    trackingNumber = rows[0].tracking_number;
            }
        }
        // Search by Tracking Number if not matched
        if (!isMatched && trackingNumber) {
            const rows = await query('SELECT order_id, tracking_number FROM orders WHERE tracking_number = ?', [trackingNumber]);
            if (rows.length > 0) {
                isMatched = true;
                matchedMethod = 'TRACKING_NUMBER';
                if (!orderId)
                    orderId = rows[0].order_id;
            }
        }
        // Retrieve order items if matched
        if (isMatched && orderId) {
            const items = await query('SELECT sku, product_name, variation, quantity FROM order_items WHERE order_id = ?', [orderId]);
            if (items.length > 0) {
                productDetails = items.map(item => `${item.product_name} (${item.sku || 'No SKU'}) - Variation: ${item.variation || 'None'} x${item.quantity}`).join('\n');
            }
        }
        return {
            ...parsed,
            orderId,
            trackingNumber,
            isMatched,
            matchedMethod,
            productDetails: productDetails || undefined
        };
    }
}
export default OCRService;
