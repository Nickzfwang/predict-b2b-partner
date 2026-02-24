import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), '.runtime', 'webhook-events.json');

export async function GET() {
  try {
    const content = await readFile(STORE_PATH, 'utf8');
    return new NextResponse(content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({
      processed_event_ids: [],
      trade_created: [],
      user_balance_changed: [],
      position_settled: [],
      updated_at: null,
    });
  }
}
