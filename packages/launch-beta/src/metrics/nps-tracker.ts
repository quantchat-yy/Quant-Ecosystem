import type { NPSSurvey, NPSScore } from '../types.js';
export class NPSTracker {
  private surveys = new Map<string, NPSSurvey>();
  submitSurvey(userId: string, score: number, comment: string): NPSSurvey | null {
    if (score < 0 || score > 10) return null;
    const s: NPSSurvey = { id: crypto.randomUUID(), userId, score, comment, timestamp: Date.now() };
    this.surveys.set(s.id, s);
    return s;
  }
  calculateNPS(items?: NPSSurvey[]): NPSScore {
    const list = items ?? [...this.surveys.values()];
    let promoters = 0,
      passives = 0,
      detractors = 0;
    for (const s of list) {
      if (s.score >= 9) promoters++;
      else if (s.score >= 7) passives++;
      else detractors++;
    }
    const total = list.length || 1;
    const score = Math.round(((promoters - detractors) / total) * 100);
    return { score, promoters, passives, detractors, responseCount: list.length };
  }
  // prettier-ignore
  meetsTarget(score: number) { return score >= 40; }
  getSegmentedScores(cohort: string, userCohorts: Map<string, string>): NPSScore {
    const filtered = [...this.surveys.values()].filter((s) => userCohorts.get(s.userId) === cohort);
    return this.calculateNPS(filtered);
  }
}
