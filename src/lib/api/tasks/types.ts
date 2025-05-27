import { TaskStatus, ActivityType } from '@prisma/client';

export interface CreateTaskDto {
  title: string;
  description?: any; // Rich text JSON
  customerId: string;
  assigneeId?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: any; // Rich text JSON
  assigneeId?: string;
  status?: TaskStatus;
  dueDate?: Date;
  tags?: string[];
}

export interface CreateTaskNoteDto {
  content: any; // Rich text JSON
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

export interface TaskActivityLog {
  id: string;
  type: ActivityType;
  actorName: string;
  actorImage?: string;
  metadata?: any;
  createdAt: Date;
}

export interface TaskDetails {
  id: string;
  title: string;
  description: any;
  status: TaskStatus;
  assignee?: {
    id: string;
    name: string;
    image?: string;
  };
  customer: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    image?: string;
  };
  dueDate?: Date;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  activities: TaskActivityLog[];
  notes: Array<{
    id: string;
    content: any;
    author: {
      id: string;
      name: string;
      image?: string;
    };
    attachments: Array<{
      id: string;
      filename: string;
      url: string;
      mimeType: string;
      size: number;
    }>;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
} 