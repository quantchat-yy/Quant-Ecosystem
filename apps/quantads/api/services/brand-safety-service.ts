// ============================================================================
// QuantAds API - Brand Safety Service
// Content classification, keyword matching, URL categorization
// ============================================================================

interface ContentClassification {
  url: string;
  categories: { id: string; name: string; confidence: number }[];
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  sentiment: number;
  language: string;
  isBrandSafe: boolean;
  reasons: string[];
}

interface KeywordBlocklist {
  id: string;
  accountId: string;
  keyword: string;
  matchType: 'exact' | 'phrase' | 'broad';
  isActive: boolean;
  blockedImpressions: number;
  addedAt: string;
}

interface URLCategory {
  url: string;
  domain: string;
  category: string;
  subCategory?: string;
  safetyRating: number;
  lastChecked: string;
  contentSummary: string;
}

interface PlacementExclusion {
  id: string;
  accountId: string;
  type: 'domain' | 'app' | 'channel' | 'page';
  value: string;
  reason: string;
  blockedSince: string;
  impressionsBlocked: number;
}

interface BrandSafetySettings {
  accountId: string;
  inventoryType: 'limited' | 'standard' | 'full';
  categories: { id: string; enabled: boolean }[];
  score: { overall: number; contentSafety: number; adPlacement: number; contextualRelevance: number; lastUpdated: string };
}

interface BrandSafetyStore {
  blocklists: Map<string, KeywordBlocklist[]>;
  urlCache: Map<string, URLCategory>;
  exclusions: Map<string, PlacementExclusion[]>;
  settings: Map<string, BrandSafetySettings>;
  classifications: ContentClassification[];
}

const store: BrandSafetyStore = {
  blocklists: new Map(),
  urlCache: new Map(),
  exclusions: new Map(),
  settings: new Map(),
  classifications: [],
};

const HIGH_RISK_KEYWORDS = ['violence', 'hate', 'terrorism', 'drugs', 'weapons', 'gambling', 'adult', 'explicit'];
const MEDIUM_RISK_KEYWORDS = ['politics', 'controversy', 'lawsuit', 'scandal', 'protest', 'crisis'];
const UNSAFE_CATEGORIES = ['adult', 'violence', 'hate_speech', 'drugs', 'gambling', 'terrorism'];

export class BrandSafetyService {
  async classifyContent(url: string, content?: string): Promise<ContentClassification> {
    const cached = store.urlCache.get(url);
    if (cached && Date.now() - new Date(cached.lastChecked).getTime() < 3600000) {
      return this.buildClassification(url, cached);
    }

    const domain = new URL(url).hostname;
    const categories: { id: string; name: string; confidence: number }[] = [];
    const detectedKeywords: string[] = [];
    const reasons: string[] = [];
    let riskLevel: ContentClassification['riskLevel'] = 'safe';

    const textToAnalyze = (content || url + ' ' + domain).toLowerCase();

    for (const kw of HIGH_RISK_KEYWORDS) {
      if (textToAnalyze.includes(kw)) {
        detectedKeywords.push(kw);
        riskLevel = 'high';
        reasons.push(`High-risk keyword detected: ${kw}`);
      }
    }

    for (const kw of MEDIUM_RISK_KEYWORDS) {
      if (textToAnalyze.includes(kw)) {
        detectedKeywords.push(kw);
        if (riskLevel === 'safe') riskLevel = 'medium';
        reasons.push(`Medium-risk keyword detected: ${kw}`);
      }
    }

    if (/news|media|press/i.test(domain)) categories.push({ id: 'news', name: 'News & Media', confidence: 0.85 });
    if (/shop|store|buy|commerce/i.test(domain)) categories.push({ id: 'ecommerce', name: 'E-Commerce', confidence: 0.8 });
    if (/blog|article|post/i.test(url)) categories.push({ id: 'blog', name: 'Blog & Content', confidence: 0.75 });
    if (/forum|community|discuss/i.test(url)) categories.push({ id: 'ugc', name: 'User Generated Content', confidence: 0.7 });
    if (/social|facebook|twitter|instagram/i.test(domain)) categories.push({ id: 'social', name: 'Social Media', confidence: 0.9 });

    if (categories.length === 0) categories.push({ id: 'general', name: 'General', confidence: 0.6 });

    const sentiment = detectedKeywords.length > 0 ? -0.3 - (detectedKeywords.length * 0.1) : 0.2 + Math.random() * 0.5;

    const classification: ContentClassification = {
      url,
      categories,
      riskLevel,
      keywords: detectedKeywords,
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      language: 'en',
      isBrandSafe: riskLevel === 'safe' || riskLevel === 'low',
      reasons,
    };

    store.urlCache.set(url, { url, domain, category: categories[0]?.name || 'Unknown', safetyRating: riskLevel === 'safe' ? 100 : riskLevel === 'low' ? 80 : riskLevel === 'medium' ? 50 : 20, lastChecked: new Date().toISOString(), contentSummary: '' });
    store.classifications.push(classification);

    return classification;
  }

