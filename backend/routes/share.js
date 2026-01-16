const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const { v4: uuidv4 } = require('uuid');

// --- Middleware: Verify Token ---
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

// 1. SHARE WITH EMAIL (Invite User)
router.post('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, permission } = req.body;

        // Find user ID by email
        const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { error } = await supabase.from('file_shares').upsert([{
            file_id: id,
            user_id: user.id,
            permission
        }]);

        if (error) throw error;
        res.json({ message: 'User invited successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. GET SHARE STATUS
router.get('/:fileId/status', verifyToken, async (req, res) => {
    try {
        const fileId = req.params.fileId;
        
        // Fetch file public link details
        const { data: file } = await supabase
            .from('files')
            .select('public_token, link_expires_at, link_password')
            .eq('id', fileId)
            .single();

        // Fetch list of users shared with
        const { data: shares } = await supabase
            .from('file_shares')
            .select('permission, users(id, email, full_name)')
            .eq('file_id', fileId);

        res.json({ 
            publicToken: file?.public_token || null,
            expiresAt: file?.link_expires_at,
            hasPassword: !!file?.link_password, // Returns true/false, not the hash
            users: shares || [] 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. TOGGLE/UPDATE PUBLIC LINK (With Debugging)
router.post('/:fileId/public', verifyToken, async (req, res) => {
    console.log("--- Hit Create Link Route ---"); // DEBUG LOG
    console.log("User ID:", req.user.id);
    console.log("File ID:", req.params.fileId);
    console.log("Body:", req.body);

    try {
        const { action, password, expiry } = req.body; 
        const fileId = req.params.fileId;
        const ownerId = req.user.id;

        let updateData = {};

        if (action === 'remove') {
            updateData = { public_token: null, link_password: null, link_expires_at: null };
        } else {
            // Check current state
            const { data: current, error: fetchError } = await supabase
                .from('files')
                .select('public_token')
                .eq('id', fileId)
                .single();
            
            if (fetchError) {
                console.error("Fetch Error:", fetchError); // DEBUG LOG
                return res.status(500).json({ error: "Failed to fetch file" });
            }

            if (!current.public_token) {
                updateData.public_token = uuidv4();
            }
            
            updateData.link_expires_at = expiry ? expiry : null;

            if (password && password.trim() !== "") {
                const salt = await bcrypt.genSalt(10);
                updateData.link_password = await bcrypt.hash(password, salt);
            }
        }

        console.log("Attempting Update with:", updateData); // DEBUG LOG

        const { data, error } = await supabase
            .from('files')
            .update(updateData)
            .eq('id', fileId)
            .eq('owner_id', ownerId) // RLS usually relies on this
            .select()
            .single();

        if (error) {
            console.error("Supabase Update Error:", error); // CRITICAL DEBUG LOG
            throw error;
        }

        console.log("Update Success:", data); // DEBUG LOG

        res.json({ 
            publicToken: data.public_token, 
            expiresAt: data.link_expires_at, 
            hasPassword: !!data.link_password 
        });

    } catch (err) { 
        console.error("Server Catch Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// 4. REVOKE ACCESS (Remove specific user)
router.delete('/:id/user/:uid', verifyToken, async (req, res) => {
    try {
        const { id, uid } = req.params;
        const { error } = await supabase.from('file_shares').delete().eq('file_id', id).eq('user_id', uid);
        if (error) throw error;
        res.json({ message: 'Access revoked' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. PUBLIC ACCESS (For External Users Viewing Link)
router.post('/public/:token/access', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body; 

        const { data: file, error } = await supabase
            .from('files')
            .select('*')
            .eq('public_token', token)
            .single();

        if (error || !file) return res.status(404).json({ error: "Link invalid" });

        // A. Check Expiry
        if (file.link_expires_at && new Date(file.link_expires_at) < new Date()) {
            return res.status(410).json({ error: "Link has expired" });
        }

        // B. Check Password
        if (file.link_password) {
            if (!password) return res.status(401).json({ error: "Password required", protected: true });
            
            const valid = await bcrypt.compare(password, file.link_password);
            if (!valid) return res.status(403).json({ error: "Incorrect password" });
        }

        // C. Generate URL
        // NOTE: Ensure 'drive' matches your bucket name
        const { data: urlData } = await supabase
            .storage.from('drive').createSignedUrl(file.storage_key, 3600, { download: file.name });

        res.json({
            name: file.name,
            size: file.size_bytes,
            mimeType: file.mime_type,
            downloadUrl: urlData.signedUrl
        });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;