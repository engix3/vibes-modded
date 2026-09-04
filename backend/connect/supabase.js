class VibesSupabaseClient {
  constructor(url, anonKey) {
    this.url = url;
    this.anonKey = anonKey;
    this._session = null;
    this._sessionKey = "vibes_supabase_session";
  }
  async signInWithIdToken(idToken) {
    const response = await fetch(`${this.url}/auth/v1/token?grant_type=id_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.anonKey
      },
      body: JSON.stringify({
        provider: "google",
        id_token: idToken
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || error.message || "Sign in failed");
    }
    const session = await response.json();
    await this._saveSession(session);
    this._session = session;
    return {
      data: {
        session: session,
        user: session.user
      },
      error: null
    };
  }
  async signOut() {
    const session = await this._loadSession();
    if (session?.access_token) {
      try {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.anonKey,
            Authorization: `Bearer ${session.access_token}`
          }
        });
      } catch (e) {}
    }
    await this._clearSession();
    this._session = null;
    return {
      error: null
    };
  }
  async getUser() {
    const session = await this._loadSession();
    if (!session?.access_token) {
      return {
        data: {
          user: null
        },
        error: null
      };
    }
    if (this._isTokenExpired(session)) {
      const refreshed = await this._refreshSession(session);
      if (!refreshed) {
        return {
          data: {
            user: null
          },
          error: null
        };
      }
    }
    const currentSession = await this._loadSession();
    return {
      data: {
        user: currentSession?.user || null
      },
      error: null
    };
  }
  async getSession() {
    const session = await this._loadSession();
    if (!session?.access_token) {
      return {
        data: {
          session: null
        },
        error: null
      };
    }
    if (this._isTokenExpired(session)) {
      const refreshed = await this._refreshSession(session);
      if (!refreshed) {
        return {
          data: {
            session: null
          },
          error: null
        };
      }
    }
    const currentSession = await this._loadSession();
    return {
      data: {
        session: currentSession
      },
      error: null
    };
  }
  from(table) {
    return new VibesQueryBuilder(this, table);
  }
  async _query(table, options = {}) {
    const session = await this._loadSession();
    const {select: select = "*", filters: filters = [], single: single = false} = options;
    let url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    for (const filter of filters) {
      url += `&${filter.column}=eq.${encodeURIComponent(filter.value)}`;
    }
    const headers = {
      "Content-Type": "application/json",
      apikey: this.anonKey,
      Prefer: single ? "return=representation" : ""
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    const response = await fetch(url, {
      headers: headers
    });
    if (!response.ok) {
      const error = await response.json();
      return {
        data: null,
        error: error
      };
    }
    let data = await response.json();
    if (single) {
      data = Array.isArray(data) ? data[0] || null : data;
    }
    return {
      data: data,
      error: null
    };
  }
  get functions() {
    return {
      invoke: async (functionName, options = {}) => {
        const session = await this._loadSession();
        const {body: body} = options;
        const headers = {
          "Content-Type": "application/json",
          apikey: this.anonKey
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        const response = await fetch(`${this.url}/functions/v1/${functionName}`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const error = await response.text();
          return {
            data: null,
            error: {
              message: error
            }
          };
        }
        const data = await response.json();
        return {
          data: data,
          error: null
        };
      }
    };
  }
  get auth() {
    return {
      signInWithIdToken: options => this.signInWithIdToken(options.token),
      signOut: () => this.signOut(),
      getUser: () => this.getUser(),
      getSession: () => this.getSession()
    };
  }
  async _saveSession(session) {
    await chrome.storage.local.set({
      [this._sessionKey]: session
    });
  }
  async _loadSession() {
    if (this._session) return this._session;
    const data = await chrome.storage.local.get(this._sessionKey);
    this._session = data[this._sessionKey] || null;
    return this._session;
  }
  async _clearSession() {
    await chrome.storage.local.remove(this._sessionKey);
    await chrome.storage.local.remove("premium_cache");
  }
  _isTokenExpired(session) {
    if (!session?.expires_at) return true;
    return Date.now() >= session.expires_at * 1e3 - 6e4;
  }
  async _refreshSession(session) {
    if (!session?.refresh_token) return false;
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.anonKey
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token
        })
      });
      if (!response.ok) {
        await this._clearSession();
        return false;
      }
      const newSession = await response.json();
      await this._saveSession(newSession);
      this._session = newSession;
      return true;
    } catch (e) {
      await this._clearSession();
      return false;
    }
  }
}

class VibesQueryBuilder {
  constructor(client, table) {
    this._client = client;
    this._table = table;
    this._select = "*";
    this._filters = [];
    this._single = false;
  }
  select(columns = "*") {
    this._select = columns;
    return this;
  }
  eq(column, value) {
    this._filters.push({
      column: column,
      value: value
    });
    return this;
  }
  single() {
    this._single = true;
    return this;
  }
  async then(resolve, reject) {
    try {
      const result = await this._client._query(this._table, {
        select: this._select,
        filters: this._filters,
        single: this._single
      });
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }
}

const vibesSupabase = new VibesSupabaseClient(VIBES_PRO_CONFIG.SUPABASE_URL, VIBES_PRO_CONFIG.SUPABASE_ANON_KEY);

window.vibesSupabase = vibesSupabase;