  async matchKeywords(accountId: string, content: string): Promise<{ matched: KeywordBlocklist[]; isBlocked: boolean }> {
    const blocklist = store.blocklists.get(accountId) || [];
    const matched: KeywordBlocklist[] = [];
    const lowerContent = content.toLowerCase();

    for (const entry of blocklist) {
      if (!entry.isActive) continue;
      const keyword = entry.keyword.toLowerCase();
      let isMatch = false;

      switch (entry.matchType) {
        case 'exact':
          isMatch = lowerContent.split(/\s+/).includes(keyword);
          break;
        case 'phrase':
          isMatch = lowerContent.includes(keyword);
          break;
        case 'broad':
          isMatch = keyword.split(/\s+/).every(word => lowerContent.includes(word));
          break;
      }

      if (isMatch) {
        matched.push(entry);
        entry.blockedImpressions++;
      }
    }

    return { matched, isBlocked: matched.length > 0 };
  }

  async addKeyword(accountId: string, keyword: string, matchType: 'exact' | 'phrase' | 'broad'): Promise<KeywordBlocklist> {
    const entry: KeywordBlocklist = {
      id: `kw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId,
      keyword,
      matchType,
      isActive: true,
      blockedImpressions: 0,
      addedAt: new Date().toISOString(),
    };

    const list = store.blocklists.get(accountId) || [];
    list.push(entry);
    store.blocklists.set(accountId, list);
    return entry;
  }

  async removeKeyword(accountId: string, keywordId: string): Promise<void> {
    const list = store.blocklists.get(accountId) || [];
    store.blocklists.set(accountId, list.filter(k => k.id !== keywordId));
  }

  async getBlocklist(accountId: string): Promise<KeywordBlocklist[]> {
    return store.blocklists.get(accountId) || [];
  }

  async categorizeURL(url: string): Promise<URLCategory> {
    const cached = store.urlCache.get(url);
    if (cached) return cached;

    const domain = new URL(url).hostname;
    const category: URLCategory = {
      url,
      domain,
      category: 'General',
      safetyRating: 85,
      lastChecked: new Date().toISOString(),
      contentSummary: `Content from ${domain}`,
    };

    store.urlCache.set(url, category);
    return category;
  }

  async addExclusion(accountId: string, type: PlacementExclusion['type'], value: string, reason: string): Promise<PlacementExclusion> {
    const exclusion: PlacementExclusion = {
      id: `excl_${Date.now()}`,
      accountId,
      type,
      value,
      reason,
      blockedSince: new Date().toISOString(),
      impressionsBlocked: 0,
    };

    const list = store.exclusions.get(accountId) || [];
    list.push(exclusion);
    store.exclusions.set(accountId, list);
    return exclusion;
  }

  async removeExclusion(accountId: string, exclusionId: string): Promise<void> {
    const list = store.exclusions.get(accountId) || [];
    store.exclusions.set(accountId, list.filter(e => e.id !== exclusionId));
  }

  async getExclusions(accountId: string): Promise<PlacementExclusion[]> {
    return store.exclusions.get(accountId) || [];
  }

  async getSettings(accountId: string): Promise<BrandSafetySettings> {
    if (!store.settings.has(accountId)) {
      store.settings.set(accountId, {
        accountId,
        inventoryType: 'standard',
        categories: UNSAFE_CATEGORIES.map(id => ({ id, enabled: false })),
        score: { overall: 85, contentSafety: 88, adPlacement: 82, contextualRelevance: 86, lastUpdated: new Date().toISOString() },
      });
    }
    return store.settings.get(accountId)!;
  }

  async updateSettings(accountId: string, updates: Partial<BrandSafetySettings>): Promise<BrandSafetySettings> {
    const current = await this.getSettings(accountId);
    const updated = { ...current, ...updates };
    store.settings.set(accountId, updated);
    return updated;
  }

  async isPlacementSafe(accountId: string, url: string): Promise<{ safe: boolean; reasons: string[] }> {
    const exclusions = await this.getExclusions(accountId);
    const domain = new URL(url).hostname;
    const reasons: string[] = [];

    for (const excl of exclusions) {
      if (excl.type === 'domain' && domain.includes(excl.value)) {
        reasons.push(`Domain excluded: ${excl.value}`);
        excl.impressionsBlocked++;
      }
    }

    const classification = await this.classifyContent(url);
    if (!classification.isBrandSafe) {
      reasons.push(...classification.reasons);
    }

    return { safe: reasons.length === 0, reasons };
  }

  private buildClassification(url: string, cached: URLCategory): ContentClassification {
    return {
      url,
      categories: [{ id: cached.category.toLowerCase().replace(/\s+/g, '_'), name: cached.category, confidence: 0.8 }],
      riskLevel: cached.safetyRating >= 80 ? 'safe' : cached.safetyRating >= 60 ? 'low' : cached.safetyRating >= 40 ? 'medium' : 'high',
      keywords: [],
      sentiment: 0.5,
      language: 'en',
      isBrandSafe: cached.safetyRating >= 60,
      reasons: [],
    };
  }
}

export const brandSafetyService = new BrandSafetyService();
