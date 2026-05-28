// prettier-ignore
export type AppStore = 'ios' | 'android';
// prettier-ignore
export type SubmissionStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
// prettier-ignore
export interface LaunchGate { name: string; required: boolean; passed: boolean }
// prettier-ignore
export interface LaunchChecklist { gates: LaunchGate[]; allHardGatesPassed: boolean; readyToLaunch: boolean }
// prettier-ignore
export interface StatusIncident { id: string; title: string; severity: number; status: 'investigating' | 'identified' | 'monitoring' | 'resolved'; createdAt: number; resolvedAt?: number }
// prettier-ignore
export interface SupportTicket { id: string; userId: string; question: string; answer?: string; confidence: number; escalated: boolean; status: 'open' | 'resolved' | 'escalated' }
// prettier-ignore
export interface PressCoverage { outlet: string; title: string; url: string; sentiment: number; publishedAt: number }
