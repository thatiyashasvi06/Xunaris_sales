import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db from './db/database.js';
import { seedDatabase, applyEnvPasswords } from './db/seed.js';
import { startBackgroundWorker } from './services/backgroundWorker.js';

import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import companiesRoutes from './routes/companiesRoutes.js';
import leadsRoutes from './routes/leadsRoutes.js';
import opportunitiesRoutes from './routes/opportunitiesRoutes.js';
import activitiesRoutes from './routes/activitiesRoutes.js';
import campaignsRoutes from './routes/campaignsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import recruitmentRoutes from './routes/recruitmentRoutes.js';
import salesAgentRoutes, { publicBookingRouter } from './routes/salesAgentRoutes.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { runCycle } from './services/salesAgent.js';

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const distPath = path.join(__dirname, '../dist');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend assets if build exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Swagger UI Interactive API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/swagger', (req, res) => res.redirect('/api-docs'));

// Status Page HTML Generator
const renderStatusPage = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Xunaris CRM API Server</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a1120; color: #f8fafc; padding: 40px; margin: 0; line-height: 1.6; }
        .card { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; }
        h1 { margin-top: 12px; font-size: 24px; color: #ffffff; }
        p { color: #94a3b8; font-size: 14px; }
        ul { list-style: none; padding: 0; margin: 20px 0; }
        li { padding: 10px 14px; margin-bottom: 8px; background: #1e293b; border-radius: 8px; font-family: monospace; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
        li.highlight { background: rgba(0, 99, 242, 0.15); border: 1px solid rgba(0, 99, 242, 0.4); }
        a { color: #38bdf8; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .btn { display: block; text-align: center; background: #0063f2; color: white; padding: 12px 20px; border-radius: 10px; font-weight: bold; text-decoration: none; margin-top: 24px; transition: 0.2s; }
        .btn:hover { background: #0050c7; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● REST API Active & Online</span>
        <h1>Xunaris + HYRA Connect Mini CRM API</h1>
        <p>The backend REST API server is running on port 5000 with SQLite database persistence.</p>
        
        <p><strong>Interactive Documentation & Endpoints:</strong></p>
        <ul>
          <li class="highlight"><a href="/api-docs">📖 /api-docs (Swagger UI)</a> <span style="font-size: 11px; color: #38bdf8;">Interactive Docs</span></li>
          <li><a href="/api/health">/api/health</a> <span style="font-size: 11px; color: #94a3b8;">Health check</span></li>
          <li><a href="/api/leads">/api/leads</a> <span style="font-size: 11px; color: #94a3b8;">Leads directory</span></li>
          <li><a href="/api/opportunities">/api/opportunities</a> <span style="font-size: 11px; color: #94a3b8;">Pipeline deals</span></li>
          <li><a href="/api/dashboard">/api/dashboard</a> <span style="font-size: 11px; color: #94a3b8;">KPI funnel</span></li>
        </ul>

        <a class="btn" href="/api-docs">Open Interactive Swagger UI &rarr;</a>
        <a class="btn" style="background: #1e293b; margin-top: 10px;" href="/">Open CRM Frontend App</a>
      </div>
    </body>
    </html>
`;

// Dedicated API Status Route
app.get('/api-status', (req, res) => {
  res.send(renderStatusPage());
});

// Root Route: Serve Frontend index.html if available, otherwise API Status Page
app.get('/', (req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.send(renderStatusPage());
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    app: 'Xunaris + HYRA Connect Mini CRM API',
    timestamp: new Date().toISOString()
  });
});

// API Routes (everything except /auth, /catalog reads, /public booking and /health requires a signed-in user)
if (!process.env.JWT_SECRET) {
  console.error('[SECURITY] JWT_SECRET is not set. Set a long random value in the environment now: tokens are signed with a public default.');
}
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/companies', authMiddleware, companiesRoutes);
app.use('/api/leads', authMiddleware, leadsRoutes);
app.use('/api/opportunities', authMiddleware, opportunitiesRoutes);
app.use('/api/activities', authMiddleware, activitiesRoutes);
app.use('/api/campaigns', authMiddleware, campaignsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/recruitment', authMiddleware, recruitmentRoutes);
app.use('/api/sales-agent', salesAgentRoutes);
app.use('/api/public', publicBookingRouter);

// Client-Side Routing Fallback (serves React frontend for all non-API paths, compatible with Express v5)
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/api') || req.path.startsWith('/api-docs') || req.path.startsWith('/swagger')) {
    return next();
  }
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Seed Initial Data
seedDatabase();
applyEnvPasswords();

// Start Background Worker
startBackgroundWorker(15000);

// Sales Agent runs every 5 minutes (it only acts when switched on in the Sales Agent screen)
setInterval(() => runCycle().catch((e) => console.error('[SalesAgent] cycle error:', e.message)), 5 * 60 * 1000);

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Xunaris + HYRA Connect CRM API Server`);
  console.log(` Listening on: http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Database: SQLite WAL mode with foreign keys`);
  console.log(`====================================================`);
});
