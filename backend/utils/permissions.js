const supabase = require('../config/supabase');

/**
 * Determines the access level of a user for a specific file.
 * Returns: 'owner', 'editor', 'viewer', or null (no access)
 */
const getAccessLevel = async (fileId, userId) => {
    // 1. Check if Owner
    const { data: file } = await supabase
        .from('files')
        .select('owner_id')
        .eq('id', fileId)
        .single();

    if (file && file.owner_id === userId) return 'owner';

    // 2. Check if Shared (Editor/Viewer)
    const { data: share } = await supabase
        .from('file_shares')
        .select('permission')
        .eq('file_id', fileId)
        .eq('user_id', userId)
        .single();

    if (share) return share.permission; // 'editor' or 'viewer'

    return null; // No access
};

module.exports = { getAccessLevel };