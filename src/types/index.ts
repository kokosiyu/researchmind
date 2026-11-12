
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

export interface TimelineData {
  year: number;
  [keyword: string]: number;
}

export interface KeywordTimeline {
  timelineData: TimelineData[];
  topKeywords: string[];
  topKeywordFreq?: Record<string, number>;
  years: number[];
  yearPaperCount?: Record<number, number>;
}

export interface ClusterMember {
  id: string;
  title: string;
  year: number;
  index: number;
}

export interface Cluster {
  id: number;
  label: string;
  topTerms: string[];
  members: ClusterMember[];
  count: number;
}

export interface ClusteringResult {
  clusters: Cluster[];
  k: number;
  iterations?: number;
  inertia?: number;
  elbowResults?: { k: number; inertia: number; iterations: number }[];
}

export interface NetworkNode {
  id: string;
  title: string;
  year: number;
  keywords: string[];
}

export interface NetworkLink {
  source: string;
  target: string;
  similarity: number;
}

export interface PaperNetwork {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface TrendsSummary {
  totalPapers: number;
  yearRange: { from: number; to: number } | null;
  topKeywords: string[];
  clusterCount: number;
}

export interface TrendsData {
  timeline: KeywordTimeline;
  clustering: ClusteringResult;
  network: PaperNetwork;
  summary: TrendsSummary;
}
