class PremiumUI {
  constructor() {
    if (!window.VIBES_PLUS_OR_DONATE_TOGGLE) {
      this._disabled = true;
      return;
    }
    this.premiumBtn = document.getElementById("footer-action-btn");
    this.overlay = document.getElementById("premium-overlay");
    this.closeBtn = document.getElementById("premium-close");
    this.signInState = document.getElementById("premium-signin");
    this.offerState = document.getElementById("premium-offer");
    this.subscribedState = document.getElementById("premium-subscribed");
    this.loadingState = document.getElementById("premium-loading");
    this.googleSignInBtn = document.getElementById("google-signin-btn");
    this.subscribeBtn = document.getElementById("subscribe-btn");
    this.manageBtn = document.getElementById("manage-btn");
    this.signOutOfferBtn = document.getElementById("signout-offer-btn");
    this.signOutSubscribedBtn = document.getElementById("signout-subscribed-btn");
    this.userEmail = document.getElementById("premium-user-email");
    this.priceAmount = document.getElementById("premium-price-amount");
    if (this.priceAmount && VIBES_PRO_CONFIG?.PRICE_AMOUNT) {
      this.priceAmount.textContent = VIBES_PRO_CONFIG.PRICE_AMOUNT;
    }
    this._state = "SIGN_IN";
    this._user = null;
    this._isPro = false;
    this._bindEvents();
  }
  _bindEvents() {
    this.premiumBtn?.addEventListener("click", () => this.showModal());
    this.closeBtn?.addEventListener("click", () => this.hideModal());
    this.overlay?.addEventListener("click", e => {
      if (e.target === this.overlay) {
        this.hideModal();
      }
    });
    this.googleSignInBtn?.addEventListener("click", () => this._handleSignIn());
    this.subscribeBtn?.addEventListener("click", () => this._handleSubscribe());
    this.manageBtn?.addEventListener("click", () => this._handleManage());
    this.signOutOfferBtn?.addEventListener("click", () => this._handleSignOut());
    this.signOutSubscribedBtn?.addEventListener("click", () => this._handleSignOut());
  }
  async showModal() {
    if (this._disabled) return;
    this._setState("LOADING");
    this.overlay?.classList.add("visible");
    try {
      this._user = await vibesAuth.getUser();
      if (this._user) {
        this._isPro = await vibesPremium.isPro();
        this._setState(this._isPro ? "SUBSCRIBED" : "OFFER");
      } else {
        this._setState("SIGN_IN");
      }
    } catch (e) {
      console.error("PremiumUI: Error checking status:", e);
      this._setState("SIGN_IN");
    }
  }
  hideModal() {
    this.overlay?.classList.remove("visible");
  }
  _setState(state) {
    this._state = state;
    this.signInState?.classList.remove("active");
    this.offerState?.classList.remove("active");
    this.subscribedState?.classList.remove("active");
    this.loadingState?.classList.remove("active");
    switch (state) {
     case "SIGN_IN":
      this.signInState?.classList.add("active");
      break;

     case "OFFER":
      this.offerState?.classList.add("active");
      this._updateUserEmail();
      break;

     case "SUBSCRIBED":
      this.subscribedState?.classList.add("active");
      this._updateUserEmail();
      break;

     case "LOADING":
      this.loadingState?.classList.add("active");
      break;
    }
  }
  _updateUserEmail() {
    if (this.userEmail && this._user?.email) {
      this.userEmail.textContent = this._user.email;
    }
  }
  async _handleSignIn() {
    this._setState("LOADING");
    try {
      this._user = await vibesAuth.signInWithGoogle();
      this._isPro = await vibesPremium.isPro();
      this._setState(this._isPro ? "SUBSCRIBED" : "OFFER");
    } catch (e) {
      console.error("PremiumUI: Sign-in failed:", e);
      this._setState("SIGN_IN");
      if (e.message && !e.message.includes("canceled")) {
        alert("Sign-in failed: " + e.message);
      }
    }
  }
  async _handleSubscribe() {
    try {
      await vibesPayments.openCheckout();
      this.hideModal();
    } catch (e) {
      console.error("PremiumUI: Checkout failed:", e);
      alert("Could not open checkout: " + e.message);
    }
  }
  async _handleManage() {
    try {
      await vibesPayments.openPortal();
    } catch (e) {
      console.error("PremiumUI: Portal failed:", e);
      alert("Could not open subscription portal: " + e.message);
    }
  }
  async _handleSignOut() {
    this._setState("LOADING");
    try {
      await vibesAuth.signOut();
      this._user = null;
      this._isPro = false;
      this._setState("SIGN_IN");
    } catch (e) {
      console.error("PremiumUI: Sign-out failed:", e);
      this._setState("SIGN_IN");
    }
  }
  async isPro() {
    if (this._disabled) return false;
    return vibesPremium.isPro();
  }
  async isSignedIn() {
    if (this._disabled) return false;
    return vibesAuth.isSignedIn();
  }
  async refreshStatus() {
    if (this._disabled) return false;
    return vibesPremium.refresh();
  }
}

window.premiumUI = new PremiumUI;