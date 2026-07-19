import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve static assets path (checks local backend/public first for self-contained deploys)
let frontendDistPath = path.join(__dirname, '../../frontend/dist');
const localPublicPath = path.join(__dirname, './public');
const parentPublicPath = path.join(__dirname, '../public');
if (fs.existsSync(localPublicPath)) {
    frontendDistPath = localPublicPath;
}
else if (fs.existsSync(parentPublicPath)) {
    frontendDistPath = parentPublicPath;
}
const app = express();
const PORT = process.env.PORT || 5000;
// Enable reverse proxy trust (needed for Hostinger/Nginx routing and express-rate-limit)
app.set('trust proxy', 1);
// Load Swagger document
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// 1. Security Headers via Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
// 2. Cross-Origin Resource Sharing
app.use(cors({
    origin: '*', // Adjust in production to frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Serve frontend static assets
app.use(express.static(frontendDistPath));
// 3. Global API Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);
// 4. Request Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// 5. Mount API Routes
app.use('/api', apiRouter);
// Serve uploads folder (for waybill image review if hosted locally)
app.use('/uploads', express.static('uploads'));
// 6. API 404 Route handler
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});
// Wildcard fallback to serve React's index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});
// 7. Global Error Handler Middleware (Prevents crashes, standardizes responses)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
// 8. Start server listening
app.listen(PORT, () => {
    console.log(`TikTracker Pro Server active on port ${PORT} in [${process.env.NODE_ENV}] mode.`);
});
