const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/logger');

// Middleware
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access Denied' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); } 
    catch (err) { res.status(400).json({ error: 'Invalid Token' }); }
};

// 1. BULK DELETE (Soft Delete)
router.post('/delete', verifyToken, async (req, res) => {
    try {
        const { fileIds = [], folderIds = [] } = req.body;
        const userId = req.user.id;

        // Soft delete files
        if (fileIds.length > 0) {
            await supabase.from('files')
                .update({ is_deleted: true })
                .in('id', fileIds)
                .eq('owner_id', userId);
        }

        // Soft delete folders
        if (folderIds.length > 0) {
            await supabase.from('folders')
                .update({ is_deleted: true })
                .in('id', folderIds)
                .eq('owner_id', userId);
        }

        await logActivity(userId, 'bulk deleted', 'items', `${fileIds.length + folderIds.length} items`);
        res.json({ message: 'Items deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. BULK MOVE
router.post('/move', verifyToken, async (req, res) => {
    try {
        const { fileIds = [], folderIds = [], targetFolderId } = req.body;
        const userId = req.user.id;

        if (fileIds.length > 0) {
            await supabase.from('files')
                .update({ folder_id: targetFolderId })
                .in('id', fileIds)
                .eq('owner_id', userId);
        }

        if (folderIds.length > 0) {
            await supabase.from('folders')
                .update({ parent_id: targetFolderId })
                .in('id', folderIds)
                .eq('owner_id', userId);
        }

        await logActivity(userId, 'bulk moved', 'items', `${fileIds.length + folderIds.length} items`);
        res.json({ message: 'Items moved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;