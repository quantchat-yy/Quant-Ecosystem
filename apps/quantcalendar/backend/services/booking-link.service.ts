import { createAppError } from '@quant/server-core';

export interface BookingLink {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  duration: number;
  availableDays: number[];
  startHour: number;
  endHour: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface BookerInfo {
  name: string;
  email: string;
  notes?: string;
}

export interface CreateBookingLinkInput {
  userId: string;
  slug: string;
  title: string;
  description?: string;
  duration: number;
  availableDays?: number[];
  startHour?: number;
  endHour?: number;
}

export interface PrismaClient {
  bookingLink: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

export class BookingLinkService {
  constructor(private readonly prisma: PrismaClient) {}

  async createBookingLink(input: CreateBookingLinkInput): Promise<BookingLink> {
    const now = new Date();
    const link = await this.prisma.bookingLink.create({
      data: {
        userId: input.userId,
        slug: input.slug,
        title: input.title,
        description: input.description ?? '',
        duration: input.duration,
        availableDays: JSON.stringify(input.availableDays ?? [1, 2, 3, 4, 5]),
        startHour: input.startHour ?? 9,
        endHour: input.endHour ?? 17,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toBookingLink(link);
  }

  async getBookingLink(slug: string): Promise<BookingLink> {
    const link = await this.prisma.bookingLink.findUnique({ where: { slug } });

    if (!link) {
      throw createAppError('Booking link not found', 404, 'BOOKING_LINK_NOT_FOUND');
    }

    return this.toBookingLink(link);
  }

  async getAvailableSlots(slug: string, date: Date): Promise<BookingSlot[]> {
    const link = await this.getBookingLink(slug);

    const availableDays = link.availableDays;
    const dayOfWeek = date.getDay();

    if (!availableDays.includes(dayOfWeek)) {
      return [];
    }

    // Get existing events for the link owner on that day
    const dayStart = new Date(date);
    dayStart.setHours(link.startHour, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(link.endHour, 0, 0, 0);

    const events = await this.prisma.event.findMany({
      where: {
        userId: link.userId,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
    });

    const busySlots = (events as Array<Record<string, unknown>>).map((e) => ({
      start: new Date(e['startTime'] as string | Date),
      end: new Date(e['endTime'] as string | Date),
    }));

    // Generate time slots for the day
    const slots: BookingSlot[] = [];
    const slotDuration = link.duration * 60 * 1000;
    let current = dayStart.getTime();

    while (current + slotDuration <= dayEnd.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current + slotDuration);

      const isBooked = busySlots.some((busy) => busy.start < slotEnd && busy.end > slotStart);

      slots.push({
        start: slotStart,
        end: slotEnd,
        available: !isBooked,
      });

      current += slotDuration;
    }

    return slots;
  }

  async confirmBooking(slug: string, slot: Date, bookerInfo: BookerInfo): Promise<unknown> {
    const link = await this.getBookingLink(slug);

    const startTime = new Date(slot);
    const endTime = new Date(startTime.getTime() + link.duration * 60 * 1000);

    // Check for conflicting events before creating to prevent double-booking
    const existingEvents = await this.prisma.event.findMany({
      where: {
        userId: link.userId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    // Also check for events that overlap with the requested slot
    const overlapping = (existingEvents as Array<Record<string, unknown>>).some((e) => {
      const eStart = new Date(e['startTime'] as string | Date);
      const eEnd = new Date(e['endTime'] as string | Date);
      return eStart < endTime && eEnd > startTime;
    });

    if (overlapping) {
      throw createAppError('Slot is no longer available', 409, 'SLOT_UNAVAILABLE');
    }

    const now = new Date();

    const event = await this.prisma.event.create({
      data: {
        title: `${link.title} with ${bookerInfo.name}`,
        description: bookerInfo.notes ?? '',
        startTime,
        endTime,
        allDay: false,
        location: '',
        userId: link.userId,
        attendees: JSON.stringify([
          { userId: '', email: bookerInfo.email, name: bookerInfo.name, status: 'accepted' },
        ]),
        recurrenceRule: null,
        status: 'confirmed',
        reminders: JSON.stringify([{ type: 'email', minutesBefore: 15 }]),
        createdAt: now,
        updatedAt: now,
      },
    });

    return event;
  }

  async listBookings(userId: string): Promise<BookingLink[]> {
    const links = await this.prisma.bookingLink.findMany({
      where: { userId },
    });

    return links.map((l) => this.toBookingLink(l));
  }

  private toBookingLink(raw: unknown): BookingLink {
    const record = raw as Record<string, unknown>;
    return {
      id: record['id'] as string,
      userId: record['userId'] as string,
      slug: record['slug'] as string,
      title: record['title'] as string,
      description: (record['description'] as string) ?? '',
      duration: record['duration'] as number,
      availableDays:
        typeof record['availableDays'] === 'string'
          ? JSON.parse(record['availableDays'] as string)
          : ((record['availableDays'] as number[]) ?? [1, 2, 3, 4, 5]),
      startHour: (record['startHour'] as number) ?? 9,
      endHour: (record['endHour'] as number) ?? 17,
      isActive: (record['isActive'] as boolean) ?? true,
      createdAt: new Date(record['createdAt'] as string | Date),
      updatedAt: new Date(record['updatedAt'] as string | Date),
    };
  }
}
