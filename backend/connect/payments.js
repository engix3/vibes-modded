const vibesPayments = {
  async getCheckoutUrl() {
    const {data: {session: session}} = await vibesSupabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated - please sign in first");
    }
    const {data: data, error: error} = await vibesSupabase.functions.invoke("payment-gateway", {
      body: {
        action: "checkout"
      }
    });
    if (error) {
      console.error("Failed to create checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }
    return data.url;
  },
  async getPortalUrl() {
    const {data: {session: session}} = await vibesSupabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated - please sign in first");
    }
    const {data: data, error: error} = await vibesSupabase.functions.invoke("payment-gateway", {
      body: {
        action: "portal"
      }
    });
    if (error) {
      console.error("Failed to create portal session:", error);
      throw new Error(error.message || "Failed to create portal session");
    }
    return data.url;
  },
  async openCheckout() {
    try {
      const url = await this.getCheckoutUrl();
      chrome.tabs.create({
        url: url
      });
      return true;
    } catch (e) {
      console.error("Failed to open checkout:", e);
      throw e;
    }
  },
  async openPortal() {
    try {
      const url = await this.getPortalUrl();
      chrome.tabs.create({
        url: url
      });
      return true;
    } catch (e) {
      console.error("Failed to open portal:", e);
      throw e;
    }
  }
};

window.vibesPayments = vibesPayments;