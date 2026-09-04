const vibesPremium = {
  async isPro() {
    const {premium_cache: premium_cache} = await chrome.storage.local.get("premium_cache");
    if (premium_cache?.expires > Date.now()) {
      return premium_cache.value;
    }
    const user = await vibesAuth.getUser();
    if (!user) {
      return false;
    }
    try {
      const {data: data, error: error} = await vibesSupabase.from("subscriptions").select("vibes_pro, expires_at").eq("user_id", user.id).single();
      if (error) {
        console.error("Failed to check premium status:", error);
        return false;
      }
      const isPremium = data?.vibes_pro && new Date(data.expires_at) > new Date;
      await chrome.storage.local.set({
        premium_cache: {
          value: isPremium,
          expires: Date.now() + VIBES_PRO_CONFIG.PREMIUM_CACHE_TTL
        }
      });
      return isPremium;
    } catch (e) {
      console.error("Premium check failed:", e);
      return false;
    }
  },
  async clearPremiumCache() {
    await chrome.storage.local.remove("premium_cache");
  },
  async refresh() {
    await this.clearPremiumCache();
    return this.isPro();
  }
};

window.vibesPremium = vibesPremium;