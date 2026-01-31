const axios = require('axios');

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

    this.consultantClient = axios.create({
      baseURL: `${this.baseURL}/consultant-api`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      },
      timeout: 10000
    });

    this.deliveryClient = axios.create({
      baseURL: `${this.baseURL}/delivery-api`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      },
      timeout: 10000
    });
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

  async createCollection(options = {}) {
    this.validateSetup();

    const {
      name,
      idNumber,
      idType = 'id',
      email,
      mobile,
      provider,
      accounts,
      auto,
      consentId,
      rememberMe,
      services,
      correlation,
      force
    } = options;

    if (!name || !idNumber) {
      throw new Error('Name and idNumber are required to create a collection.');
    }

    const payload = {
      name,
      idNumber,
      idType,
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
      const response = await this.consultantClient.post('/collections', payload);
      const locationHeader = response.headers['location'];
      const consentHeader = response.headers['x-consent'];
      const payloadData = typeof response.data === 'object' && response.data !== null ? response.data : null;
      const collectionId = this.extractCollectionId(locationHeader, payloadData?.id);
      const consumerUrl = this.resolveConsumerUrl(payloadData, consentHeader, locationHeader);

      return {
        success: true,
        status: response.status,
        collectionId,
        data: payloadData,
        consentId: consentHeader,
        consumerUrl
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to create collection');
    }
  }

  resolveConsumerUrl(responseData, consentId, locationHeader) {
    if (responseData?.consumerUrl) return this.normalizeConsumerUrl(responseData.consumerUrl);
    if (responseData?.links?.consumer) return this.normalizeConsumerUrl(responseData.links.consumer);
    if (responseData?.inviteUrl) return this.normalizeConsumerUrl(responseData.inviteUrl);
    if (locationHeader) return this.normalizeConsumerUrl(locationHeader);
    return this.buildConsumerUrl(consentId);
  }

  async getCollection(collectionId) {
    this.validateSetup();

    try {
      const response = await this.consultantClient.get(`/collections/${collectionId}`);
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to retrieve collection');
    }
  }

  async getCollectionData(collectionId) {
    this.validateSetup();

    try {
      const response = await this.deliveryClient.get(`/collections/${collectionId}/products/summary`);
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      throw this.normalizeError(error, 'Failed to download collection data');
    }
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
    const status = error.response?.status;
    const details = error.response?.data || error.message;
    const normalizedDetails = typeof details === 'string' ? details : JSON.stringify(details);
    const err = new Error(`${defaultMessage}: ${normalizedDetails}`);
    err.status = status || 500;
    return err;
  }
}

const truIDClient = new TruIDClient();

module.exports = truIDClient;
