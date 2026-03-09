import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, getAllBalances } from '@/lib/seamless-balance-store';
import { getUserPrefix } from '@/lib/wallet-mode';

/**
 * GET /api/seamless-transactions
 *
 * 前端查詢 Seamless Wallet 的 callback 交易紀錄與餘額。
 * Query params: userId (optional) — 會自動加上 demo_seamless_ 前綴
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const prefix = getUserPrefix('seamless');
  const externalUserId = userId ? `${prefix}${userId}` : undefined;

  const [transactions, balances] = await Promise.all([
    getTransactions(externalUserId),
    getAllBalances(),
  ]);

  return NextResponse.json({ transactions, balances });
}
