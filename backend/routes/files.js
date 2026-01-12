const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const { getAccessLevel } = require('../utils/permissions');
const { logActivity } = require('../utils/logger'); // <--- Import Logger

// Middleware: Verify Token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access Denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid Token' });
    }
};

// --- HELPER 1: Attach 'is_starred' status ---
const attachStarStatus = async (userId, files) => {
    if (!files || files.length === 0) return [];
    
    const { data: stars } = await supabase
        .from('stars')
        .select('resource_id')
        .eq('user_id', userId)
        .eq('resource_type', 'file')
        .in('resource_id', files.map(f => f.id));

    const starredSet = new Set(stars?.map(s => s.resource_id));

    return files.map(f => ({
        ...f,
        is_starred: starredSet.has(f.id)
    }));
};

// --- HELPER 2: Attach 'thumbnailUrl' (NEW) ---
const attachThumbnails = async (files) => {
    if (!files || files.length === 0) return [];

    // 1. Filter only images
    const imageFiles = files.filter(f => f.mime_type && f.mime_type.startsWith('image/'));
    if (imageFiles.length === 0) return files;

    // 2. Get batch signed URLs (valid for 1 hour)
    const paths = imageFiles.map(f => f.storage_key);
    const { data: signedUrls, error } = await supabase.storage.from('drive').createSignedUrls(paths, 3600);

    if (error) {
        console.error("Thumbnail generation error:", error);
        return files;
    }

    // 3. Create a map for quick lookup: path -> url
    const urlMap = {};
    if (signedUrls) {
        signedUrls.forEach(item => {
            if (item.signedUrl) urlMap[item.path] = item.signedUrl;
        });
    }

    // 4. Attach URL to file objects
    return files.map(f => ({
        ...f,
        thumbnailUrl: urlMap[f.storage_key] || null
    }));
};

// ==================================================
//  SPECIAL ROUTES
// ==================================================

