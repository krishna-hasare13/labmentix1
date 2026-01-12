const supabase = require('../config/supabase');

const logActivity = async (userId, action, resourceType, resourceName) => {
    try {
        await supabase.from('activities').insert([{
            user_id: userId,
            action,
            resource_type: resourceType,
            resource_name: resourceName
        }]);
    } catch (err) {
        console.error("Activity Log Error:", err.message);
        // Don't throw error here, logging shouldn't break the main action
    }
};

module.exports = { logActivity };