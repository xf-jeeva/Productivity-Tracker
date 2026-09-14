import { User, Task, DailyWorkLog, TokenTransaction, RewardClaim } from '../types';

/**
 * Clean & Fresh Bureau Initialization Data
 * Default Master Administrator: admin / password
 * All tasks, routines, token transactions, and reward claims start at 0.
 */
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'password',
    name: 'Bureau Administrator',
    email: 'admin@dailybureau.org',
    role: 'admin',
    title: 'Chief Bureau Administrator & Master Inspector',
    department: 'Dispatch & Logistics',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    deskNumber: 'Office No. 01 — Executive Quarters',
    signature: 'E. Sterling, Bureau Chief',
    createdAt: '2026-09-01T08:00:00Z',
  },
];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_LOGS: DailyWorkLog[] = [];

export const INITIAL_TOKEN_TRANSACTIONS: TokenTransaction[] = [];

export const INITIAL_REWARD_CLAIMS: RewardClaim[] = [];
