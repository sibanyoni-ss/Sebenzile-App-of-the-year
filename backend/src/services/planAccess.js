async function getAccountTier(req) {
    const { data, error } = await req.supabase
        .from('profiles')
        .select('tier')
        .eq('id', req.user.id)
        .maybeSingle();
    if (error) throw error;
    return String(data?.tier || 'free').trim().toLowerCase();
}

function hasPaidFeatures(tier) {
    return tier === 'standard' || tier === 'premium';
}

function hasPremiumFeatures(tier) {
    return tier === 'premium';
}

module.exports = { getAccountTier, hasPaidFeatures, hasPremiumFeatures };
