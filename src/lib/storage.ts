'use client';

import { User, Task, DailyWorkLog, Role, TokenTransaction, RewardClaim, PayoutMethod, ClaimStatus, StickyNote, StickyColor } from '../types';
import { INITIAL_USERS, INITIAL_TASKS, INITIAL_LOGS, INITIAL_TOKEN_TRANSACTIONS, INITIAL_REWARD_CLAIMS } from './mockData';
import { pushCloudUsers, deleteCloudUser, isSupabaseConfigured } from './cloudUsers';

const USERS_KEY = 'daily_bureau_users_v3';
const TASKS_KEY = 'daily_bureau_tasks_v3';
const LOGS_KEY = 'daily_bureau_logs_v3';
const CURRENT_USER_KEY = 'daily_bureau_current_user_v3';
const SOUND_ENABLED_KEY = 'daily_bureau_sound_enabled_v3';
const TOKEN_TRANSACTIONS_KEY = 'daily_bureau_token_transactions_v3';
const REWARD_CLAIMS_KEY = 'daily_bureau_reward_claims_v3';
const STICKY_NOTES_KEY = 'daily_bureau_sticky_notes_v3';

export const BUREAU_SYNC_EVENT = 'daily_bureau_sync_event';
export const TOKEN_AWARD_EVENT = 'daily_bureau_token_awarded';

function emitSync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
  }
}

const isBrowser = typeof window !== 'undefined';

// Auto-purge legacy mock data from older versions to ensure a completely fresh bureau
if (isBrowser) {
  try {
    const legacyKeys = [
      'daily_bureau_users',
      'daily_bureau_tasks',
      'daily_bureau_logs',
      'daily_bureau_current_user',
      'daily_bureau_token_transactions',
      'daily_bureau_reward_claims',
      'daily_bureau_users_v2',
      'daily_bureau_tasks_v2',
      'daily_bureau_logs_v2',
      'daily_bureau_current_user_v2',
      'daily_bureau_token_transactions_v2',
      'daily_bureau_reward_claims_v2',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error('Legacy storage purge error:', err);
  }
}

// ==================== USERS & AUTH ====================
export function getUsers(): User[] {
  if (!isBrowser) return INITIAL_USERS;
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    const parsed: User[] = JSON.parse(stored);
    // Ensure default admin always exists with correct credentials if missing
    const hasAdmin = parsed.some((u) => u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      parsed.unshift(INITIAL_USERS[0]);
      localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_USERS;
  }
}

export function getUserById(id: string): User | undefined {
  const users = getUsers();
  return users.find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  const users = getUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
}

export function getCurrentUser(): User | null {
  if (!isBrowser) return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null; // No session — must login manually
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (!isBrowser) return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  emitSync();
}

export function login(usernameInput: string, passwordInput: string): { success: boolean; error?: string; user?: User } {
  const trimmedUser = usernameInput.trim().toLowerCase();
  const trimmedPass = passwordInput.trim();

  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === trimmedUser);

  if (!user) {
    return { success: false, error: `Artisan or Officer '${usernameInput}' was not found in the Bureau Registry.` };
  }

  if (user.password !== trimmedPass) {
    return { success: false, error: 'Incorrect authorization passkey. Please verify your credentials.' };
  }

  setCurrentUser(user);
  return { success: true, user };
}

export function logout(): void {
  setCurrentUser(null);
}

