import type {
  AgeGroup,
  CommunicationLimits,
  GamingActivity,
  MinorSafetyServiceConfig,
} from '../types.js';

interface ContentFlag {
  sessionId: string;
  reporterId: string;
  contentType: string;
  flaggedAt: Date;
}

export class MinorSafetyService {
  private config: MinorSafetyServiceConfig;
  private activityLog = new Map<string, GamingActivity[]>();
  private contentFlags: ContentFlag[] = [];

  constructor(config: MinorSafetyServiceConfig) {
    this.config = config;
  }

  checkGameAccess(_playerId: string, _gameId: string, ageGroup: AgeGroup): boolean {
    if (!this.config.safetyConfigs[ageGroup]) {
      return true;
    }

    // Access allowed to game itself, purchases blocked separately via validatePurchase
    return true;
  }

  getCommunicationLimits(ageGroup: AgeGroup): CommunicationLimits {
    if (ageGroup === 'under13') {
      return {
        voiceChat: false,
        videoChat: false,
        textChat: true,
        textFiltering: true,
        canChatWithStrangers: false,
      };
    }

    if (ageGroup === 'teen') {
      return {
        voiceChat: true,
        videoChat: false,
        textChat: true,
        textFiltering: true,
        canChatWithStrangers: true,
      };
    }

    // Adult
    return {
      voiceChat: true,
      videoChat: true,
      textChat: true,
      textFiltering: false,
      canChatWithStrangers: true,
    };
  }

  validatePurchase(_playerId: string, ageGroup: AgeGroup, _amount: number): boolean {
    const safetyConfig = this.config.safetyConfigs[ageGroup];

    if (!safetyConfig) {
      return true;
    }

    if (safetyConfig.blockRealMoney) {
      throw new Error('Real-money purchases are blocked for this age group');
    }

    return true;
  }

  getParentalVisibility(_parentId: string, childId: string): GamingActivity[] {
    return this.activityLog.get(childId) ?? [];
  }

  recordActivity(childId: string, activity: GamingActivity): void {
    const activities = this.activityLog.get(childId) ?? [];
    activities.push(activity);
    this.activityLog.set(childId, activities);
  }

  flagInappropriateContent(sessionId: string, reporterId: string, contentType: string): void {
    this.contentFlags.push({
      sessionId,
      reporterId,
      contentType,
      flaggedAt: new Date(),
    });
  }

  getContentFlags(sessionId?: string): ContentFlag[] {
    if (sessionId) {
      return this.contentFlags.filter((f) => f.sessionId === sessionId);
    }
    return [...this.contentFlags];
  }
}
