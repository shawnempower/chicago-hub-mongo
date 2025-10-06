import { useCallback } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: ('square' | 'circle')[];
  scalar?: number;
  drift?: number;
  gravity?: number;
  decay?: number;
  startVelocity?: number;
}

export const useConfetti = () => {
  const triggerConfetti = useCallback((options: ConfettiOptions = {}) => {
    const defaults: ConfettiOptions = {
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'],
      shapes: ['square', 'circle'],
      scalar: 1,
      drift: 0,
      gravity: 1,
      decay: 0.94,
      startVelocity: 30
    };

    const config = { ...defaults, ...options };
    confetti(config);
  }, []);

  const triggerSuccessConfetti = useCallback(() => {
    // First burst
    triggerConfetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.25, y: 0.6 }
    });

    // Second burst with slight delay
    setTimeout(() => {
      triggerConfetti({
        particleCount: 50,
        spread: 60,
        origin: { x: 0.75, y: 0.6 }
      });
    }, 250);

    // Third burst from center
    setTimeout(() => {
      triggerConfetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 }
      });
    }, 400);
  }, [triggerConfetti]);

  const triggerLoginConfetti = useCallback(() => {
    // Celebration burst from multiple points
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
        colors: ['#26ccff', '#a25afd', '#ff5722', '#4caf50', '#ffeb3b']
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  const triggerSurveyConfetti = useCallback(() => {
    // Epic celebration for survey completion
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43']
      });
    }, 250);
  }, []);

  return {
    triggerConfetti,
    triggerSuccessConfetti,
    triggerLoginConfetti,
    triggerSurveyConfetti
  };
};