export function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: Role;
  department?: string;
  title?: string;
}): { success: boolean; error?: string; user?: User } {
  const users = getUsers();
  const trimmedUsername = data.username.trim().toLowerCase();

  if (!trimmedUsername) {
    return { success: false, error: 'Username cannot be blank.' };
  }

  if (!data.password || data.password.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters.' };
  }

  if (users.some((u) => u.username.toLowerCase() === trimmedUsername)) {
    return { success: false, error: `Username '${data.username}' is already registered in the Bureau.` };
  }

  const initials = data.name.trim().split(' ').map((n) => n[0]).join('. ');

  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: trimmedUsername,
    password: data.password.trim(),
    name: data.name.trim() || data.username,
    role: data.role,
    title: data.title?.trim() || (data.role === 'admin' ? 'Bureau Administrator' : 'Craftsman / Specialist'),
    department: data.department || 'Atelier & Craft',
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    deskNumber: `Desk No. ${Math.floor(Math.random() * 30 + 10)} — North Atelier`,
    signature: `${initials}, Appr.`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  if (isBrowser) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  // Sync to Firebase so all devices see this new user
  if (isSupabaseConfigured) {
    pushCloudUsers(users).catch(() => {/* silently ignore */});
  }
  emitSync();
  return { success: true, user: newUser };
}

export function addUser(user: User): void {
  createUser({
    username: user.username,
    password: user.password,
    name: user.name,
    role: user.role,
    department: user.department,
    title: user.title,
  });
}

export function updateUserRole(userId: string, newRole: Role): boolean {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  users[index].role = newRole;
  if (isBrowser) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  const current = getCurrentUser();
  if (current && current.id === userId) {
    current.role = newRole;
    setCurrentUser(current);
  }

  if (isSupabaseConfigured) pushCloudUsers(users).catch(() => {});
  emitSync();
  return true;
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  users[index].password = newPassword;
  if (isBrowser) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  const current = getCurrentUser();
  if (current && current.id === userId) {
    current.password = newPassword;
    setCurrentUser(current);
  }

  if (isSupabaseConfigured) pushCloudUsers(users).catch(() => {});
  emitSync();
  return true;
}

export function deleteUser(userIdentifier: string): { success: boolean; error?: string } {
  const users = getUsers();
  const target = users.find(
    (u) => u.id === userIdentifier || u.username.toLowerCase() === userIdentifier.toLowerCase().trim()
  );
  if (!target) {
    return { success: false, error: 'User was not found in the Bureau Registry.' };
  }
  if (target.username.toLowerCase() === 'admin') {
    return { success: false, error: 'Cannot delete the master admin account.' };
  }

  const filtered = users.filter(
    (u) => u.id !== target.id && u.username.toLowerCase() !== target.username.toLowerCase()
  );
  if (isBrowser) {
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  }

  const current = getCurrentUser();
  if (current && (current.id === target.id || current.username.toLowerCase() === target.username.toLowerCase())) {
    setCurrentUser(null);
  }

  // Sync deletion to Firebase
  if (isSupabaseConfigured) {
    deleteCloudUser(target.id).catch(() => {/* silently ignore */});
  }

  emitSync();
  return { success: true };
}

// ==================== TASKS ====================
export function getTasks(): Task[] {
  if (!isBrowser) return INITIAL_TASKS;
  const stored = localStorage.getItem(TASKS_KEY);
  if (!stored) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_TASKS;
  }
}

export function getTaskById(id: string): Task | undefined {
  const tasks = getTasks();
  return tasks.find((t) => t.id === id);
}

