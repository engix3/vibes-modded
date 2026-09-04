const vibesAuth = {
  async signInWithGoogle() {
    const clientId = VIBES_PRO_CONFIG.GOOGLE_CLIENT_ID;
    const redirectUri = chrome.identity.getRedirectURL();
    const nonce = crypto.randomUUID();
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("prompt", "select_account");
    try {
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: authUrl.toString(),
          interactive: true
        }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error("No response from auth flow"));
          } else {
            resolve(response);
          }
        });
      });
      const hashParams = new URLSearchParams(responseUrl.split("#")[1]);
      const idToken = hashParams.get("id_token");
      if (!idToken) {
        throw new Error("No ID token in response");
      }
      const {data: data, error: error} = await vibesSupabase.auth.signInWithIdToken({
        token: idToken
      });
      if (error) {
        throw error;
      }
      await vibesPremium.clearPremiumCache();
      return data.user;
    } catch (e) {
      console.error("Google sign-in failed:", e);
      throw e;
    }
  },
  async signOut() {
    await vibesSupabase.auth.signOut();
    await vibesPremium.clearPremiumCache();
  },
  async getUser() {
    const {data: data} = await vibesSupabase.auth.getUser();
    return data.user;
  },
  async isSignedIn() {
    const user = await this.getUser();
    return !!user;
  }
};

window.vibesAuth = vibesAuth;