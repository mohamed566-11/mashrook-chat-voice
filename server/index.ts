import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import dns from 'dns';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import Conversation from './models/Conversation.js';
import User from './models/User.js';
import { initRAG, answerQueryWithRAG, answerQueryWithRAGStream } from './rag/index.js';

// Fix DNS resolution issues with Node.js 17+ on Windows
dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'mashrouak_secret_key_2024';

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const GEMINI_API_KEY = process.env.CHATBOT_API_KEY || process.env.GEMINI_API_KEY || '';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mashrouak-chat';

// MongoDB connection
let isMongoConnected = false;
const clientOptions = {
  serverApi: { version: '1' as const, strict: true, deprecationErrors: true },
  family: 4
};

mongoose
  .connect(MONGODB_URI, clientOptions)
  .then(async () => {
    isMongoConnected = true;
    console.log('✅ MongoDB connected');
    // Drop stale unique index on conversationId alone (now compound with userId)
    try {
      const indexes = await mongoose.connection.db!.collection('conversations').indexes();
      const staleIndex = indexes.find((idx: any) => idx.name === 'conversationId_1' && idx.unique === true);
      if (staleIndex) {
        await mongoose.connection.db!.collection('conversations').dropIndex('conversationId_1');
        console.log('🔄 Dropped stale unique conversationId index');
      }
    } catch { }
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB fallback to Memory:', err.message);
  });

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ─── Middleware ──────────────────────────────────────────────────────────────

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح بالدخول' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
  }
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) return res.status(400).json({ error: 'الرجاء إكمال كافة البيانات' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

    const user = new User({ fullname, email, passwordHash: password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, fullname: user.fullname, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, fullname: user.fullname, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req: any, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ id: user._id, fullname: user.fullname, email: user.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Logic ────────────────────────────────────────────────────────────────
// System instructions are now managed by the RAG generator pipeline!
// ─── Chat Routes ─────────────────────────────────────────────────────────────

app.post('/api/chat', authenticate, async (req: any, res) => {
  try {
    const { message, conversationId = 'default', mode = 'chat', stream = false } = req.body;
    const userId = req.userId;

    if (!message) return res.status(400).json({ error: 'الرسالة مطلوبة' });

    // Load history for THIS user
    const conv = await Conversation.findOne({ conversationId, userId });
    const history = (conv?.messages || []).slice(-25).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // Add current message
    history.push({ role: 'user', parts: [{ text: message }] });

    const typedMode = mode as 'chat' | 'voice';

    if (stream) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let botMsg = '';
      for await (const piece of answerQueryWithRAGStream(message, history, typedMode)) {
        botMsg += piece;
        res.write(piece);
      }

      await Conversation.findOneAndUpdate(
        { conversationId, userId },
        {
          $push: {
            messages: [
              { role: 'user', text: message, createdAt: new Date() },
              { role: 'model', text: botMsg, createdAt: new Date() }
            ]
          },
          $setOnInsert: { conversationId, userId }
        },
        { upsert: true }
      );

      res.end();
      return;
    }

    // Ensure user passes an array structure format if needed. RAG answer generator accepts simple history.
    const botMsg = await answerQueryWithRAG(message, history, typedMode);

    // Save history with userId
    await Conversation.findOneAndUpdate(
      { conversationId, userId },
      {
        $push: {
          messages: [
            { role: 'user', text: message, createdAt: new Date() },
            { role: 'model', text: botMsg, createdAt: new Date() }
          ]
        },
        $setOnInsert: { conversationId, userId }
      },
      { upsert: true }
    );

    res.json({ message: botMsg, conversationId });
  } catch (err: any) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'خطأ في معالجة الطلب' });
      return;
    }
    res.end();
  }
});

app.get('/api/chat/history', authenticate, async (req: any, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    const result = conversations.map((c: any) => {
      const firstUserMsg = c.messages?.find((m: any) => m.role === 'user');
      return {
        conversationId: c.conversationId,
        title: firstUserMsg?.text?.slice(0, 60) || 'محادثة جديدة',
        messageCount: c.messages?.length || 0,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      };
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/:id/messages', authenticate, async (req: any, res) => {
  try {
    const conv = await Conversation.findOne({ conversationId: req.params.id, userId: req.userId }).lean();
    if (!conv) return res.status(404).json({ error: 'المحادثة غير موجودة' });
    res.json({ conversationId: conv.conversationId, messages: conv.messages || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/:id', authenticate, async (req: any, res) => {
  await Conversation.findOneAndDelete({ conversationId: req.params.id, userId: req.userId });
  res.json({ success: true });
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

// Only listen if not running as a Vercel function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server on ${PORT}`);
    await initRAG();
  });
}

// Ensure RAG is initialized for serverless calls
await initRAG();

export default app;
