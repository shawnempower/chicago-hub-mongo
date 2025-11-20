/**
 * Pricing Benchmarks Utility
 * 
 * Defines market benchmarks for pricing analysis and health scoring
 */

export interface PricingBenchmark {
  min: number;      // Minimum acceptable normalized price (per 1K)
  max: number;      // Maximum acceptable normalized price (per 1K)
  target: number;   // Target/ideal normalized price (per 1K)
  excellent: number; // Excellent value threshold (per 1K)
}

export interface ChannelBenchmarks {
  [pricingModel: string]: PricingBenchmark;
}

// Benchmark ranges based on market analysis (per 1000 audience)
export const PRICING_BENCHMARKS: Record<string, ChannelBenchmarks> = {
  website: {
    cpm: {
      min: 0.001,
      max: 0.025,
      target: 0.010,
      excellent: 0.005
    },
    monthly: {
      min: 3,
      max: 15,
      target: 8,
      excellent: 5
    },
    per_week: {
      min: 5,
      max: 60,
      target: 25,
      excellent: 10
    },
    per_day: {
      min: 0.2,
      max: 2,
      target: 0.5,
      excellent: 0.3
    },
    flat_rate: {
      min: 3,
      max: 20,
      target: 10,
      excellent: 5
    }
  },
  newsletter: {
    per_send: {
      min: 10,
      max: 50,
      target: 25,
      excellent: 15
    },
    monthly: {
      min: 15,
      max: 60,
      target: 30,
      excellent: 20
    }
  },
  print: {
    per_ad: {
      min: 20,
      max: 150,
      target: 60,
      excellent: 40
    },
    per_insertion: {
      min: 20,
      max: 150,
      target: 60,
      excellent: 40
    }
  },
  podcast: {
    per_episode: {
      min: 15,
      max: 60,
      target: 30,
      excellent: 20
    },
    per_spot: {
      min: 15,
      max: 60,
      target: 30,
      excellent: 20
    }
  },
  radio: {
    per_spot: {
      min: 15,
      max: 60,
      target: 30,
      excellent: 20
    }
  }
};

export type PricingStatus = 'excellent' | 'good' | 'fair' | 'review' | 'critical';

export interface PricingAssessment {
  status: PricingStatus;
  multiplier: number;  // How many times over/under benchmark
  message: string;
  color: string;
  icon: string;
}

/**
 * Assess pricing against benchmarks
 */
export function assessPricing(
  channel: string,
  pricingModel: string,
  unitPrice: number
): PricingAssessment {
  const benchmark = PRICING_BENCHMARKS[channel]?.[pricingModel];
  
  if (!benchmark) {
    return {
      status: 'fair',
      multiplier: 1,
      message: 'No benchmark available',
      color: 'text-gray-500',
      icon: '⚪'
    };
  }

  if (unitPrice <= benchmark.excellent) {
    return {
      status: 'excellent',
      multiplier: unitPrice / benchmark.target,
      message: 'Excellent value - Perfect for packages',
      color: 'text-green-600',
      icon: '⭐'
    };
  }

  if (unitPrice <= benchmark.max) {
    return {
      status: 'good',
      multiplier: unitPrice / benchmark.target,
      message: 'Within benchmark range',
      color: 'text-green-600',
      icon: '🟢'
    };
  }

  if (unitPrice <= benchmark.max * 2) {
    return {
      status: 'fair',
      multiplier: unitPrice / benchmark.target,
      message: 'Above benchmark - Review recommended',
      color: 'text-yellow-600',
      icon: '🟡'
    };
  }

  if (unitPrice <= benchmark.max * 10) {
    return {
      status: 'review',
      multiplier: unitPrice / benchmark.target,
      message: 'Significantly overpriced',
      color: 'text-orange-600',
      icon: '🟠'
    };
  }

  return {
    status: 'critical',
    multiplier: unitPrice / benchmark.target,
    message: 'Critical: Extremely overpriced',
    color: 'text-red-600',
    icon: '🔴'
  };
}

/**
 * Get pricing health score (0-100)
 */
export function calculatePricingHealth(items: Array<{
  channel: string;
  pricingModel: string;
  unitPrice: number;
}>): {
  score: number;
  breakdown: {
    excellent: number;
    good: number;
    fair: number;
    review: number;
    critical: number;
  };
} {
  const breakdown = {
    excellent: 0,
    good: 0,
    fair: 0,
    review: 0,
    critical: 0
  };

  items.forEach(item => {
    const assessment = assessPricing(item.channel, item.pricingModel, item.unitPrice);
    breakdown[assessment.status]++;
  });

  const total = items.length;
  if (total === 0) return { score: 0, breakdown };

  // Calculate weighted score
  const score = Math.round(
    (breakdown.excellent * 100 +
     breakdown.good * 85 +
     breakdown.fair * 60 +
     breakdown.review * 30 +
     breakdown.critical * 0) / total
  );

  return { score, breakdown };
}

/**
 * Get suggested price based on audience and channel
 */
export function getSuggestedPrice(
  channel: string,
  pricingModel: string,
  audienceSize: number
): { low: number; target: number; high: number } | null {
  const benchmark = PRICING_BENCHMARKS[channel]?.[pricingModel];
  if (!benchmark) return null;

  return {
    low: Math.round((audienceSize / 1000) * benchmark.excellent),
    target: Math.round((audienceSize / 1000) * benchmark.target),
    high: Math.round((audienceSize / 1000) * benchmark.max)
  };
}

