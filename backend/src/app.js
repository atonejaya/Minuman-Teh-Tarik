const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { readFileSync } = require('fs');
const path = require('path');

const env = require('./config/env');
const apiConfig = require('./config/api.config');
const { APP_VERSION } = require('./constants/api-version');
const requestIdMiddleware = require('./middleware/request-id.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const notFoundMiddleware = require('./middleware/not-found.middleware');
const prisma = require('./config/database');
const { apiRateLimiter } = require('./middleware/rate-limiter.middleware');

// Read package.json once at startup for /version
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const app = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Required when behind Cloudflare, Nginx, or any reverse proxy.
// Without this, express-rate-limit reads the proxy IP instead of the real client IP.
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS_ORIGIN is validated in env.js:
//   - production: required (fail-fast if missing)
//   - development/test: defaults to http://localhost:3000
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-API-Version', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
}));

// ─── Compression ──────────────────────────────────────────────────────────────
// Skip binary content types — compressing already-compressed data wastes CPU
app.use(compression({
  filter: (req, res) => {
    const contentType = res.getHeader('Content-Type') || '';
    if (
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType === 'application/zip' ||
      contentType === 'application/octet-stream'
    ) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// 10MB limit accommodates Excel/image uploads while protecting against payload attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── Request ID + Logging ─────────────────────────────────────────────────────
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

// ─── API Version Header ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-API-Version', APP_VERSION);
  next();
});

// ─── Liveness Probe ───────────────────────────────────────────────────────────
// GET /health — pure liveness check (no DB query).
// Kubernetes: if this fails, restart the pod.
// Fast: should never block on I/O.
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    version: pkg.version,
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Readiness Probe ──────────────────────────────────────────────────────────
// GET /ready — readiness check (DB + dependencies).
// Kubernetes: if this fails, stop routing traffic to this pod.
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unavailable',
      reason: 'database',
      requestId: res.locals.requestId,
    });
  }
});

