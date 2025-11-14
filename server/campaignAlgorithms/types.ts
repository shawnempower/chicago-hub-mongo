/**
 * Campaign Algorithm Types
 * 
 * Defines the structure for different campaign generation algorithms
 */

import { CampaignLLMConfig } from '../campaignLLMConfig';

export type AlgorithmType = 
  | 'all-inclusive'           // Include all publications, Press Forward focused
  | 'budget-friendly'         // Stay strictly within budget, optimize for cost
  | 'little-guys'             // Focus on smaller, independent publications
  | 'proportional';           // Allocate proportionally based on publication size

export interface AlgorithmScoring {
  reachWeight: number;        // 0-1: Weight for audience reach
  diversityWeight: number;    // 0-1: Weight for publication/channel diversity
  costWeight: number;         // 0-1: Weight for cost efficiency
  communityWeight: number;    // 0-1: Weight for Press Forward community impact
}

export interface AlgorithmConstraints {
  minPublications?: number;
  maxPublications?: number;
  targetPublicationsMin?: number;   // Preferred minimum publications to keep after pruning
  targetPublicationsMax?: number;   // Preferred maximum publications
  pruningPassesMax?: number;        // 0-4: max pruning iterations
  minBudget?: number;
  maxBudget?: number;
  allowedChannels?: string[];
  requiredTags?: string[];
  strictBudget?: boolean;      // If true, never exceed budget
  maxBudgetExceedPercent?: number;
  webInventoryAvailability?: number;  // 0-1: Percentage of web impressions available (default 0.30 = 30%)
  // Additional proportional/pruning constraints
  maxPublicationPercent?: number;     // e.g., 0.25 means a single pub ≤ 25% of total
  minPublicationSpend?: number;       // Minimum spend per included publication (e.g., $500)
}

export interface AlgorithmConfig {
  id: AlgorithmType;
  name: string;
  description: string;
  icon?: string;                // Emoji or icon identifier
  llmConfig: CampaignLLMConfig;
  constraints: AlgorithmConstraints;
  scoring: AlgorithmScoring;
  promptInstructions: string;   // Algorithm-specific prompt instructions
}

export interface AlgorithmMetadata {
  id: AlgorithmType;
  name: string;
  version: string;
  executedAt: Date;
}

