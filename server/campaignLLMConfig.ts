/**
 * Campaign LLM Configuration
 * 
 * Modify this file to tweak LLM behavior without changing core service code
 */

export interface CampaignLLMConfig {
  // OpenAI Model Settings
  model: {
    name: string;
    temperature: number;
    maxTokens: number;
    responseFormat?: { type: 'json_object' };
  };

  // System Prompt Configuration
  systemPrompt: {
    roleDescription: string;
    knowledgeBase: 'intelligence_guide' | 'inline' | 'none';
    additionalInstructions?: string;
  };

  // Press Forward Behavior
  pressForward: {
    enforceAllOutlets: boolean;
    prioritizeSmallOutlets: boolean;
    allowBudgetExceeding: boolean;
    maxBudgetExceedPercent: number;
  };

  // Selection Constraints
  selection: {
    minPublications: number;
    maxPublications: number;
    minChannelDiversity: number;
    preferredFrequencyTier: '1x' | '6x' | '12x' | 'auto';
  };

  // Output Configuration
  output: {
    includeReasoning: boolean;
    minReasoningLength: number;
    includeConfidenceScore: boolean;
    verboseLogging: boolean;
  };
}

/**
 * Default Configuration
 * 
 * Edit these values to change LLM behavior
 */
export const defaultLLMConfig: CampaignLLMConfig = {
  // Model Settings
  model: {
    name: 'claude-sonnet-4-5', // Using Claude Sonnet 4.5 via Anthropic
    temperature: 0.7, // 0.0 = deterministic, 1.0 = creative
    maxTokens: 16000, // Let Claude respond fully without arbitrary token limits
    responseFormat: { type: 'json_object' }
  },

  // System Prompt
  systemPrompt: {
    roleDescription: 'You are an expert media buyer and campaign planner specializing in local news ecosystems and Press Forward principles.',
    knowledgeBase: 'intelligence_guide', // Use the CAMPAIGN_INTELLIGENCE_GUIDE.md file
    additionalInstructions: `
      CRITICAL RULES:
      - When includeAllOutlets is true, you MUST include ALL publications with hub inventory
      - Never exclude outlets based on size, efficiency, or perceived redundancy
      - Prioritize ecosystem health over traditional efficiency metrics
      - If budget is exceeded with all outlets, suggest adjustments (frequency, channels) but keep all outlets
      - Always use hub pricing, never standard pricing
      - Select appropriate frequency tiers based on campaign duration
    `
  },

  // Press Forward Philosophy
  pressForward: {
    enforceAllOutlets: true, // Strict enforcement when includeAllOutlets=true
    prioritizeSmallOutlets: true, // Give preference to smaller publications
    allowBudgetExceeding: true, // Allow suggesting packages above budget with adjustments
    maxBudgetExceedPercent: 25 // Maximum % over budget to suggest (25% = $50k budget can suggest $62.5k)
  },

  // Selection Behavior
  selection: {
    minPublications: 5, // Minimum publications to include (unless not available)
    maxPublications: 50, // Maximum publications to include
    minChannelDiversity: 2, // Minimum number of different channels to use
    preferredFrequencyTier: 'auto' // 'auto' = let LLM decide based on duration
  },

  // Output Preferences
  output: {
    includeReasoning: true,
    minReasoningLength: 200, // Minimum characters in reasoning explanation
    includeConfidenceScore: true,
    verboseLogging: true // Log detailed steps to console
  }
};

/**
 * Build system prompt from config
 */
export function buildSystemPrompt(config: CampaignLLMConfig, intelligenceGuide?: string): string {
  let prompt = config.systemPrompt.roleDescription;

  if (config.systemPrompt.knowledgeBase === 'intelligence_guide' && intelligenceGuide) {
    prompt += `\n\nHere is your knowledge base about the Press Forward initiative and Chicago Hub:\n\n${intelligenceGuide}`;
  }

  prompt += '\n\nAlways follow Press Forward principles and use hub pricing.';

  if (config.systemPrompt.additionalInstructions) {
    prompt += `\n\n${config.systemPrompt.additionalInstructions}`;
  }

  return prompt;
}

/**
 * Build user prompt instructions from config
 */
