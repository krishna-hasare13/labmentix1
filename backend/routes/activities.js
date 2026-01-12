const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access Denied' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); } 
    catch (err) { res.status(400).json({ error: 'Invalid Token' }); }
};

// GET RECENT ACTIVITY
router.get('/', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*, users(full_name)') // Get user name if needed
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;