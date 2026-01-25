import React from 'react';

export const WerewolfBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="moonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e6e6fa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#9370db" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="treeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1128" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0d0814" stopOpacity="0.95" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Geometric Wolf Head Watermark (Centered) */}
        <g
          opacity="0.05"
          fill="none"
          stroke="#9370db"
          strokeWidth="0.3"
          transform="translate(0, 10)"
        >
          {/* Outer Shape */}
          <path d="M50,80 L30,45 L25,15 L38,28 L50,22 L62,28 L75,15 L70,45 Z" />
          {/* Center Line */}
          <path d="M50,80 L50,22" />
          {/* Eyes/Snout connections */}
          <path d="M30,45 L50,60 L70,45" />
          <path d="M38,28 L50,60 L62,28" />
          <path d="M30,45 L38,28" />
          <path d="M70,45 L62,28" />
          {/* Eyes */}
          <path d="M38,38 L43,42" strokeWidth="0.5" />
          <path d="M62,38 L57,42" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  );
};
