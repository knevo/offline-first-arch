const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// In-memory storage for actions (simulating database)
let actions = [];
let nextActionId = 1;

// Helper function to simulate network delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to simulate random failures (30% for large requests)
const shouldFail = (isLarge = false) => {
  if (isLarge) {
    return Math.random() < 0.3; // 30% failure rate for large requests
  }
  return false; // Small requests always succeed
};

// POST /api/actions/small - Fast action endpoint
app.post('/api/actions/small', async (req, res) => {
  try {
    await delay(500); // Simulate 500ms delay

    const action = {
      id: nextActionId++,
      type: 'small',
      data: req.body,
      createdAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    actions.push(action);

    console.log(`[SMALL] Action created: ${action.id}`);

    res.status(200).json({
      success: true,
      action: {
        id: action.id,
        type: action.type,
        syncedAt: action.syncedAt,
      },
    });
  } catch (error) {
    console.error('[SMALL] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/actions/large - Large action endpoint (with 30% failure rate)
app.post('/api/actions/large', async (req, res) => {
  try {
    await delay(2000); // Simulate 2s delay

    if (shouldFail(true)) {
      console.log('[LARGE] Simulated failure');
      return res.status(500).json({
        success: false,
        error: 'Network error: Request failed (simulated)',
      });
    }

    const action = {
      id: nextActionId++,
      type: 'large',
      data: req.body,
      createdAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    actions.push(action);

    console.log(`[LARGE] Action created: ${action.id}`);

    res.status(200).json({
      success: true,
      action: {
        id: action.id,
        type: action.type,
        syncedAt: action.syncedAt,
      },
    });
  } catch (error) {
    console.error('[LARGE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/pull - Delta sync endpoint
app.post('/api/sync/pull', async (req, res) => {
  try {
    const { last_pulled_at } = req.body;

    let filteredActions = actions;

    if (last_pulled_at) {
      const lastPulledDate = new Date(last_pulled_at);
      filteredActions = actions.filter((action) => {
        const actionDate = new Date(action.createdAt);
        return actionDate > lastPulledDate;
      });
    }

    console.log(
      `[SYNC] Pulling ${filteredActions.length} actions since ${
        last_pulled_at || 'beginning'
      }`,
    );

    res.status(200).json({
      success: true,
      actions: filteredActions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SYNC] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/images/upload - Image upload endpoint
app.post('/api/images/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: 'No image file provided' });
    }

    await delay(1500); // Simulate upload delay

    // Simulate 30% failure rate for image uploads
    if (shouldFail(true)) {
      // Delete the uploaded file on failure
      fs.unlinkSync(req.file.path);
      console.log('[IMAGE] Simulated upload failure');
      return res.status(500).json({
        success: false,
        error: 'Image upload failed (simulated)',
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    console.log(`[IMAGE] Upload successful: ${req.file.filename}`);

    res.status(200).json({
      success: true,
      url: imageUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('[IMAGE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/actions - Get all synced actions (for verification)
app.get('/api/actions', (req, res) => {
  res.status(200).json({
    success: true,
    count: actions.length,
    actions: actions,
  });
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /api/actions/small - Small action (500ms delay)`);
  console.log(
    `  POST /api/actions/large - Large action (2s delay, 30% failure)`,
  );
  console.log(`  POST /api/sync/pull - Delta sync`);
  console.log(`  POST /api/images/upload - Image upload (30% failure)`);
  console.log(`  GET  /api/actions - List all actions`);
  console.log(`  GET  /health - Health check\n`);
});
