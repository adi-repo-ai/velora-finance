import { splitCents, type Currency } from '@velora/core';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { T } from './ui';

export function useCountUp(to: number, duration = 2200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      const t0 = Date.now();
      const tick = () => {
        const p = reduce ? 1 : Math.min((Date.now() - t0) / duration, 1);
        setValue(Math.round(to * (1 - Math.pow(1 - p, 5))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      tick();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return value;
}

/** Serif hero amount with small italic gold cents. */
export function HeroMoney({ minor, currency, size = 48 }: { minor: number; currency: Currency; size?: number }) {
  const { whole, cents } = splitCents(useCountUp(minor), currency);
  return (
    <T className="font-serif text-text" style={{ fontSize: size, lineHeight: size * 1.05 }} accessibilityLabel={splitCents(minor, currency).whole + splitCents(minor, currency).cents}>
      {whole}
      <T className="font-serif-italic text-gold-2" style={{ fontSize: size * 0.45 }}>{cents}</T>
    </T>
  );
}
