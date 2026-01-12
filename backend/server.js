const express = require('express');
const cors = require('cors');
const folderRoutes = require('./routes/folders');
const shareRoutes = require('./routes/share');
const starsRoutes = require('./routes/stars');
const activityRoutes = require('./routes/activities');
const batchRoutes = require('./routes/batch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- ROUTES ---
const authRoutes = require('./routes/auth'); 
app.use('/api/auth', authRoutes);           
const fileRoutes = require('./routes/files'); 
app.use('/api/files', fileRoutes);            
app.use('/api/folders', folderRoutes);        
app.use('/api/share', shareRoutes);         
app.use('/api/stars', starsRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/batch', batchRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Cloud Storage API is running correctly!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});