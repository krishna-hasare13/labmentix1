const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access Denied' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) { res.status(400).json({ error: 'Invalid Token' }); }
};

// 1. CREATE FOLDER
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const { data, error } = await supabase
            .from('folders')
            .insert([{ name, parent_id: parentId || null, owner_id: req.user.id }])
            .select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. GET FOLDERS
router.get('/', verifyToken, async (req, res) => {
    try {
        const { parentId, all } = req.query;
        let query = supabase.from('folders').select('*').eq('owner_id', req.user.id);

        if (all !== 'true') {
            if (parentId) query = query.eq('parent_id', parentId);
            else query = query.is('parent_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. RENAME FOLDER (NEW)
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        const { error } = await supabase
            .from('folders')
            .update({ name })
            .eq('id', req.params.id)
            .eq('owner_id', req.user.id);

        if (error) throw error;
        res.json({ message: "Folder renamed" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. DELETE FOLDER (NEW)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const folderId = req.params.id;
        const userId = req.user.id;

        // Note: We should ideally delete files inside the folder first
        // to prevent "orphaned" files if your DB doesn't cascade deletes.
        
        // 1. Delete files inside this folder (Optional soft delete or hard delete)
        await supabase.from('files').update({ is_deleted: true }).eq('folder_id', folderId).eq('owner_id', userId);

        // 2. Delete the folder itself
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId)
            .eq('owner_id', userId);

        if (error) throw error;
        res.json({ message: "Folder deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. GET FOLDER PATH (Breadcrumbs)
router.get('/:id/path', verifyToken, async (req, res) => {
    try {
        const folderId = req.params.id;
        const userId = req.user.id;
        let path = [];
        let currentId = folderId;

        // Traverse up the tree until we hit the root (parent_id is null)
        // Note: For deep trees, a Recursive CTE in SQL is more efficient,
        // but this while-loop is simpler to implement without SQL migrations.
        while (currentId) {
            const { data: folder, error } = await supabase
                .from('folders')
                .select('id, name, parent_id')
                .eq('id', currentId)
                .eq('owner_id', userId)
                .single();

            if (error || !folder) break;

            path.unshift(folder); // Add to start of array
            currentId = folder.parent_id; // Move up
        }

        res.json(path);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;