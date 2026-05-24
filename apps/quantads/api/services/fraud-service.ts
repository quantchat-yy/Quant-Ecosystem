// ============================================================================
// QuantAds API - Fraud Detection Service
// Bot scoring, IP reputation, click pattern detection, viewability tracking
// ============================================================================

interface BotScore {
  ip: string;
  userAgent: string;
  score: number;
  factors: { factor: string; weight: number; value: number }[];
  classification: 'human' | 'simple_bot' | 'sophisticated_bot' | 'data_center';
  timestamp: string;
}

interface IPReputation {
  ip: string;
  country: string;
  isp: string;
  isDataCenter: boolean;
  isProxy: boolean;
  isVPN: boolean;
  isTor: boolean;
  riskScore: number;
  clickHistory: { count: number; uniqueCampaigns: number; timespan: number };
  blockedAt?: string;
  lastSeen: string;
}

interface ClickPattern {
  ip: string;
  sessionId: string;
  clicks: { timestamp: string; campaignId: string; adId: string; x: number; y: number }[];
  isSuspicious: boolean;
  reasons: string[];
  intervalStats: { mean: number; stdDev: number; minInterval: number };
}

interface FraudMetrics {
  invalidTrafficRate: number;
  invalidTrafficChange: number;
  botDetections: number;
  botDetectionsChange: number;
  clickFarmIPs: number;
  blockedImpressions: number;
  viewabilityScore: number;
  viewabilityChange: number;
  savedBudget: number;
}

interface ViewabilityEvent {
  impressionId: string;
  adId: string;
  placement: string;
  viewablePixels: number;
  totalPixels: number;
  viewDuration: number;
  inViewport: boolean;
  isViewable: boolean;
}

interface FraudAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  campaignId?: string;
  timestamp: string;
  resolved: boolean;
}

interface FraudStore {
  ipReputations: Map<string, IPReputation>;
  botScores: BotScore[];
  clickPatterns: Map<string, ClickPattern>;
  viewabilityEvents: ViewabilityEvent[];
  alerts: FraudAlert[];
  blockedIPs: Set<string>;
}

const store: FraudStore = {
  ipReputations: new Map(),
  botScores: [],
  clickPatterns: new Map(),
  viewabilityEvents: [],
  alerts: [],
  blockedIPs: new Set(),
};

export class FraudService {
  async scoreBotProbability(request: { ip: string; userAgent: string; headers: Record<string, string>; behavior: Record<string, any> }): Promise<BotScore> {
    const factors: { factor: string; weight: number; value: number }[] = [];
    let totalScore = 0;

    const uaLower = request.userAgent.toLowerCase();
    const hasBotUA = /bot|crawler|spider|scraper|headless|phantom/i.test(uaLower);
    factors.push({ factor: 'user_agent', weight: 0.2, value: hasBotUA ? 90 : 10 });
    totalScore += (hasBotUA ? 90 : 10) * 0.2;

    const ipRep = await this.getIPReputation(request.ip);
    const ipScore = ipRep.isDataCenter ? 85 : ipRep.isProxy ? 70 : ipRep.isVPN ? 50 : 10;
    factors.push({ factor: 'ip_reputation', weight: 0.25, value: ipScore });
    totalScore += ipScore * 0.25;

    const hasAcceptLang = !!request.headers['accept-language'];
    const hasReferer = !!request.headers['referer'];
    const headerScore = (!hasAcceptLang || !hasReferer) ? 60 : 10;
    factors.push({ factor: 'header_analysis', weight: 0.15, value: headerScore });
    totalScore += headerScore * 0.15;

    const behaviorScore = request.behavior.mouseMovements === 0 ? 80 : request.behavior.timeOnPage < 500 ? 70 : 15;
    factors.push({ factor: 'behavior', weight: 0.25, value: behaviorScore });
    totalScore += behaviorScore * 0.25;

    const clickVelocity = ipRep.clickHistory.count / Math.max(ipRep.clickHistory.timespan / 3600000, 1);
    const velocityScore = clickVelocity > 100 ? 90 : clickVelocity > 50 ? 70 : clickVelocity > 20 ? 40 : 10;
    factors.push({ factor: 'click_velocity', weight: 0.15, value: velocityScore });
    totalScore += velocityScore * 0.15;

    const score = Math.min(100, Math.round(totalScore));
    const classification = score >= 80 ? 'sophisticated_bot' : score >= 60 ? 'simple_bot' : ipRep.isDataCenter ? 'data_center' : 'human';

    const result: BotScore = {
      ip: request.ip,
      userAgent: request.userAgent,
      score,
      factors,
      classification,
      timestamp: new Date().toISOString(),
    };

    store.botScores.push(result);
    if (store.botScores.length > 10000) store.botScores = store.botScores.slice(-5000);

    return result;
  }

  async getIPReputation(ip: string): Promise<IPReputation> {
    if (store.ipReputations.has(ip)) {
      return store.ipReputations.get(ip)!;
    }

    const octets = ip.split('.').map(Number);
    const isDataCenter = octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
    const isProxy = Math.random() < 0.05;
    const isVPN = Math.random() < 0.1;

    const reputation: IPReputation = {
      ip,
      country: ['US', 'GB', 'DE', 'IN', 'RU', 'CN', 'BR', 'NG'][Math.floor(Math.random() * 8)],
      isp: isDataCenter ? 'Cloud Provider' : 'Consumer ISP',
      isDataCenter,
      isProxy,
      isVPN,
      isTor: Math.random() < 0.02,
      riskScore: isDataCenter ? 75 : isProxy ? 60 : isVPN ? 40 : Math.floor(Math.random() * 30),
      clickHistory: { count: Math.floor(Math.random() * 200), uniqueCampaigns: Math.floor(Math.random() * 20), timespan: Math.floor(Math.random() * 86400000) },
      lastSeen: new Date().toISOString(),
    };

    store.ipReputations.set(ip, reputation);
    return reputation;
  }

