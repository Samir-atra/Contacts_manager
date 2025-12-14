export interface Contact {
  id: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  groupId: string | null;
  createdAt: number;
  avatarColor: string;
  jobTitle?: string;
  company?: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export enum SortOption {
  Alphabetical = 'ALPHABETICAL',
  TimeAdded = 'TIME_ADDED',
  Newest = 'NEWEST'
}

export interface ContactFormData {
  prefix: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  groupId: string | null;
  jobTitle: string;
  company: string;
}