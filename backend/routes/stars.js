const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Middleware
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access Denied' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) { res.status(400).json({ error: 'Invalid Token' }); }
};

// 1. TOGGLE STAR (Add/Remove)
router.post('/toggle', verifyToken, async (req, res) => {
    try {
        const { resourceId, resourceType } = req.body; // 'file' or 'folder'
        const userId = req.user.id;

        // Check if exists
        const { data: existing } = await supabase
            .from('stars')
            .select('*')
            .eq('user_id', userId)
            .eq('resource_id', resourceId)
            .single();

        if (existing) {
            // Remove
            await supabase.from('stars').delete().eq('user_id', userId).eq('resource_id', resourceId);
            res.json({ starred: false });
        } else {
            // Add
            await supabase.from('stars').insert([{ user_id: userId, resource_id: resourceId, resource_type: resourceType }]);
            res.json({ starred: true });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. LIST STARRED ITEMS
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all star records for this user
        const { data: stars, error } = await supabase
            .from('stars')
            .select('resource_id, resource_type')
            .eq('user_id', userId);

        if (error) throw error;
        if (!stars.length) return res.json([]);

        // Separate IDs
        const fileIds = stars.filter(s => s.resource_type === 'file').map(s => s.resource_id);
        const folderIds = stars.filter(s => s.resource_type === 'folder').map(s => s.resource_id);

        // Fetch actual data
        // Note: You might want to parallelize this
        const { data: files } = await supabase.from('files').select('*').in('id', fileIds).eq('is_deleted', false);
        const { data: folders } = await supabase.from('folders').select('*').in('id', folderIds).eq('is_deleted', false);

        // Mark them as starred for the UI
        const filesWithStar = files?.map(f => ({ ...f, is_starred: true })) || [];
        const foldersWithStar = folders?.map(f => ({ ...f, is_starred: true })) || [];

        res.json({ files: filesWithStar, folders: foldersWithStar });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;