export function createTask(taskData: {
  title: string;
  description: string;
  itemType?: 'task' | 'routine';
  reminderTime?: string;
  category?: string;
  priority?: 'routine' | 'urgent' | 'opus';
  estimatedHours?: number;
  dueDate?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
}): Task {
  const current = getCurrentUser() || INITIAL_USERS[0];
  const tasks = getTasks();
  const maxOrder = tasks.reduce((max, t) => Math.max(max, t.orderNumber || 1000), 1047);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const newTask: Task = {
    id: `tsk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderNumber: maxOrder + 1,
    itemType: taskData.itemType || 'task',
    reminderTime: taskData.reminderTime || '',
    title: taskData.title.trim(),
    description: taskData.description?.trim() || '',
    assigneeId: current.id,
    createdById: current.id,
    createdByUsername: current.username,
    priority: taskData.priority || 'routine',
    status: 'pending',
    category: taskData.category || 'Atelier & Craft',
    estimatedHours: taskData.estimatedHours || 2.0,
    subtasks: taskData.subtasks || [],
    dueDate: taskData.dueDate || tomorrow.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tasks[index] = { ...tasks[index], ...updates };
  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
  return tasks[index];
}

export function toggleSubTask(taskId: string, subtaskId: string): void {
  const tasks = getTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.subtasks = task.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st
  );

  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
}

export function markTaskComplete(taskId: string, completedByUsername?: string): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const currentStatus = tasks[index].status;
  const isNowComplete = currentStatus !== 'completed';
  const currentUser = getCurrentUser();
  const taskUsername = completedByUsername || currentUser?.username || tasks[index].createdByUsername || 'user';

  if (isNowComplete) {
    const tokensAwarded = tasks[index].priority === 'opus' ? 2 : 1;
    tasks[index] = {
      ...tasks[index],
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: taskUsername,
      tokenAwarded: true,
      tokensEarned: tokensAwarded,
    };

    if (isBrowser) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }

    awardTokensForTask(taskId, taskUsername, tokensAwarded);
  } else {
    if (tasks[index].tokenAwarded) {
      revokeTokensForTask(taskId, taskUsername);
    }

    tasks[index] = {
      ...tasks[index],
      status: 'pending',
      completedAt: undefined,
      completedBy: undefined,
      tokenAwarded: false,
      tokensEarned: 0,
    };

    if (isBrowser) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
    emitSync();
  }

  return tasks[index];
}


/**
 * Soft delete: sets status to 'deleted', stores deletedAt & deletedBy
 * This preserves deleted tasks for the Admin Dashboard to show per username!
 */
export function deleteTask(taskId: string, deletedByUsername?: string): boolean {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return false;

  const currentUser = getCurrentUser();

  tasks[index] = {
    ...tasks[index],
    status: 'deleted',
    deletedAt: new Date().toISOString(),
    deletedBy: deletedByUsername || currentUser?.username || currentUser?.id,
  };

  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
  return true;
}

export function restoreTask(taskId: string): boolean {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return false;

  tasks[index] = {
    ...tasks[index],
    status: 'pending',
    deletedAt: undefined,
    deletedBy: undefined,
  };

  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
  return true;
}

export function permanentDeleteTask(taskId: string): boolean {
  let tasks = getTasks();
  const initial = tasks.length;
  tasks = tasks.filter((t) => t.id !== taskId);
  if (tasks.length === initial) return false;

  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
  return true;
}

export function adminSignOff(taskId: string, adminUser: User, notes?: string): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  tasks[index] = {
    ...tasks[index],
    adminSignedOff: true,
    adminSignedAt: new Date().toISOString(),
    adminSignedBy: adminUser.id,
    adminNotes: notes || tasks[index].adminNotes || 'Inspected & Approved by Bureau Chief.',
  };

  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  emitSync();
  return tasks[index];
}

export function markTaskNotified(taskId: string, dateStr: string): void {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return;
  tasks[index].lastNotifiedDate = dateStr;
  if (isBrowser) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
}

// ==================== QUERY TASKS PER USERNAME ====================
export function getUserTasksBreakdown(username: string): {
  createdTasks: Task[];
  routines: Task[];
  completedTasks: Task[];
  deletedTasks: Task[];
} {
  const allTasks = getTasks();
  const lowerUser = username.toLowerCase().trim();

  // Tasks created by this user
  const userTasks = allTasks.filter((t) => {
    const creatorMatches = (t.createdByUsername && t.createdByUsername.toLowerCase() === lowerUser);
    const assigneeMatches = (t.assigneeId === username || t.createdById === username);
    return creatorMatches || assigneeMatches;
  });

  const activeItems = userTasks.filter((t) => t.status === 'pending' || t.status === 'in-progress');

  return {
    // Active daily tasks
    createdTasks: activeItems.filter((t) => t.itemType !== 'routine'),
    // Active daily routines
    routines: activeItems.filter((t) => t.itemType === 'routine'),
    // Completed tasks and routines
    completedTasks: userTasks.filter((t) => t.status === 'completed'),
    // Deleted
    deletedTasks: userTasks.filter((t) => t.status === 'deleted'),
  };
}

// ==================== DAILY LOGS ====================
export function getDailyLogs(): DailyWorkLog[] {
  if (!isBrowser) return INITIAL_LOGS;
  const stored = localStorage.getItem(LOGS_KEY);
  if (!stored) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_LOGS));
    return INITIAL_LOGS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_LOGS;
  }
}

export function submitDailyLog(logData: Omit<DailyWorkLog, 'id' | 'logNumber' | 'submittedAt'>): DailyWorkLog {
  const logs = getDailyLogs();
  const maxNumber = logs.reduce((max, l) => Math.max(max, l.logNumber || 400), 443);
  const newLog: DailyWorkLog = {
    ...logData,
    id: `log-${Date.now()}`,
    logNumber: maxNumber + 1,
    submittedAt: new Date().toISOString(),
  };

  logs.unshift(newLog);
  if (isBrowser) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }
  emitSync();
  return newLog;
}

// ==================== TOKENS & REWARDS (1 TOKEN = ₹2) ====================
export const TOKEN_RUPEE_RATE = 2; // 1 Token = 2 Rupees
export const MIN_REDEEM_AMOUNT_RUPEES = 500; // Minimum cashout amount is ₹500
export const MIN_REDEEM_TOKENS = 250; // 250 Tokens = ₹500 (250 * 2)

export function getTokenTransactions(): TokenTransaction[] {

  if (!isBrowser) return INITIAL_TOKEN_TRANSACTIONS;
  const stored = localStorage.getItem(TOKEN_TRANSACTIONS_KEY);
  if (!stored) {
    localStorage.setItem(TOKEN_TRANSACTIONS_KEY, JSON.stringify(INITIAL_TOKEN_TRANSACTIONS));
    return INITIAL_TOKEN_TRANSACTIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_TOKEN_TRANSACTIONS;
  }
}

export function recordTokenTransaction(data: {
  userId?: string;
  username: string;
  amount: number;
  type: 'earned' | 'redeemed' | 'bonus' | 'refund';
  taskId?: string;
  taskTitle?: string;
  description?: string;
}): TokenTransaction {
  const transactions = getTokenTransactions();
  const rupeeValue = data.amount * TOKEN_RUPEE_RATE;
  const user = getUserByUsername(data.username);

  const newTx: TokenTransaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: data.userId || user?.id || `usr-${data.username}`,
    username: data.username.toLowerCase(),
    amount: data.amount,
    rupeeValue,
    type: data.type,
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    description: data.description,
    timestamp: new Date().toISOString(),
  };

  transactions.unshift(newTx);
  if (isBrowser) {
    localStorage.setItem(TOKEN_TRANSACTIONS_KEY, JSON.stringify(transactions));
  }
  emitSync();
  return newTx;
}

export function getUserTokens(username: string): {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  rupeeWorth: number;
} {
  const transactions = getTokenTransactions();
  const lowerUser = username.toLowerCase().trim();
  const userTxs = transactions.filter((t) => t.username.toLowerCase() === lowerUser);

  let balance = 0;
  let totalEarned = 0;
  let totalRedeemed = 0;

  for (const tx of userTxs) {
    balance += tx.amount;
    if (tx.amount > 0) {
      totalEarned += tx.amount;
    } else {
      totalRedeemed += Math.abs(tx.amount);
    }
  }

  balance = Math.max(0, balance);

  return {
    balance,
    totalEarned,
    totalRedeemed,
    rupeeWorth: balance * TOKEN_RUPEE_RATE,
  };
}

export function awardTokensForTask(taskId: string, username: string, customAmount?: number): {
  success: boolean;
  tokensAwarded: number;
  newBalance: number;
} {
  const task = getTaskById(taskId);
  const amount = customAmount || (task?.priority === 'opus' ? 2 : 1);

  recordTokenTransaction({
    username,
    amount,
    type: amount > 1 ? 'bonus' : 'earned',
    taskId,
    taskTitle: task?.title || 'Daily Work Order',
    description: amount > 1 ? 'Opus Priority Masterwork Bounty' : 'Daily Task Completion Bounty',
  });

  const { balance } = getUserTokens(username);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(TOKEN_AWARD_EVENT, {
        detail: {
          taskId,
          taskTitle: task?.title || 'Daily Dispatch',
          tokensAwarded: amount,
          rupeeValue: amount * TOKEN_RUPEE_RATE,
          newBalance: balance,
        },
      })
    );
  }

  return {
    success: true,
    tokensAwarded: amount,
    newBalance: balance,
  };
}

export function revokeTokensForTask(taskId: string, username: string): void {
  const task = getTaskById(taskId);
  const amountToRevoke = task?.tokensEarned || (task?.priority === 'opus' ? 2 : 1);

  recordTokenTransaction({
    username,
    amount: -amountToRevoke,
    type: 'refund',
    taskId,
    taskTitle: task?.title || 'Daily Work Order',
    description: 'Task incomplete revocation',
  });
}

// ==================== REWARD CLAIMS & PAYOUTS ====================
export function getRewardClaims(): RewardClaim[] {
  if (!isBrowser) return INITIAL_REWARD_CLAIMS;
  const stored = localStorage.getItem(REWARD_CLAIMS_KEY);
  if (!stored) {
    localStorage.setItem(REWARD_CLAIMS_KEY, JSON.stringify(INITIAL_REWARD_CLAIMS));
    return INITIAL_REWARD_CLAIMS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_REWARD_CLAIMS;
  }
}

export function getUserRewardClaims(username: string): RewardClaim[] {
  const claims = getRewardClaims();
  const lower = username.toLowerCase().trim();
  return claims.filter((c) => c.username.toLowerCase() === lower);
}

export function submitRewardClaim(data: {
  username: string;
  tokens: number;
  payoutMethod: PayoutMethod;
  payoutDetails: string;
}): { success: boolean; claim?: RewardClaim; error?: string } {
  const tokensToRedeem = Math.floor(Number(data.tokens));
  if (isNaN(tokensToRedeem) || tokensToRedeem <= 0) {
    return { success: false, error: 'Please enter a valid token amount to redeem.' };
  }

  if (tokensToRedeem < MIN_REDEEM_TOKENS) {
    return {
      success: false,
      error: `Minimum cashout threshold is ₹${MIN_REDEEM_AMOUNT_RUPEES} (${MIN_REDEEM_TOKENS} tokens). You requested ${tokensToRedeem} tokens (worth ₹${tokensToRedeem * TOKEN_RUPEE_RATE}).`,
    };
  }

  const userTokens = getUserTokens(data.username);
  if (userTokens.balance < tokensToRedeem) {
    return {
      success: false,
      error: `Insufficient tokens. You have ${userTokens.balance} tokens available (requested: ${tokensToRedeem}).`,
    };
  }


  if (!data.payoutDetails.trim()) {
    return {
      success: false,
      error: 'Please provide valid payout details (UPI ID, Account, or Voucher Email).',
    };
  }

  const user = getUserByUsername(data.username);
  const claims = getRewardClaims();
  const maxNumber = claims.reduce((max, c) => Math.max(max, c.claimNumber || 700), 702);
  const rupeeAmount = tokensToRedeem * TOKEN_RUPEE_RATE;

  // Deduct tokens via transaction
  recordTokenTransaction({
    username: data.username,
    userId: user?.id,
    amount: -tokensToRedeem,
    type: 'redeemed',
    description: `Reward Claim: ${data.payoutMethod.toUpperCase()} (₹${rupeeAmount})`,
  });

  const newClaim: RewardClaim = {
    id: `claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    claimNumber: maxNumber + 1,
    userId: user?.id || `usr-${data.username}`,
    username: data.username.toLowerCase(),
    userName: user?.name || data.username,
    tokensRedeemed: tokensToRedeem,
    rupeeAmount,
    payoutMethod: data.payoutMethod,
    payoutDetails: data.payoutDetails.trim(),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  claims.unshift(newClaim);
  if (isBrowser) {
    localStorage.setItem(REWARD_CLAIMS_KEY, JSON.stringify(claims));
  }
  emitSync();

  return { success: true, claim: newClaim };
}

export function updateRewardClaimStatus(
  claimId: string,
  status: ClaimStatus,
  adminNotes?: string,
  reviewerUsername?: string
): boolean {
  const claims = getRewardClaims();
  const index = claims.findIndex((c) => c.id === claimId);
  if (index === -1) return false;

  const currentStatus = claims[index].status;
  claims[index].status = status;
  claims[index].reviewedAt = new Date().toISOString();
  claims[index].reviewedBy = reviewerUsername || 'admin';
  if (adminNotes) {
    claims[index].adminNotes = adminNotes;
  }

  // If rejected after being pending, refund tokens
  if (currentStatus === 'pending' && status === 'rejected') {
    recordTokenTransaction({
      username: claims[index].username,
      userId: claims[index].userId,
      amount: claims[index].tokensRedeemed,
      type: 'refund',
      description: `Refund for rejected Claim № ${claims[index].claimNumber}`,
    });
  }

  if (isBrowser) {
    localStorage.setItem(REWARD_CLAIMS_KEY, JSON.stringify(claims));
  }
  emitSync();
  return true;
}

// ==================== SOUND & RESET ====================
export function isSoundEnabled(): boolean {
  if (!isBrowser) return true;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (!isBrowser) return;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  emitSync();
}

export function resetBureauData(): void {
  if (!isBrowser) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(TASKS_KEY, JSON.stringify(INITIAL_TASKS));
  localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_LOGS));
  localStorage.setItem(TOKEN_TRANSACTIONS_KEY, JSON.stringify(INITIAL_TOKEN_TRANSACTIONS));
  localStorage.setItem(REWARD_CLAIMS_KEY, JSON.stringify(INITIAL_REWARD_CLAIMS));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(INITIAL_USERS[0]));
  emitSync();
}

