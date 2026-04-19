
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  journal: string;
  year: number;
  doi: string;
  keywords: string[];
  content: string;
  summary?: string;
  createdAt: Date;
  updatedAt?: Date;
  fileName?: string;
  filePath?: string;
}

export interface Note {
  id: string;
  paperId: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'citation' | 'similarity' | 'co-author';
  weight: number;
  description: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'paper' | 'author' | 'keyword';
  size: number;
  data: Paper | null;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
