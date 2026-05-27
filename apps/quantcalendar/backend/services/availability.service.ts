export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface PrismaClient {
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

export class AvailabilityService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAvailability(
    userId: string,
    date: Date,
    workingHoursStart: number,
    workingHoursEnd: number,
  ): Promise<TimeSlot[]> {
    const dayStart = new Date(date);
    dayStart.setHours(workingHoursStart, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(workingHoursEnd, 0, 0, 0);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      orderBy: { startTime: 'asc' },
    });

    return this.computeFreeSlots(events, dayStart, dayEnd);
  }

  async findFreeSlots(userIds: string[], date: Date, duration: number): Promise<TimeSlot[]> {
    return this.checkMultiUserAvailability(userIds, date, duration);
  }

  async checkConflicts(userId: string, start: Date, end: Date): Promise<boolean> {
    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    return events.length > 0;
  }

  async checkMultiUserAvailability(
    userIds: string[],
    date: Date,
    duration: number,
  ): Promise<TimeSlot[]> {
    const workingHoursStart = 9;
    const workingHoursEnd = 17;

    // Get availability for each user
    const availabilities: TimeSlot[][] = [];
    for (const userId of userIds) {
      const slots = await this.getAvailability(userId, date, workingHoursStart, workingHoursEnd);
      availabilities.push(slots);
    }

    if (availabilities.length === 0) return [];

    // Find common free slots
    let commonSlots = availabilities[0]!;
    for (let i = 1; i < availabilities.length; i++) {
      commonSlots = this.intersectSlots(commonSlots, availabilities[i]!);
    }

    // Filter by minimum duration
    const durationMs = duration * 60 * 1000;
    return commonSlots.filter((slot) => slot.end.getTime() - slot.start.getTime() >= durationMs);
  }

  private computeFreeSlots(events: unknown[], dayStart: Date, dayEnd: Date): TimeSlot[] {
    const busySlots = events
      .map((e) => {
        const record = e as Record<string, unknown>;
        return {
          start: new Date(record['startTime'] as string | Date),
          end: new Date(record['endTime'] as string | Date),
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const freeSlots: TimeSlot[] = [];
    let current = dayStart.getTime();

    for (const busy of busySlots) {
      if (busy.start.getTime() > current) {
        freeSlots.push({
          start: new Date(current),
          end: new Date(busy.start),
        });
      }
      if (busy.end.getTime() > current) {
        current = busy.end.getTime();
      }
    }

    if (current < dayEnd.getTime()) {
      freeSlots.push({
        start: new Date(current),
        end: new Date(dayEnd),
      });
    }

    return freeSlots;
  }

  private intersectSlots(slotsA: TimeSlot[], slotsB: TimeSlot[]): TimeSlot[] {
    const result: TimeSlot[] = [];
    let i = 0;
    let j = 0;

    while (i < slotsA.length && j < slotsB.length) {
      const a = slotsA[i]!;
      const b = slotsB[j]!;

      const overlapStart = Math.max(a.start.getTime(), b.start.getTime());
      const overlapEnd = Math.min(a.end.getTime(), b.end.getTime());

      if (overlapStart < overlapEnd) {
        result.push({
          start: new Date(overlapStart),
          end: new Date(overlapEnd),
        });
      }

      if (a.end.getTime() < b.end.getTime()) {
        i++;
      } else {
        j++;
      }
    }

    return result;
  }
}
