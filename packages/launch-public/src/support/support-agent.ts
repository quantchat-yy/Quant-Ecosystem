import type { SupportTicket } from '../types.js';

export class QuantCoach {
  private faqs: Map<string, string> = new Map();
  private tickets: Map<string, SupportTicket> = new Map();
  private counter = 0;
  private threshold = 0.6;

  addFAQ(question: string, answer: string) {
    this.faqs.set(question.toLowerCase(), answer);
  }

  askQuestion(userId: string, question: string): SupportTicket {
    const id = `ticket-${++this.counter}`;
    const { answer, confidence } = this.matchFAQ(question);
    const escalated = confidence < this.threshold;
    const ticket: SupportTicket = {
      id,
      userId,
      question,
      confidence,
      escalated,
      status: escalated ? 'escalated' : 'open',
      ...(answer && !escalated ? { answer } : {}),
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  resolveTicket(id: string, answer: string) {
    const t = this.tickets.get(id);
    if (t) {
      t.answer = answer;
      t.status = 'resolved';
      t.escalated = false;
    }
  }

  getOpenTickets(): SupportTicket[] {
    return [...this.tickets.values()].filter((t) => t.status === 'open');
  }
  getEscalated(): SupportTicket[] {
    return [...this.tickets.values()].filter((t) => t.status === 'escalated');
  }

  private matchFAQ(question: string): { answer?: string; confidence: number } {
    const q = question.toLowerCase();
    let best = { answer: undefined as string | undefined, confidence: 0 };
    for (const [faqQ, faqA] of this.faqs) {
      const words = q.split(/\s+/);
      const matches = words.filter((w) => faqQ.includes(w)).length;
      const confidence = words.length > 0 ? matches / words.length : 0;
      if (confidence > best.confidence) best = { answer: faqA, confidence };
    }
    return best;
  }
}