export function buildPromptInstructions(config: CampaignLLMConfig): string {
  const instructions: string[] = [];

  // Press Forward rules
  if (config.pressForward.enforceAllOutlets) {
    instructions.push('CRITICAL: If includeAllOutlets is true, you MUST include ALL available publications.');
  }

  if (config.pressForward.prioritizeSmallOutlets) {
    instructions.push('Give equal consideration to small and large outlets - small outlets serve vital community roles.');
  }

  if (config.pressForward.allowBudgetExceeding) {
    instructions.push(`If an all-inclusive package exceeds budget by up to ${config.pressForward.maxBudgetExceedPercent}%, present it with adjustment suggestions (reduce frequency, remove channels, etc.).`);
  }

  // Selection constraints
  instructions.push(`Aim for ${config.selection.minPublications}-${config.selection.maxPublications} publications.`);
  instructions.push(`Use at least ${config.selection.minChannelDiversity} different channels.`);

  if (config.selection.preferredFrequencyTier !== 'auto') {
    instructions.push(`Prefer ${config.selection.preferredFrequencyTier} frequency tier unless campaign duration makes another tier more appropriate.`);
  }

  // Output requirements
  if (config.output.includeReasoning) {
    instructions.push(`Provide detailed reasoning (minimum ${config.output.minReasoningLength} characters) explaining your selections and how they align with Press Forward principles.`);
  }

  if (config.output.includeConfidenceScore) {
    instructions.push('Include a confidence score (0-1) indicating how well the selections match the requirements.');
  }

  return instructions.join('\n');
}

/**
 * Load custom config from environment or file
 * 
 * You can override config via environment variables:
 * - LLM_MODEL=gpt-4
 * - LLM_TEMPERATURE=0.5
 * - LLM_MAX_TOKENS=3000
 * - LLM_ENFORCE_ALL_OUTLETS=false
 */
export function loadLLMConfig(): CampaignLLMConfig {
  const config = { ...defaultLLMConfig };

  // Override from environment variables if present
  if (process.env.LLM_MODEL) {
    config.model.name = process.env.LLM_MODEL;
  }

  if (process.env.LLM_TEMPERATURE) {
    config.model.temperature = parseFloat(process.env.LLM_TEMPERATURE);
  }

  if (process.env.LLM_MAX_TOKENS) {
    config.model.maxTokens = parseInt(process.env.LLM_MAX_TOKENS);
  }

  if (process.env.LLM_ENFORCE_ALL_OUTLETS) {
    config.pressForward.enforceAllOutlets = process.env.LLM_ENFORCE_ALL_OUTLETS === 'true';
  }

  return config;
}

/**
 * Quick config presets for common scenarios
 */
export const configPresets = {
  // Conservative: Strict Press Forward, all outlets, low creativity
  conservative: {
    ...defaultLLMConfig,
    model: {
      ...defaultLLMConfig.model,
      temperature: 0.3
    },
    pressForward: {
      enforceAllOutlets: true,
      prioritizeSmallOutlets: true,
      allowBudgetExceeding: false,
      maxBudgetExceedPercent: 0
    }
  },

  // Flexible: Allow more AI decision-making
  flexible: {
    ...defaultLLMConfig,
    model: {
      ...defaultLLMConfig.model,
      temperature: 0.9
    },
    pressForward: {
      enforceAllOutlets: false,
      prioritizeSmallOutlets: true,
      allowBudgetExceeding: true,
      maxBudgetExceedPercent: 50
    },
    selection: {
      minPublications: 3,
      maxPublications: 100,
      minChannelDiversity: 1,
      preferredFrequencyTier: 'auto'
    }
  },

  // Fast: Use GPT-3.5 for quicker responses (testing)
  fast: {
    ...defaultLLMConfig,
    model: {
      name: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: { type: 'json_object' }
    }
  },

  // Detailed: Maximum reasoning and explanation
  detailed: {
    ...defaultLLMConfig,
    model: {
      ...defaultLLMConfig.model,
      maxTokens: 6000
    },
    output: {
      includeReasoning: true,
      minReasoningLength: 500,
      includeConfidenceScore: true,
      verboseLogging: true
    }
  }
};

/**
 * Load a preset by name from environment variable
 * 
 * Set LLM_PRESET=fast for quick testing
 * Set LLM_PRESET=detailed for comprehensive analysis
 */
export function loadPreset(presetName?: string): CampaignLLMConfig {
  const preset = presetName || process.env.LLM_PRESET;
  
  if (preset && preset in configPresets) {
    console.log(`📋 Using LLM preset: ${preset}`);
    return configPresets[preset as keyof typeof configPresets];
  }

  return loadLLMConfig();
}

