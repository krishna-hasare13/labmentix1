const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');
const shareRoutes = require('./routes/share');
const starsRoutes = require('./routes/stars');
const activityRoutes = require('./routes/activities');
const batchRoutes = require('./routes/batch');

const app = express();
const PORT = process.env.PORT || 5000;

// --- CRITICAL: CORS CONFIGURATION ---
// This tells the backend: "Only answer requests from this specific Frontend URL"
const allowedOrigins = [
  process.env.FRONTEND_URL,       // The Vercel URL you will add to Render (e.g. https://my-app.vercel.app)
  'http://localhost:5173',        // Your local React development server
  'http://localhost:3000'         // Fallback for some local setups
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // If the origin isn't in the list, block it
      // return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      // NOTE: For debugging deployment, you can temporarily allow all:
      return callback(null, true); 
    }
    return callback(null, true);
  },
  credentials: true // Important if you use cookies or authorization headers
}));

app.use(express.json());

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/stars', starsRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/batch', batchRoutes);

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({ 
    status: 'active', 
    message: 'Cloud Storage API is running!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});