// 1. GET STORAGE USAGE
router.get('/storage', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase.from('files').select('size_bytes').eq('owner_id', userId);
        if (error) throw error;
        const totalBytes = data.reduce((acc, file) => acc + file.size_bytes, 0);
        res.json({ used: totalBytes, limit: 1073741824, percentage: Math.min((totalBytes / 1073741824) * 100, 100) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. SEARCH FILES
router.get('/search', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: "Query required" });

        const { data, error } = await supabase
            .from('files').select('*')
            .eq('owner_id', userId).eq('is_deleted', false)
            .ilike('name', `%${q}%`); 

        if (error) throw error;
        
        let result = await attachStarStatus(userId, data);
        result = await attachThumbnails(result); // <--- Add Thumbnails
        
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. GET FILES SHARED WITH ME
router.get('/shared', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { q, type, sortBy, order } = req.query;

        const { data: shares, error: shareError } = await supabase.from('file_shares').select('file_id').eq('user_id', userId);
        if (shareError) throw shareError;
        if (!shares || shares.length === 0) return res.json([]);

        const fileIds = shares.map(s => s.file_id);

        let query = supabase.from('files').select('*, users!inner(full_name, email)').in('id', fileIds).eq('is_deleted', false);

        if (q) query = query.or(`name.ilike.%${q}%,users.full_name.ilike.%${q}%,users.email.ilike.%${q}%`);
        if (type && type !== 'all') query = query.ilike('mime_type', `%${type}%`);

        const col = ['name', 'size_bytes', 'created_at'].includes(sortBy) ? sortBy : 'created_at';
        query = query.order(col, { ascending: order === 'asc' });

        const { data: files, error: fileError } = await query;
        if (fileError) throw fileError;

        let result = await attachStarStatus(userId, files);
        result = await attachThumbnails(result); // <--- Add Thumbnails

        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. GET RECENT FILES
router.get('/recent', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('files').select('*')
            .eq('owner_id', userId).eq('is_deleted', false)
            .order('created_at', { ascending: false }).limit(20);

        if (error) throw error;
        
        let result = await attachStarStatus(userId, data);
        result = await attachThumbnails(result); // <--- Add Thumbnails
        
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. EMPTY TRASH
router.delete('/trash/empty', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: files } = await supabase.from('files').select('storage_key').eq('owner_id', userId).eq('is_deleted', true);
        if (files.length === 0) return res.json({ message: 'Trash is already empty' });

        const keysToRemove = files.map(f => f.storage_key);
        await supabase.storage.from('drive').remove(keysToRemove);
        await supabase.from('files').delete().eq('owner_id', userId).eq('is_deleted', true);

        await logActivity(userId, 'emptied trash', 'folder', 'Trash Bin');
        res.json({ message: 'Trash emptied successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. LIST TRASH
router.get('/trash/all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('files').select('*')
            .eq('owner_id', userId).eq('is_deleted', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. PERMANENT DELETE
router.delete('/trash/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        
        const { data: file } = await supabase.from('files').select('storage_key, name').eq('id', fileId).eq('owner_id', userId).single();
        if (!file) return res.status(404).json({ error: 'File not found' });

        await supabase.storage.from('drive').remove([file.storage_key]);
        await supabase.from('files').delete().eq('id', fileId);
        
        await logActivity(userId, 'permanently deleted', 'file', file.name);
        res.json({ message: 'File permanently deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================================================
//  STANDARD ROUTES
// ==================================================

// 8. RESTORE FILE
router.post('/restore/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        const { data: file } = await supabase.from('files').select('name').eq('id', fileId).single();
        
        await supabase.from('files').update({ is_deleted: false }).eq('id', fileId).eq('owner_id', userId);
        
        await logActivity(userId, 'restored', 'file', file?.name || 'Unknown File');
        res.json({ message: 'File restored' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 9. UPLOAD INIT
router.post('/init', verifyToken, async (req, res) => {
    try {
        const { name, sizeBytes, mimeType, folderId } = req.body;
        const userId = req.user.id;
        
        // 1. Check if file exists
        let query = supabase.from('files').select('*')
            .eq('owner_id', userId).eq('name', name).eq('is_deleted', false);
        if (folderId) query = query.eq('folder_id', folderId);
        else query = query.is('folder_id', null);

        const { data: existingFile } = await query.maybeSingle(); // Safely handle null
        let fileId, storageKey;

        if (existingFile) {
            // Versioning Logic
            fileId = existingFile.id;
            await supabase.from('file_versions').insert([{
                file_id: existingFile.id,
                storage_key: existingFile.storage_key,
                size_bytes: existingFile.size_bytes,
                mime_type: existingFile.mime_type,
                version: existingFile.version || 1,
                user_id: userId
            }]);

            storageKey = `users/${userId}/${uuidv4()}-${name}`;
            await supabase.from('files').update({
                storage_key: storageKey,
                size_bytes: sizeBytes,
                mime_type: mimeType,
                version: (existingFile.version || 1) + 1,
                updated_at: new Date()
            }).eq('id', fileId);

            await logActivity(userId, 'uploaded new version of', 'file', name);
        } else {
            // New File Logic
            storageKey = `users/${userId}/${uuidv4()}-${name}`;
            const { data: newFile, error } = await supabase.from('files').insert([{
                name, size_bytes: sizeBytes, mime_type: mimeType, storage_key: storageKey,
                owner_id: userId, folder_id: folderId || null, version: 1
            }]).select().single();

            if (error) throw error;
            fileId = newFile.id;
            await logActivity(userId, 'uploaded', 'file', name);
        }

        const { data: urlData } = await supabase.storage.from('drive').createSignedUploadUrl(storageKey);
        res.json({ fileId, uploadUrl: urlData.signedUrl, storageKey });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 10. LIST FILES (Standard View)
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { folderId, sortBy, order, q, type } = req.query;

        let query = supabase.from('files').select('*').eq('owner_id', userId).eq('is_deleted', false);

        if (q) query = query.ilike('name', `%${q}%`);
        else if (folderId) query = query.eq('folder_id', folderId);
        else query = query.is('folder_id', null);

        if (type && type !== 'all') query = query.ilike('mime_type', `%${type}%`);

        const col = ['name', 'size_bytes', 'created_at'].includes(sortBy) ? sortBy : 'created_at';
        query = query.order(col, { ascending: order === 'asc' });

        const { data, error } = await query;
        if (error) throw error;

        let result = await attachStarStatus(userId, data);
        result = await attachThumbnails(result); // <--- Add Thumbnails

        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================================================
//  DYNAMIC ROUTES
// ==================================================

// 11. DOWNLOAD / PREVIEW
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        const { preview } = req.query;

        const role = await getAccessLevel(fileId, userId);
        if (!role) return res.status(403).json({ error: 'Access Denied' });

        const { data: file } = await supabase.from('files').select('*').eq('id', fileId).single();
        if (!file) return res.status(404).json({ error: 'File not found' });

        const options = preview === 'true' ? {} : { download: file.name };
        const { data: urlData } = await supabase.storage.from('drive').createSignedUrl(file.storage_key, 60, options);
        
        res.json({ downloadUrl: urlData.signedUrl, mimeType: file.mime_type, role }); 
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 12. UPDATE FILE (RENAME / MOVE)
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;
        const { name, folderId } = req.body;

        const role = await getAccessLevel(fileId, userId);
        if (role !== 'owner' && role !== 'editor') return res.status(403).json({ error: 'Permission Denied' });

        const updates = {};
        let action = '';
        if (name) { updates.name = name; action = 'renamed'; }
        if (folderId !== undefined) { updates.folder_id = folderId; action = action ? 'updated' : 'moved'; }

        const { data, error } = await supabase.from('files').update(updates).eq('id', fileId).select().single();
        if (error) throw error;

        await logActivity(userId, action, 'file', data.name);
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 13. SOFT DELETE
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const role = await getAccessLevel(fileId, userId);
        if (role !== 'owner' && role !== 'editor') return res.status(403).json({ error: 'Permission Denied' });

        const { data: file } = await supabase.from('files').select('name').eq('id', fileId).single();
        await supabase.from('files').update({ is_deleted: true }).eq('id', fileId);
        
        await logActivity(userId, 'moved to trash', 'file', file?.name || 'Unknown File');
        res.json({ message: 'Moved to trash' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 14. GET FILE VERSIONS
router.get('/:id/versions', verifyToken, async (req, res) => {
    try {
        const fileId = req.params.id;
        const role = await getAccessLevel(fileId, req.user.id);
        if (!role) return res.status(403).json({ error: "Access Denied" });

        const { data } = await supabase.from('file_versions').select('*').eq('file_id', fileId).order('version', { ascending: false });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 15. RESTORE OLD VERSION
router.post('/:id/versions/:versionId/restore', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: fileId, versionId } = req.params;

        const role = await getAccessLevel(fileId, userId);
        if (role !== 'owner' && role !== 'editor') return res.status(403).json({ error: "Access Denied" });

        const { data: oldVersion } = await supabase.from('file_versions').select('*').eq('id', versionId).single();
        const { data: currentFile } = await supabase.from('files').select('*').eq('id', fileId).single();

        // Archive Current
        await supabase.from('file_versions').insert([{
            file_id: currentFile.id, storage_key: currentFile.storage_key, size_bytes: currentFile.size_bytes,
            mime_type: currentFile.mime_type, version: currentFile.version, user_id: userId
        }]);

        // Restore Old
        await supabase.from('files').update({
            storage_key: oldVersion.storage_key, size_bytes: oldVersion.size_bytes, mime_type: oldVersion.mime_type,
            version: (currentFile.version || 1) + 1, updated_at: new Date()
        }).eq('id', fileId);

        await logActivity(userId, `restored version ${oldVersion.version} of`, 'file', currentFile.name);
        res.json({ message: "Version restored successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;