/**
 * Seamless Wallet 餘額管理 — 檔案持久化
 *
 * 模擬商戶端的用戶錢包，PM 平台透過 callback 呼叫 debit/credit/rollback/getBalance。
 * 使用 .runtime/seamless-balances.json 持久化（與 webhook-event-store.ts 相同模式）。
 *
 * SERVER-SIDE ONLY
 */

import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SeamlessTransaction {
  transaction_id: string;
  action: 'getBalance' | 'debit' | 'credit' | 'rollback';
  external_user_id: string;
  amount: number;
  balance_after: number;
  timestamp: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface StoreState {
  balances: Record<string, number>;
  transactions: SeamlessTransaction[];
  processed_transaction_ids: string[];
  updated_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BALANCE = 1000;
const MAX_TRANSACTIONS = 1000;
const MAX_PROCESSED_IDS = 5000;

const STORE_DIR = path.join(process.cwd(), '.runtime');
const STORE_PATH = path.join(STORE_DIR, 'seamless-balances.json');
const TMP_PATH = `${STORE_PATH}.tmp`;

// ─── State I/O ───────────────────────────────────────────────────────────────

function defaultState(): StoreState {
  return {
    balances: {},
    transactions: [],
    processed_transaction_ids: [],
    updated_at: new Date().toISOString(),
  };
}

async function readState(): Promise<StoreState> {
  try {
    const content = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(content) as Partial<StoreState>;

    return {
      balances: typeof parsed.balances === 'object' && parsed.balances !== null
        ? parsed.balances as Record<string, number>
        : {},
      transactions: Array.isArray(parsed.transactions)
        ? (parsed.transactions as SeamlessTransaction[])
        : [],
      processed_transaction_ids: Array.isArray(parsed.processed_transaction_ids)
        ? parsed.processed_transaction_ids.filter((v): v is string => typeof v === 'string')
        : [],
      updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : new Date().toISOString(),
    };
  } catch {
    return defaultState();
  }
}

async function writeState(state: StoreState): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(TMP_PATH, JSON.stringify(state, null, 2), 'utf8');
  await rename(TMP_PATH, STORE_PATH);
}

function capArray<T>(arr: T[], max: number): T[] {
  return arr.length > max ? arr.slice(arr.length - max) : arr;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getBalance(externalUserId: string): Promise<number> {
  const state = await readState();
  return state.balances[externalUserId] ?? DEFAULT_BALANCE;
}

export async function debit(
  externalUserId: string,
  amount: number,
  transactionId: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<{ status: 'ok' | 'error'; balance: number; error_code?: string }> {
  const state = await readState();

  // 冪等性：同一 transaction_id 不重複處理
  if (state.processed_transaction_ids.includes(transactionId)) {
    const existing = state.transactions.find((t) => t.transaction_id === transactionId);
    return { status: 'ok', balance: existing?.balance_after ?? (state.balances[externalUserId] ?? DEFAULT_BALANCE) };
  }

  const current = state.balances[externalUserId] ?? DEFAULT_BALANCE;
  if (current < amount) {
    return { status: 'error', balance: current, error_code: 'INSUFFICIENT_FUNDS' };
  }

  const newBalance = current - amount;
  state.balances[externalUserId] = newBalance;
  state.processed_transaction_ids = capArray([...state.processed_transaction_ids, transactionId], MAX_PROCESSED_IDS);
  state.transactions = capArray([...state.transactions, {
    transaction_id: transactionId,
    action: 'debit',
    external_user_id: externalUserId,
    amount,
    balance_after: newBalance,
    timestamp: new Date().toISOString(),
    description,
    metadata,
  }], MAX_TRANSACTIONS);
  state.updated_at = new Date().toISOString();

  await writeState(state);
  return { status: 'ok', balance: newBalance };
}

export async function credit(
  externalUserId: string,
  amount: number,
  transactionId: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<{ status: 'ok'; balance: number }> {
  const state = await readState();

  // 冪等性
  if (state.processed_transaction_ids.includes(transactionId)) {
    const existing = state.transactions.find((t) => t.transaction_id === transactionId);
    return { status: 'ok', balance: existing?.balance_after ?? (state.balances[externalUserId] ?? DEFAULT_BALANCE) };
  }

  const current = state.balances[externalUserId] ?? DEFAULT_BALANCE;
  const newBalance = current + amount;
  state.balances[externalUserId] = newBalance;
  state.processed_transaction_ids = capArray([...state.processed_transaction_ids, transactionId], MAX_PROCESSED_IDS);
  state.transactions = capArray([...state.transactions, {
    transaction_id: transactionId,
    action: 'credit',
    external_user_id: externalUserId,
    amount,
    balance_after: newBalance,
    timestamp: new Date().toISOString(),
    description,
    metadata,
  }], MAX_TRANSACTIONS);
  state.updated_at = new Date().toISOString();

  await writeState(state);
  return { status: 'ok', balance: newBalance };
}

export async function rollback(
  externalUserId: string,
  amount: number,
  transactionId: string,
  originalTransactionId: string,
  reason?: string,
): Promise<{ status: 'ok'; balance: number }> {
  const state = await readState();

  // 冪等性
  if (state.processed_transaction_ids.includes(transactionId)) {
    const existing = state.transactions.find((t) => t.transaction_id === transactionId);
    return { status: 'ok', balance: existing?.balance_after ?? (state.balances[externalUserId] ?? DEFAULT_BALANCE) };
  }

  const current = state.balances[externalUserId] ?? DEFAULT_BALANCE;
  const newBalance = current + amount;
  state.balances[externalUserId] = newBalance;
  state.processed_transaction_ids = capArray([...state.processed_transaction_ids, transactionId], MAX_PROCESSED_IDS);
  state.transactions = capArray([...state.transactions, {
    transaction_id: transactionId,
    action: 'rollback',
    external_user_id: externalUserId,
    amount,
    balance_after: newBalance,
    timestamp: new Date().toISOString(),
    description: reason,
    metadata: { original_transaction_id: originalTransactionId },
  }], MAX_TRANSACTIONS);
  state.updated_at = new Date().toISOString();

  await writeState(state);
  return { status: 'ok', balance: newBalance };
}

/** 記錄 getBalance 查詢（供交易紀錄顯示用） */
export async function logGetBalance(
  externalUserId: string,
  transactionId: string,
): Promise<number> {
  const state = await readState();
  const balance = state.balances[externalUserId] ?? DEFAULT_BALANCE;

  // 初始化餘額（首次查詢時）
  if (!(externalUserId in state.balances)) {
    state.balances[externalUserId] = DEFAULT_BALANCE;
  }

  state.transactions = capArray([...state.transactions, {
    transaction_id: transactionId,
    action: 'getBalance',
    external_user_id: externalUserId,
    amount: 0,
    balance_after: balance,
    timestamp: new Date().toISOString(),
  }], MAX_TRANSACTIONS);
  state.updated_at = new Date().toISOString();

  await writeState(state);
  return balance;
}

/** 查詢交易紀錄 */
export async function getTransactions(externalUserId?: string): Promise<SeamlessTransaction[]> {
  const state = await readState();
  if (externalUserId) {
    return state.transactions.filter((t) => t.external_user_id === externalUserId);
  }
  return state.transactions;
}

/** 查詢所有用戶餘額 */
export async function getAllBalances(): Promise<Array<{ user: string; balance: number }>> {
  const state = await readState();
  return Object.entries(state.balances).map(([user, balance]) => ({ user, balance }));
}
