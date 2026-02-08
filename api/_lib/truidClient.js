const readEnv = (key) => process.env[key] || process.env[`VITE_${key}`];

class TruIDClient {
  constructor() {
    this.apiKey = readEnv('TRUID_API_KEY');
    this.subscriptionKey = readEnv('TRUID_SUBSCRIPTION_KEY') || this.apiKey;
    const configuredBase = readEnv('TRUID_API_BASE') || 'https://api.truidconnect.io';
    this.baseURL = configuredBase.replace(/\/$/, '');
    this.companyId = readEnv('COMPANY_ID');
    this.brandId = readEnv('BRAND_ID');
    this.redirectUrl = readEnv('REDIRECT_URL');
    this.webhookUrl = readEnv('WEBHOOK_URL');
  }

  validateSetup() {
    const missing = [];
    if (!this.apiKey) missing.push('TRUID_API_KEY');
    if (!this.companyId) missing.push('COMPANY_ID');
    if (!this.brandId) missing.push('BRAND_ID');
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  buildConsumerUrl(consentId) {
    if (!consentId) return null;
    const scheme = readEnv('TRUID_SCHEME') || 'https';
    const domain = readEnv('TRUID_DOMAIN') || 'hello.truidconnect.io';
    const host = domain.startsWith('www.') ? domain : `www.${domain}`;
    return `${scheme}://${host}/consents/${consentId}`;
  }

  normalizeConsumerUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const scheme = readEnv('TRUID_SCHEME') || 'https';
    const domain = readEnv('TRUID_DOMAIN');
    if (!domain) return url;
    try {
      const parsed = new URL(url);
      const host = domain.startsWith('www.') ? domain : `www.${domain}`;
      parsed.protocol = `${scheme}:`;
      parsed.host = host;
      return parsed.toString();
    } catch (_) {
      return url;
    }
  }

  resolveConsumerUrl(responseData, consentId, locationHeader) {
    if (responseData?.consumerUrl) return this.normalizeConsumerUrl(responseData.consumerUrl);
    if (responseData?.links?.consumer) return this.normalizeConsumerUrl(responseData.links.consumer);
    if (responseData?.inviteUrl) return this.normalizeConsumerUrl(responseData.inviteUrl);
    if (locationHeader) return this.normalizeConsumerUrl(locationHeader);
    return this.buildConsumerUrl(consentId);
  }

  extractCollectionId(locationHeader, fallback) {
    if (fallback) return fallback;
    if (!locationHeader) return null;
    try {
      const parts = locationHeader.split('/');
      return parts[parts.length - 1];
    } catch (_) {
      return null;
    }
  }

  normalizeError(error, defaultMessage) {
    const status = error.status || 500;
    const details = error.message || defaultMessage;
    const err = new Error(details);
    err.status = status;
    return err;
  }

  async fetchApi(client, method, path, body = null) {
    const url = `${this.baseURL}/${client}${path}`;
    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      const err = new Error(typeof data === 'string' ? data : JSON.stringify(data));
      err.status = response.status;
      throw err;
    }

    return { status: response.status, data, headers: responseHeaders };
  }

  async createCollection(options = {}) {
    this.validateSetup();
    const { name, idNumber, idType = 'id', email, mobile, provider, accounts, auto, consentId, rememberMe, services, correlation, force } = options;
    if (!name || !idNumber) throw new Error('Name and idNumber are required to create a collection.');

    const payload = {
      name, idNumber, idType,
      brandId: this.brandId,
      ...(this.companyId && { companyId: this.companyId }),
      ...(email && { email }),
      ...(mobile && { mobile }),
      ...(provider && { provider }),
      ...(Array.isArray(accounts) && accounts.length ? { accounts } : {}),
      ...(typeof auto === 'boolean' ? { auto } : {}),
      ...(consentId && { consentId }),
      ...(rememberMe && { rememberMe }),
      ...(Array.isArray(services) && services.length ? { services } : {}),
      ...(correlation && Object.keys(correlation).length ? { correlation } : {}),
      ...(force ? { force: true } : {}),
      ...(this.redirectUrl && { redirectUrl: this.redirectUrl }),
      ...(this.webhookUrl && { webhookUrl: this.webhookUrl })
    };

    try {
      const response = await this.fetchApi('consultant-api', 'POST', '/collections', payload);
      const payloadData = typeof response.data === 'object' && response.data !== null ? response.data : null;
      const collectionId = this.extractCollectionId(response.headers['location'], payloadData?.id);
      const consumerUrl = this.resolveConsumerUrl(payloadData, response.headers['x-consent'], response.headers['location']);

      return {
        success: true,
        status: response.status,
        collectionId,
        data: payloadData,
        consentId: response.headers['x-consent'],
        consumerUrl
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to create collection');
    }
  }

  async getCollection(collectionId) {
    this.validateSetup();
    try {
      const response = await this.fetchApi('consultant-api', 'GET', `/collections/${collectionId}`);
      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to retrieve collection');
    }
  }

  async getCollectionData(collectionId) {
    this.validateSetup();
    try {
      const response = await this.fetchApi('delivery-api', 'GET', `/collections/${collectionId}/products/summary`);
      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to download collection data');
    }
  }
}

export const truIDClient = new TruIDClient();
