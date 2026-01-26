import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import mealRoutes from './routes/meals';
import userRoutes from './routes/user';
import analyzeRoutes from './routes/analyze';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global logging middleware
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/telegram') {
    console.log('\n🔔 INCOMING WEBHOOK REQUEST TO /api/webhooks/telegram');
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});
