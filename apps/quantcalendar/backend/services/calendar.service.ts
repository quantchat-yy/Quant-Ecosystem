// ============================================================================
// QuantCalendar - Calendar Service
// ============================================================================
//
// A user's calendars (groupings of events). Backs the previously-dead
// /calendars proxy. A user always has at least a "Primary" calendar, which is
// auto-provisioned on first access. DI'd narrow prisma for testability.

export interface CalendarView {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  isPrimary: boolean;
}

export interface CalendarPrisma {
  calendar: {
    findMany: (args: Record<string, unknown>) => Promise<any[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<any>;
  };
}

export class CalendarService {
  constructor(private readonly prisma: CalendarPrisma) {}

  /** The user's calendars; auto-provisions a Primary calendar if none exist. */
  async listCalendars(userId: string): Promise<CalendarView[]> {
    const rows = await this.prisma.calendar.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (rows.length === 0) {
      const primary = await this.prisma.calendar.create({
        data: { userId, name: 'Primary', color: '#fffc00', isPrimary: true },
      });
      return [this.toView(primary)];
    }

    return rows.map((r) => this.toView(r));
  }

  async createCalendar(
    userId: string,
    input: { name: string; color?: string },
  ): Promise<CalendarView> {
    const row = await this.prisma.calendar.create({
      data: { userId, name: input.name, color: input.color ?? null, isPrimary: false },
    });
    return this.toView(row);
  }

  private toView(row: Record<string, unknown>): CalendarView {
    return {
      id: String(row['id']),
      userId: String(row['userId']),
      name: String(row['name']),
      color: (row['color'] as string | null) ?? null,
      isPrimary: Boolean(row['isPrimary']),
    };
  }
}
