import { User, Task, DailyWorkLog, TokenTransaction, RewardClaim } from '../types';

/**
 * Clean & Fresh Bureau Initialization Data
 * Default Master Administrator: admin / password
 * All tasks, routines, token transactions, and reward claims start at 0.
 */
export const INITIAL_USERS: User[] = [];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_LOGS: DailyWorkLog[] = [];

export const INITIAL_TOKEN_TRANSACTIONS: TokenTransaction[] = [];

export const INITIAL_REWARD_CLAIMS: RewardClaim[] = [];
