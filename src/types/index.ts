export type Role = 'member' | 'admin';

export type Department = 'Atelier & Craft' | 'Systems & Engineering' | 'Dispatch & Logistics' | 'Archives & Research';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email?: string;
  role: Role;
  title?: string;
  department?: Department | string;
  avatar?: string;
  deskNumber?: string;
  signature?: string;
  createdAt: string;
}

export type TaskPriority = 'routine' | 'urgent' | 'opus';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'deleted';

export type ItemType = 'task' | 'routine';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  orderNumber: number; // e.g. 1042
  itemType: ItemType; // 'task' (Daily Task) or 'routine' (Daily Routine)
  title: string;
  description: string;
  assigneeId: string;
  createdById: string;
  createdByUsername: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  reminderTime?: string; // HH:mm format e.g. "09:30"
  lastNotifiedDate?: string; // YYYY-MM-DD
  estimatedHours?: number;
  spentHours?: number;
  subtasks: SubTask[];
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  adminSignedOff?: boolean;
  adminSignedAt?: string;
  adminSignedBy?: string;
  adminNotes?: string;
  tokenAwarded?: boolean;
  tokensEarned?: number;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  username: string;
  amount: number; // e.g. +1 or -5
  rupeeValue: number; // e.g. 2 or -10 (every 1 token = 2rs)
  type: 'earned' | 'redeemed' | 'bonus' | 'refund';
  taskId?: string;
  taskTitle?: string;
  description?: string;
  timestamp: string;
}

export type PayoutMethod = 'upi' | 'bank' | 'voucher';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface RewardClaim {
  id: string;
  claimNumber: number; // e.g. 701
  userId: string;
  username: string;
  userName: string;
  tokensRedeemed: number;
  rupeeAmount: number; // tokensRedeemed * 2
  payoutMethod: PayoutMethod;
  payoutDetails: string; // UPI ID or Account details
  status: ClaimStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

export interface DailyWorkLog {
  id: string;
  logNumber: number;
  userId: string;
  date: string; // YYYY-MM-DD
  accomplishments: string[];
  blockers?: string;
  nextFocus: string;
  hoursLogged: number;
  submittedAt: string;
}

export interface TeamStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  deletedTasks: number;
  totalHoursLogged: number;
  completionRate: number;
}

export type StickyColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple';

export interface StickyNote {
  id: string;
  userId: string;
  content: string;
  color: StickyColor;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}
