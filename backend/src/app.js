const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const apiConfig = require('./config/api.config');
const { APP_VERSION } = require('./constants/api-version');
const requestIdMiddleware = require('./middleware/request-id.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const notFoundMiddleware = require('./middleware/not-found.middleware');
const ResponseHelper = require('./helpers/response.helper');
const prisma = require('./config/database');

const app = express();

app.use((req, res, next) => {
  res.setHeader('X-API-Version', APP_VERSION);
  next();
});

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestIdMiddleware);
app.use(loggerMiddleware);

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  return ResponseHelper.success(res, {
    status: 'ok',
    version: APP_VERSION,
    database: dbStatus,
    server_time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  }, null, 'Application is running');
});

app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ResponseHelper.success(res, {
      status: 'ready',
      version: APP_VERSION,
    }, null, 'Application is ready to receive traffic');
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Service Unavailable - Database disconnected',
      request_id: res.locals.requestId
    });
  }
});

const apiRouter = express.Router();
const authRoutes = require('./routes/auth.routes');
const meRoutes = require('./routes/me.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const warungRoutes = require('./routes/warung.routes');
const uploadRoutes = require('./routes/upload.routes');
const visitRoutes = require('./routes/visit.routes');
const loadRoutes = require('./routes/load.routes');
const salesRoutes = require('./routes/sales.routes');
const salesTransactionRoutes = require('./routes/sales-transaction.routes');
const paymentRoutes = require('./routes/payment.routes');
const collectionRoutes = require('./routes/collection.routes');
const salesReturnRoutes = require('./routes/sales-return.routes');
const creditNoteRoutes = require('./routes/credit-note.routes');
const warehouseSettlementRoutes = require('./routes/warehouse-settlement.routes');
const reportRoutes = require('./modules/reporting/routes/reporting.routes');
const dashboardRoutes = require('./modules/dashboard/routes/dashboard.routes');
const categoryRoutes = require('./modules/master/category/routes/category.routes');
const regionalRoutes = require('./modules/master/regional/routes/regional.routes');
const areaRoutes = require('./modules/master/area/routes/area.routes');
const routeRoutes = require('./modules/master/route/routes/route.routes');
const customerMasterRoutes = require('./modules/master/customer/routes/customer.routes');

apiRouter.use('/auth', authRoutes);
apiRouter.use('/me', meRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/warungs', warungRoutes); // Legacy Warung Routes
apiRouter.use('/master/categories', categoryRoutes);
apiRouter.use('/master/regionals', regionalRoutes);
apiRouter.use('/master/areas', areaRoutes);
apiRouter.use('/master/routes', routeRoutes);
apiRouter.use('/master/customers', customerMasterRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/visits', visitRoutes);
apiRouter.use('/loads', loadRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/sales-transactions', salesTransactionRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/collections', collectionRoutes);
apiRouter.use('/returns', salesReturnRoutes);
apiRouter.use('/credit-notes', creditNoteRoutes);
apiRouter.use('/settlements', warehouseSettlementRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

app.use(apiConfig.PREFIX, apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// --- Bootstrap Domain Event Infrastructure ---
const InternalMessageBus = require('./infrastructure/events/InternalMessageBus');
const NodeEventEmitterAdapter = require('./infrastructure/events/NodeEventEmitterAdapter');
const EventDispatcher = require('./infrastructure/events/EventDispatcher');
const AuditSubscriber = require('./infrastructure/events/subscribers/AuditSubscriber');
const OutboxRelayWorker = require('./workers/outbox.relay.worker');
const SalesSummaryProjector = require('./read-model/projectors/SalesSummaryProjector');
const CustomerLedgerProjector = require('./read-model/projectors/CustomerLedgerProjector');
const ProductSalesProjector = require('./read-model/projectors/ProductSalesProjector');
const SalesPerformanceProjector = require('./read-model/projectors/SalesPerformanceProjector');

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

// Export the eventBus so that other parts of the application can publish events (mostly workers now)
app.set('eventBus', eventBus);

// Start the Outbox Relay Worker
const outboxWorker = new OutboxRelayWorker(eventBus);
outboxWorker.start();

module.exports = app;
