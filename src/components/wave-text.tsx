"use client";

import { useEffect, useState } from "react";

interface WaveTextProps {
  text: string;
}

export function WaveText({ text }: WaveTextProps) {
  const [isVisible, setIsVisible] = useState(false);
  const chars = text.split("");
  const totalChars = chars.length;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className="inline-block">
      {chars.map((char, index) => {
        // Calculate gradient color based on position
        const progress = index / (totalChars - 1);
        let color: string;
        if (progress < 0.5) {
          // Red to orange
          color = `rgb(248, ${132 + progress * 2 * (196 - 132)}, 60)`;
        } else {
          // Orange to yellow
          const p = (progress - 0.5) * 2;
          color = `rgb(250, ${196 + p * (204 - 196)}, ${60 + p * (21 - 60)})`;
        }

        return (
          <span
            key={index}
            className={`inline-block transition-all duration-500 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
            style={{
              transitionDelay: `${index * 50}ms`,
              color,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </span>
  );
}
