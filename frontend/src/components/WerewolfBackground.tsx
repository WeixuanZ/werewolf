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

        {/* Large Subtle Moon */}
        <circle cx="85" cy="20" r="12" fill="url(#moonGradient)" filter="url(#glow)" />

        {/* Geometric Wolf Head Watermark (Centered) */}
        <g opacity="0.05" fill="none" stroke="#9370db" strokeWidth="0.3" transform="translate(0, 10)">
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

        {/* Claw Marks (Left Side) */}
        <g transform="translate(5, 50) scale(0.3) rotate(-15)" opacity="0.08" fill="#9370db">
             <path d="M10,0 Q15,50 5,100 L8,100 Q18,50 13,0 Z" />
             <path d="M30,5 Q35,55 25,105 L28,105 Q38,55 33,5 Z" />
             <path d="M50,10 Q55,60 45,110 L48,110 Q58,60 53,10 Z" />
        </g>

         {/* Horizon / Trees (Bottom) */}
        <path
          d="M0,100 L0,90 L3,92 L6,85 L10,93 L14,80 L18,92 L22,85 L26,95 L30,75 L35,93 L40,85 L45,95 L50,80 L55,95 L60,85 L65,92 L70,78 L75,93 L80,85 L85,95 L90,82 L95,92 L100,88 L100,100 Z"
          fill="url(#treeGradient)"
          opacity="0.6"
        />
      </svg>
    </div>
  );
};
