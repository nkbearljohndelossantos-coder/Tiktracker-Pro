import { Router } from 'express';
import multer from 'multer';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import { login, register, refresh, logout } from '../controllers/authController.js';
import { getProducts, getProductBySku, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { getOrders, getOrderDetails } from '../controllers/orderController.js';
import { importExcelReport, getSettlements, recalculateSettlements } from '../controllers/settlementController.js';
import { uploadWaybills, getWaybills, getReviewQueue, resolveReviewItem } from '../controllers/waybillController.js';
import { scanReturn, saveReturn, getReturns } from '../controllers/returnController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { getReportData, exportReport } from '../controllers/reportController.js';
import { getAuditLogs } from '../controllers/auditController.js';
import { getSettings, updateSettings, backupDatabase } from '../controllers/settingsController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- AUTHENTICATION ---
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', logout);

// --- PUBLIC INSTRUCTIONS DOWNLOAD ---
router.get('/public/instructions', (req, res) => {
  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>TikTracker Pro - User Manual</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 40px; }
        h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px; font-size: 24pt; }
        h2 { color: #0d9488; margin-top: 24pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-size: 16pt; }
        h3 { color: #334155; margin-top: 14pt; font-size: 12pt; }
        p, li { font-size: 11pt; }
        .highlight { background-color: #f1f5f9; padding: 10px; border-left: 4px solid #0f766e; margin: 15px 0; font-style: italic; }
        table { border-collapse: collapse; width: 100%; margin-top: 15px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10pt; }
        th { background-color: #f8fafc; color: #0f766e; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>TIKTRACKER PRO - USER MANUAL & OPERATING GUIDE</h1>
      <p style="color: #ef4444; font-weight: bold; font-size: 11pt;">⚠️ CONFIDENTIAL & PROPRIETARY: Eksklusibong Dokumentasyon para lamang sa NKB Manufacturing Corp. Ipinagbabawal ang pagbabahagi sa labas ng kumpanya.</p>

      <h2>1. OPERATIONAL OVERVIEW (NKB MANUFACTURING CORP.)</h2>
      <p>Ang <strong>TikTracker Pro</strong> ay isang pinasadyang enterprise tool na binuo eksklusibo para sa operasyon ng <strong>NKB Manufacturing Corp.</strong> upang mapadali at i-automate ang:</p>
      <ul>
        <li>Pagkalkula ng tunay na kita (Net Profit at Margin) kada order at kada produkto ng kumpanya.</li>
        <li>Pag-import at pag-reconcile ng opisyal na TikTok Shop Settlement at Order Excel reports ng NKB.</li>
        <li>Pag-track ng packaging labels ng NKB products gamit ang advanced OCR image recognition.</li>
        <li>Pag-scan at pag-verify ng returned o RTS (Return-to-Seller) parcels upang maibalik sa stock at mabawas ang operational losses ng kumpanya.</li>
      </ul>

      <h2>2. MGA DETALYADONG HAKBANG (STEP-BY-STEP INSTRUCTIONS)</h2>
      
      <h3>Step 1: Mag-log in sa Web Application</h3>
      <ul>
        <li>Buksan ang browser at pumunta sa <code>http://localhost:3000/</code>.</li>
        <li>Gamitin ang quick fill buttons sa ilalim ng form para pumili ng role:
          <ul>
            <li><strong>Super Admin</strong>: Username <code>admin</code>, Password <code>admin123</code> (May access sa lahat ng features pati Audit Logs).</li>
            <li><strong>Manager</strong>: Username <code>manager</code>, Password <code>manager123</code>.</li>
            <li><strong>Staff</strong>: Username <code>staff</code>, Password <code>staff123</code>.</li>
            <li><strong>Viewer</strong>: Username <code>viewer</code>, Password <code>viewer123</code> (Read-only access).</li>
          </ul>
        </li>
        <li>I-click ang <strong>Sign In</strong>.</li>
      </ul>

      <h3>Step 2: I-encode ang Presyo at Packaging Costs ng mga Produkto</h3>
      <p>Kailangang ilagay ang puhunan upang makalkula ang Net Profit.</p>
      <ul>
        <li>Pumunta sa <strong>Product Costs</strong> tab sa sidebar menu.</li>
        <li>I-click ang <strong>Edit (pencil icon)</strong> sa tabi ng SKU na nais mong i-encode.</li>
        <li>Ilagay ang presyo ng <strong>Purchase Cost</strong> (Puhunan sa pagbili ng item mula sa supplier).</li>
        <li>Ilagay ang <strong>Ops & Packaging Costs</strong>:
          <ul>
            <li>Box o pouch, bubble wrap, packaging tape, thermal printing label, at labor fee ng packing staff.</li>
          </ul>
        </li>
        <li>I-click ang <strong>Save Changes</strong>.</li>
      </ul>

      <h3>Step 3: I-upload ang Reports mula sa TikTok Seller Center</h3>
      <ul>
        <li>Pumunta sa iyong <strong>TikTok Shop Seller Center</strong>.</li>
        <li>I-download ang mga sumusunod na reports bilang Excel/CSV:
          <ul>
            <li><strong>Order Report</strong> (Listahan ng orders ng customers).</li>
            <li><strong>Settlement Report</strong> (Talaan ng natanggap na bayad at fees).</li>
          </ul>
        </li>
        <li>Sa TikTracker Pro, pumunta sa <strong>Settlements</strong> page.</li>
        <li>Sa drop-down selector ng <strong>Import Center</strong>, piliin kung anong klase ng report ang iyong i-u-upload.</li>
        <li>I-drag at drop ang Excel file at i-click ang <strong>Process Import</strong>.</li>
      </ul>

      <h3>Step 4: Gamitin ang Waybill & OCR Parser</h3>
      <p>Upang masiguro na ang bawat parcel na binalot ay maayos na nakatala sa database.</p>
      <ul>
        <li>Pumunta sa <strong>Waybill & OCR</strong> tab.</li>
        <li>I-upload ang litrato o PDF ng waybill barcode label.</li>
        <li>Awtomatikong babasahin ng system ang text gamit ang OCR upang hanapin ang <strong>Order ID</strong>.</li>
        <li>Kung walang katugmang order na nakita sa database, mapupunta ang record sa <strong>Waybill Manual Review Queue</strong> sa ibaba kung saan pwede mo itong i-bind manual sa tamang Order ID.</li>
      </ul>

      <h3>Step 5: I-scan ang RTS / Returns</h3>
      <p>Kapag ibinalik ng courier ang hindi tinanggap na parcel.</p>
      <ul>
        <li>Pumunta sa <strong>Returns Module</strong> tab.</li>
        <li>Gamitin ang virtual barcode scanner simulator sa kanan o i-type ang Tracking Number ng returned item.</li>
        <li>I-click ang <strong>Scan Barcode</strong>.</li>
        <li><strong>Awtomatikong gagawin ng system:</strong>
          <ul>
            <li>Babaguhin ang status ng order sa <strong>Returned</strong>.</li>
            <li>Ibabalik sa active inventory stock ang item.</li>
            <li>Ibabawas ang nagastos sa return shipping sa net profit.</li>
          </ul>
        </li>
      </ul>

      <h3>Step 6: Mag-download ng Financial Reports</h3>
      <ul>
        <li>Pumunta sa <strong>Financial Reports</strong> tab.</li>
        <li>Piliin ang date filter at i-click ang <strong>Export to Excel</strong> o <strong>Export to CSV</strong> para makuha ang breakdown para sa iyong accounting o libro.</li>
      </ul>

      <div class="highlight">
        <strong>TANDAAN:</strong> Ang system ay kasalukuyang tumatakbo sa Sandboxed In-Memory Fallback mode dahil offline ang MySQL. Lahat ng edits at uploads ay pansamantalang mai-i-store sa memorya ng server.
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'application/msword');
  res.setHeader('Content-Disposition', 'attachment; filename=TikTracker_Pro_User_Manual.doc');
  res.send(docHtml);
});

// --- PROTECTED ROUTES ---
router.use(authenticateJWT);

// --- DASHBOARD ---
router.get('/dashboard/stats', getDashboardStats);

// --- PRODUCTS & COST MODULE ---
router.get('/products', getProducts);
router.get('/products/:sku', getProductBySku);
router.post('/products', authorizeRole(['SUPER_ADMIN', 'MANAGER']), createProduct);
router.put('/products/:sku', authorizeRole(['SUPER_ADMIN', 'MANAGER']), updateProduct);
router.delete('/products/:sku', authorizeRole(['SUPER_ADMIN']), deleteProduct);

// --- ORDERS ---
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderDetails);

// --- SETTLEMENTS & FINANCIALS ---
router.get('/settlements', getSettlements);
router.post('/settlements/import', authorizeRole(['SUPER_ADMIN', 'MANAGER', 'STAFF']), upload.single('file'), importExcelReport);
router.post('/settlements/recalculate', authorizeRole(['SUPER_ADMIN', 'MANAGER']), recalculateSettlements);

// --- WAYBILLS & OCR ---
router.get('/waybills', getWaybills);
router.post('/waybills/upload', authorizeRole(['SUPER_ADMIN', 'MANAGER', 'STAFF']), upload.array('files', 15), uploadWaybills);
router.get('/waybills/review', getReviewQueue);
router.post('/waybills/resolve/:queueId', authorizeRole(['SUPER_ADMIN', 'MANAGER', 'STAFF']), resolveReviewItem);

// --- RETURNS ---
router.get('/returns', getReturns);
router.post('/returns/scan', authorizeRole(['SUPER_ADMIN', 'MANAGER', 'STAFF']), scanReturn);
router.post('/returns/save', authorizeRole(['SUPER_ADMIN', 'MANAGER', 'STAFF']), saveReturn);

// --- REPORTS ---
router.get('/reports/data', getReportData);
router.get('/reports/export', exportReport);

// --- AUDIT LOGS ---
router.get('/audit/logs', authorizeRole(['SUPER_ADMIN']), getAuditLogs);

// --- SYSTEM SETTINGS & BACKUPS ---
router.get('/settings', getSettings);
router.put('/settings', authorizeRole(['SUPER_ADMIN', 'MANAGER']), updateSettings);
router.get('/settings/backup', authorizeRole(['SUPER_ADMIN']), backupDatabase);

export default router;