  async analyzeClickPattern(sessionId: string, click: { timestamp: string; campaignId: string; adId: string; x: number; y: number }): Promise<ClickPattern> {
    let pattern = store.clickPatterns.get(sessionId);
    if (!pattern) {
      pattern = { ip: '', sessionId, clicks: [], isSuspicious: false, reasons: [], intervalStats: { mean: 0, stdDev: 0, minInterval: Infinity } };
      store.clickPatterns.set(sessionId, pattern);
    }

    pattern.clicks.push(click);

    if (pattern.clicks.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < pattern.clicks.length; i++) {
        intervals.push(new Date(pattern.clicks[i].timestamp).getTime() - new Date(pattern.clicks[i - 1].timestamp).getTime());
      }
      const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const variance = intervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const minInterval = Math.min(...intervals);

      pattern.intervalStats = { mean, stdDev, minInterval };

      pattern.reasons = [];
      if (stdDev < 50 && intervals.length > 5) pattern.reasons.push('Suspiciously uniform click intervals');
      if (minInterval < 200) pattern.reasons.push('Click intervals too fast for human');
      if (pattern.clicks.length > 20) pattern.reasons.push('Excessive clicks in session');

      const uniquePositions = new Set(pattern.clicks.map(c => `${Math.round(c.x / 10)},${Math.round(c.y / 10)}`)).size;
      if (uniquePositions < pattern.clicks.length * 0.3) pattern.reasons.push('Repetitive click positions');

      pattern.isSuspicious = pattern.reasons.length >= 2;
    }

    return pattern;
  }

  async getDashboardMetrics(accountId: string, dateRange: string): Promise<{
    metrics: FraudMetrics;
    botDetections: any[];
    clickFarms: IPReputation[];
    alerts: FraudAlert[];
    viewability: any[];
  }> {
    const days = parseInt(dateRange) || 7;
    const botDetections = Array.from({ length: days }, (_, i) => {
      const totalRequests = Math.floor(Math.random() * 100000) + 50000;
      const botRequests = Math.floor(totalRequests * (Math.random() * 0.08 + 0.02));
      return {
        date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
        totalRequests,
        botRequests,
        sophisticatedBots: Math.floor(botRequests * 0.3),
        simpleBots: Math.floor(botRequests * 0.5),
        dataCenter: Math.floor(botRequests * 0.2),
      };
    });

    const clickFarms = Array.from(store.ipReputations.values())
      .filter(ip => ip.riskScore > 50)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    const viewability = ['Feed', 'Stories', 'Sidebar', 'In-Stream', 'Audience Network'].map(placement => ({
      placement,
      viewableImpressions: Math.floor(Math.random() * 500000) + 100000,
      totalImpressions: Math.floor(Math.random() * 700000) + 150000,
      viewabilityRate: Math.floor(Math.random() * 30) + 60,
      avgViewDuration: Math.floor(Math.random() * 20) + 5,
    }));

    return {
      metrics: {
        invalidTrafficRate: Math.random() * 5 + 1,
        invalidTrafficChange: (Math.random() - 0.5) * 4,
        botDetections: botDetections.reduce((s, d) => s + d.botRequests, 0),
        botDetectionsChange: Math.floor((Math.random() - 0.5) * 20),
        clickFarmIPs: clickFarms.length,
        blockedImpressions: Math.floor(Math.random() * 50000),
        viewabilityScore: Math.floor(Math.random() * 15) + 75,
        viewabilityChange: Math.floor((Math.random() - 0.3) * 10),
        savedBudget: Math.floor(Math.random() * 5000) + 500,
      },
      botDetections,
      clickFarms,
      alerts: store.alerts.filter(a => !a.resolved).slice(0, 20),
      viewability,
    };
  }

  async blockIP(ip: string): Promise<void> {
    store.blockedIPs.add(ip);
    const rep = store.ipReputations.get(ip);
    if (rep) rep.blockedAt = new Date().toISOString();
  }

  async isBlocked(ip: string): Promise<boolean> {
    return store.blockedIPs.has(ip);
  }

  async trackViewability(event: ViewabilityEvent): Promise<void> {
    event.isViewable = event.viewablePixels >= event.totalPixels * 0.5 && event.viewDuration >= 1000;
    store.viewabilityEvents.push(event);
    if (store.viewabilityEvents.length > 50000) store.viewabilityEvents = store.viewabilityEvents.slice(-25000);
  }

  async createAlert(alert: Omit<FraudAlert, 'id' | 'timestamp' | 'resolved'>): Promise<FraudAlert> {
    const newAlert: FraudAlert = { ...alert, id: `alert_${Date.now()}`, timestamp: new Date().toISOString(), resolved: false };
    store.alerts.push(newAlert);
    return newAlert;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = store.alerts.find(a => a.id === alertId);
    if (alert) alert.resolved = true;
  }
}

export const fraudService = new FraudService();
