const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to verify token
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

// ==================================================
//  AUTH ROUTES
// ==================================================

// 1. REGISTER (Email/Password)
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if user already exists
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
        if (existing) return res.status(400).json({ error: "User already exists" });

        const { data, error } = await supabase
            .from('users')
            .insert([{ 
                email, 
                password_hash: hashedPassword, 
                full_name: fullName || '' 
            }])
            .select();

        if (error) throw error;
        
        // Auto-login after register (Optional, generates token)
        const user = data[0];
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ message: 'User registered', token, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. LOGIN (Email/Password)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);

        if (error) throw error;
        if (users.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = users[0];
        
        const validPass = await bcrypt.compare(password, user.password_hash); 
        if (!validPass) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            token, 
            user: { id: user.id, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url } 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. OAUTH SYNC (GitHub/Google) - NEW
// Frontend authenticates with Supabase, then calls this to sync DB and get custom JWT
router.post('/oauth-sync', async (req, res) => {
    try {
        const { email, fullName, providerId } = req.body;

        if (!email) return res.status(400).json({ error: "Email required from provider" });

        // A. Check if user exists in our DB
        let { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        // B. If not, create them automatically
        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    email,
                    full_name: fullName || email.split('@')[0], 
                    password_hash: `${providerId.toUpperCase()}_AUTH_USER` // Dummy hash for OAuth users
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            user = newUser;
        }

        // C. Generate standard JWT used by the rest of the app
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email } });

    } catch (err) {
        console.error("OAuth Sync Error:", err);
        res.status(500).json({ error: "Authentication failed" });
    }
});

// ==================================================
//  USER DATA ROUTES
// ==================================================

// 4. GET CURRENT USER
router.get('/me', verifyToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, avatar_url')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. UPDATE PROFILE
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { fullName, avatarUrl } = req.body;
        
        const { data, error } = await supabase
            .from('users')
            .update({ full_name: fullName, avatar_url: avatarUrl })
            .eq('id', req.user.id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;