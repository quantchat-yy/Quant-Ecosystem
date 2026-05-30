import { NextRequest, NextResponse } from 'next/server';
import { NotificationFanout, PreferenceService } from '@quant/notifications';
import type { FanoutEvent } from '@quant/notifications';

// Create a preference service that always allows delivery for admin broadcasts
const preferenceService = new PreferenceService();
const fanout = new NotificationFanout(preferenceService);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, recipientIds, priority = 'normal' } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'title and body are required', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      );
    }

    const event: FanoutEvent = {
      type: 'system',
      sourceApp: 'admin',
      title,
      body: messageBody,
      recipientIds: recipientIds || [],
      priority,
    };

    const result = fanout.fanout(event);

    return NextResponse.json({
      success: true,
      data: {
        dispatched: true,
        totalRecipients: result.totalRecipients,
        routedCount: result.routedCount,
        blockedCount: result.blockedCount,
        broadcastAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to broadcast',
          code: 'BROADCAST_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