// ─── Version Endpoint ─────────────────────────────────────────────────────────
// GET /version — build metadata for debugging deployments
app.get('/version', (req, res) => {
  return res.status(200).json({
    version: pkg.version,
    commit: env.BUILD_COMMIT || 'unknown',
    buildDate: env.BUILD_DATE || new Date().toISOString(),
    node: process.version,
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const apiRouter = express.Router();

// Apply global rate limiter to all API routes
apiRouter.use(apiRateLimiter);

const authRoutes = require('./routes/auth.routes');
const meRoutes = require('./routes/me.routes');
const userRoutes = require('./routes/user.routes');
const warungRoutes = require('./routes/warung.routes');
const uploadRoutes = require('./routes/upload.routes');
const visitRoutes = require('./routes/visit.routes');
const loadRoutes = require('./routes/load.routes');
const salesRoutes = require('./routes/sales.routes');
const piutangRoutes = require('./modules/sales/routes/piutang.routes');
const salesTransactionRoutes = require('./routes/sales-transaction.routes');
const paymentRoutes = require('./routes/payment.routes');
const collectionRoutes = require('./routes/collection.routes');
const salesReturnRoutes = require('./modules/sales/routes/sales-return.routes');
const salesStockIssueRoutes = require('./modules/sales/routes/sales-stock-issue.routes');
const salesStockRoutes = require('./modules/sales/routes/sales-stock.routes');
const outletInventoryRoutes = require('./modules/outlet-inventory/presentation/routes/outlet-inventory.routes');
const salesVisitRoutes = require('./modules/sales-visit/presentation/routes/sales-visit.routes');
const creditNoteRoutes = require('./routes/credit-note.routes');
const warehouseSettlementRoutes = require('./routes/warehouse-settlement.routes');
const warehouseTransferRoutes = require('./modules/warehouse/presentation/routes/warehouse-transfer.routes');
const reportRoutes = require('./modules/reporting/routes/reporting.routes');
const dashboardRoutes = require('./modules/dashboard/routes/dashboard.routes');

// Master Data Routes
const categoryRoutes = require('./modules/master/category/routes/category.routes');
const regionalRoutes = require('./modules/master/regional/routes/regional.routes');
const areaRoutes = require('./modules/master/area/routes/area.routes');
const routeRoutes = require('./modules/master/route/routes/route.routes');
const customerMasterRoutes = require('./modules/master/customer/routes/customer.routes');

// Sprint 10.8A - Master Product Routes
const productMasterRoutes = require('./modules/master/product/routes/product.routes');
const productPriceRoutes = require('./modules/master/product/routes/product-price.routes');
const brandRoutes = require('./modules/master/brand/routes/brand.routes');
const packagingRoutes = require('./modules/master/packaging/routes/packaging.routes');
const unitRoutes = require('./modules/master/unit/routes/unit.routes');
const productCategoryRoutes = require('./modules/master/product-category/routes/product-category.routes');
const masterLookupRoutes = require('./modules/master/lookup/routes/master-lookup.routes');

apiRouter.use('/auth', authRoutes);
apiRouter.use('/me', meRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/master/products', productMasterRoutes); // Replaces legacy /products
apiRouter.use('/master/products', productPriceRoutes);
apiRouter.use('/master/brands', brandRoutes);
apiRouter.use('/master/packagings', packagingRoutes);
apiRouter.use('/master/units', unitRoutes);
apiRouter.use('/master/product-categories', productCategoryRoutes);
apiRouter.use('/master/lookups', masterLookupRoutes);

apiRouter.use('/warungs', warungRoutes); // Legacy Warung Routes
apiRouter.use('/master/categories', categoryRoutes); // Customer Category
apiRouter.use('/master/regionals', regionalRoutes);
apiRouter.use('/master/areas', areaRoutes);
apiRouter.use('/master/routes', routeRoutes);
apiRouter.use('/master/customers', customerMasterRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/visits', visitRoutes);
apiRouter.use('/loads', loadRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/sales/piutang', piutangRoutes);
apiRouter.use('/sales-transactions', salesTransactionRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/collections', collectionRoutes);
apiRouter.use('/sales/returns', salesReturnRoutes);
apiRouter.use('/sales/stock-issues', salesStockIssueRoutes);
apiRouter.use('/sales/stock', salesStockRoutes);
apiRouter.use('/sales/outlet-stock', outletInventoryRoutes);
apiRouter.use('/sales-visits', salesVisitRoutes);
apiRouter.use('/credit-notes', creditNoteRoutes);
apiRouter.use('/settlements', warehouseSettlementRoutes);
apiRouter.use('/warehouse/transfers', warehouseTransferRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

app.use(apiConfig.PREFIX, apiRouter);

// ─── 404 + Global Error Handler ───────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ─── Domain Event Infrastructure ─────────────────────────────────────────────
const InternalMessageBus = require('./infrastructure/events/InternalMessageBus');
const NodeEventEmitterAdapter = require('./infrastructure/events/NodeEventEmitterAdapter');
const EventDispatcher = require('./infrastructure/events/EventDispatcher');
const AuditSubscriber = require('./infrastructure/events/subscribers/AuditSubscriber');
const OutboxRelayWorker = require('./workers/outbox.relay.worker');
const SalesSummaryProjector = require('./read-model/projectors/SalesSummaryProjector');
const CustomerLedgerProjector = require('./read-model/projectors/CustomerLedgerProjector');
const ProductSalesProjector = require('./read-model/projectors/ProductSalesProjector');
const SalesPerformanceProjector = require('./read-model/projectors/SalesPerformanceProjector');
const SalesStockProjector = require('./read-model/projectors/SalesStockProjector');
const OutletInventoryProjector = require('./modules/outlet-inventory/infrastructure/projectors/OutletInventoryProjector');

const eventAdapter = new NodeEventEmitterAdapter();
const eventDispatcher = new EventDispatcher();
const eventBus = new InternalMessageBus(eventAdapter, eventDispatcher);

// Register placeholder subscriber
eventBus.register(new AuditSubscriber());

// Register CQRS Projectors
eventBus.register(new SalesSummaryProjector());
eventBus.register(new CustomerLedgerProjector());
eventBus.register(new ProductSalesProjector());
eventBus.register(new SalesPerformanceProjector());
eventBus.register(new SalesStockProjector());
eventBus.register(new OutletInventoryProjector());

// Export the eventBus so that other parts of the application can publish events (mostly workers now)
app.set('eventBus', eventBus);

// Start the Outbox Relay Worker
const outboxWorker = new OutboxRelayWorker(eventBus);
outboxWorker.start();

module.exports = app;
