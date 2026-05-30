import { NextRequest, NextResponse } from 'next/server';
import { CrossAppSearchService } from '@quant/search';

const searchService = new CrossAppSearchService();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') || '';
  const apps = searchParams.get('apps')?.split(',') || undefined;
  const limit = Number(searchParams.get('limit') || '20');

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Query parameter "q" is required', code: 'VALIDATION_ERROR' },
      },
      { status: 400 },
    );
  }

  try {
    const results = searchService.search(query, { apps, limit });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Search failed',
          code: 'SEARCH_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
