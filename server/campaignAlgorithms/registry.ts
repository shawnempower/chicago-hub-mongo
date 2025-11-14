/**
 * Campaign Algorithm Registry
 * 
 * Central registry for all available campaign generation algorithms
 */

import { AlgorithmType, AlgorithmConfig } from './types';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { AllInclusiveAlgorithm } from './all-inclusive/config';
import { BudgetFriendlyAlgorithm } from './budget-friendly/config';
import { LittleGuysAlgorithm } from './little-guys/config';
import { ProportionalAlgorithm } from './proportional/config';

export const algorithmRegistry: Record<AlgorithmType, AlgorithmConfig> = {
  'all-inclusive': AllInclusiveAlgorithm,
  'budget-friendly': BudgetFriendlyAlgorithm,
  'little-guys': LittleGuysAlgorithm,
  'proportional': ProportionalAlgorithm,
};

/**
 * Get algorithm configuration by ID
 */
export function getAlgorithm(algorithmId: AlgorithmType): AlgorithmConfig {
  const algorithm = algorithmRegistry[algorithmId];
  if (!algorithm) {
    throw new Error(`Unknown algorithm: ${algorithmId}. Available: ${Object.keys(algorithmRegistry).join(', ')}`);
  }
  return algorithm;
}

/**
 * Get algorithm configuration from database (ONLY source of truth)
 */
export async function getAlgorithmMerged(algorithmId: AlgorithmType): Promise<AlgorithmConfig> {
  try {
    const db = getDatabase();
    const doc = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).findOne({ 
      algorithmId,
      isActive: { $ne: false } // Only load active algorithms
    });
    
    if (!doc) {
      throw new Error(`Algorithm '${algorithmId}' not found in database. Please seed algorithms using the migration script.`);
    }
    
    // Return DB config as-is (database is single source of truth)
    return {
      id: doc.algorithmId,
      name: doc.name,
      description: doc.description,
      icon: doc.icon,
      llmConfig: doc.llmConfig || {},
      constraints: doc.constraints || {},
      scoring: doc.scoring || {},
      promptInstructions: doc.promptInstructions
    } as AlgorithmConfig;
  } catch (e) {
    console.error('❌ Failed to load algorithm from database:', (e as Error).message);
    throw new Error(`Algorithm '${algorithmId}' not available: ${(e as Error).message}`);
  }
}

/**
 * List all available algorithms (for UI dropdown)
 */
export function listAlgorithms(): Array<{
  id: AlgorithmType;
  name: string;
  description: string;
  icon?: string;
}> {
  return Object.values(algorithmRegistry).map(alg => ({
    id: alg.id,
    name: alg.name,
    description: alg.description,
    icon: alg.icon
  }));
}

/**
 * Get default algorithm from database
 */
export async function getDefaultAlgorithm(): Promise<AlgorithmType> {
  try {
    const db = getDatabase();
    const defaultAlg = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS)
      .findOne({ isDefault: true, isActive: { $ne: false } });
    
    if (defaultAlg) {
      return defaultAlg.algorithmId as AlgorithmType;
    }
    
    // Fallback: return first active algorithm
    const firstAlg = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS)
      .findOne({ isActive: { $ne: false } });
    
    return (firstAlg?.algorithmId || 'all-inclusive') as AlgorithmType;
  } catch (e) {
    console.warn('⚠️  Failed to get default algorithm from DB, using fallback:', (e as Error).message);
    return 'all-inclusive';
  }
}