// ─── STICKY NOTES ────────────────────────────────────────────────────────────

export function getStickyNotes(userId: string): StickyNote[] {
  if (!isBrowser) return [];
  const stored = localStorage.getItem(STICKY_NOTES_KEY);
  const all: StickyNote[] = stored ? JSON.parse(stored) : [];
  return all.filter((n) => n.userId === userId).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function createStickyNote(userId: string, content: string, color: StickyColor = 'yellow'): StickyNote {
  const stored = localStorage.getItem(STICKY_NOTES_KEY);
  const all: StickyNote[] = stored ? JSON.parse(stored) : [];
  const note: StickyNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    userId,
    content,
    color,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
  };
  all.push(note);
  localStorage.setItem(STICKY_NOTES_KEY, JSON.stringify(all));
  emitSync();
  return note;
}

export function updateStickyNote(noteId: string, updates: Partial<Pick<StickyNote, 'content' | 'color' | 'pinned'>>): void {
  if (!isBrowser) return;
  const stored = localStorage.getItem(STICKY_NOTES_KEY);
  const all: StickyNote[] = stored ? JSON.parse(stored) : [];
  const idx = all.findIndex((n) => n.id === noteId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STICKY_NOTES_KEY, JSON.stringify(all));
    emitSync();
  }
}

export function deleteStickyNote(noteId: string): void {
  if (!isBrowser) return;
  const stored = localStorage.getItem(STICKY_NOTES_KEY);
  const all: StickyNote[] = stored ? JSON.parse(stored) : [];
  localStorage.setItem(STICKY_NOTES_KEY, JSON.stringify(all.filter((n) => n.id !== noteId)));
  emitSync();
}

