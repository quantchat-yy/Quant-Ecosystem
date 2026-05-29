import type { ContentCategory } from '../types.js';

export interface CategoryPattern {
  category: ContentCategory;
  triggers: string[];
}

export const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: 'email',
    triggers: ['send', 'reply', 'email to', 'write to', 'forward to', 'cc', 'draft an email'],
  },
  {
    category: 'task',
    triggers: [
      'todo',
      'need to',
      'remind me to',
      'dont forget',
      "don't forget",
      'have to',
      'must',
      'should',
    ],
  },
  {
    category: 'idea',
    triggers: [
      'what if',
      'idea:',
      'maybe we could',
      'how about',
      'imagine',
      'brainstorm',
      'concept:',
    ],
  },
  {
    category: 'reminder',
    triggers: [
      'remind me',
      'set a reminder',
      'at 3pm',
      'tomorrow at',
      'next week',
      'in an hour',
      'alarm',
    ],
  },
  {
    category: 'question',
    triggers: ['how do', 'what is', 'why does', 'can we', 'should i', 'is there', 'look up'],
  },
  {
    category: 'note',
    triggers: ['note:', 'note that', 'jot down', 'remember that', 'for reference', 'keep in mind'],
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectCategory(text: string): { category: ContentCategory; confidence: number } {
  // Match triggers on letter boundaries so short triggers (e.g. "cc") don't
  // match inside unrelated words (e.g. "account"), while still allowing triggers
  // that end in punctuation (e.g. "note:"). Prefer the longest (most specific)
  // matching trigger across all categories.
  let best: { category: ContentCategory; triggerLength: number } | null = null;

  for (const pattern of CATEGORY_PATTERNS) {
    for (const trigger of pattern.triggers) {
      const regex = new RegExp(`(?<![A-Za-z])${escapeRegExp(trigger)}(?![A-Za-z])`, 'i');
      if (regex.test(text) && (!best || trigger.length > best.triggerLength)) {
        best = { category: pattern.category, triggerLength: trigger.length };
      }
    }
  }

  if (best) {
    return { category: best.category, confidence: 0.85 };
  }

  return { category: 'note', confidence: 0.5 };
}

export function extractDates(text: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:tomorrow|today|next week|next month|yesterday)\b/gi,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi,
    /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
  ];

  const results: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      results.push(...matches);
    }
  }
  return results;
}

export function extractPeople(text: string): string[] {
  const peoplePatterns = [
    /\b(?:to|from|cc|with|tell|ask|email)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+said|\s+mentioned|\s+asked)/g,
  ];

  const results: string[] = [];
  for (const pattern of peoplePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (name) {
        results.push(name);
      }
    }
  }
  return [...new Set(results)];
}

export function extractActions(text: string): string[] {
  const actionPatterns = [
    /\b(?:need to|have to|must|should|going to|will)\s+([^,.!?]+)/gi,
    /\b(?:todo|task):\s*([^,.!?]+)/gi,
  ];

  const results: string[] = [];
  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const action = match[1]?.trim();
      if (action) {
        results.push(action);
      }
    }
  }
  return results;
}

export function extractTopics(text: string): string[] {
  const topicPatterns = [
    /\b(?:about|regarding|re:|topic:)\s+([^,.!?]+)/gi,
    /\b(?:project|meeting|call|discussion)\s+(?:about|on|for)\s+([^,.!?]+)/gi,
  ];

  const results: string[] = [];
  for (const pattern of topicPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const topic = match[1]?.trim();
      if (topic) {
        results.push(topic);
      }
    }
  }
  return results;
}
