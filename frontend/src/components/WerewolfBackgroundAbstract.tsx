import React from 'react';

export const WerewolfBackgroundAbstract: React.FC = () => {
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
        backgroundColor: '#1a1128',
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
          <linearGradient id="poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d1f47" />
            <stop offset="100%" stopColor="#1a1128" />
          </linearGradient>
           <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
             <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#9370db" strokeWidth="0.1" opacity="0.2"/>
           </pattern>
        </defs>

        {/* Base Gradient Background */}
        <rect width="100" height="100" fill="url(#poly-grad)" />

        {/* Subtle Grid */}
        <rect width="100" height="100" fill="url(#grid)" />

        {/* Abstract Low-Poly Wolf Head Hint */}
        <g transform="translate(50, 50) scale(0.6)" fill="none" stroke="#9370db" strokeWidth="0.2" opacity="0.15">
             <polygon points="0,-50 -30,-20 -20,10 0,30 20,10 30,-20" />
             <polygon points="0,-50 -10,-20 0,0 10,-20" />
             <line x1="-30" y1="-20" x2="0" y2="0" />
             <line x1="30" y1="-20" x2="0" y2="0" />
             <line x1="-20" y1="10" x2="0" y2="0" />
             <line x1="20" y1="10" x2="0" y2="0" />

             {/* Eyes */}
             <circle cx="-10" cy="-15" r="1" fill="#9370db" fillOpacity="0.5" />
             <circle cx="10" cy="-15" r="1" fill="#9370db" fillOpacity="0.5" />
        </g>

        {/* Geometric Constellations */}
        <g stroke="#9370db" strokeWidth="0.1" fill="#FFF">
           <circle cx="10" cy="20" r="0.3" />
           <circle cx="20" cy="10" r="0.2" />
           <circle cx="30" cy="25" r="0.3" />
           <line x1="10" y1="20" x2="20" y2="10" opacity="0.3" />
           <line x1="20" y1="10" x2="30" y2="25" opacity="0.3" />

           <circle cx="80" cy="80" r="0.3" />
           <circle cx="90" cy="70" r="0.2" />
           <circle cx="85" cy="90" r="0.3" />
           <line x1="80" y1="80" x2="90" y2="70" opacity="0.3" />
           <line x1="90" y1="70" x2="85" y2="90" opacity="0.3" />
           <line x1="85" y1="90" x2="80" y2="80" opacity="0.3" />
        </g>

        {/* Large Geometric Shapes */}
        <path d="M0,100 L30,70 L60,100 Z" fill="#2d1f47" fillOpacity="0.3" />
        <path d="M100,100 L70,60 L40,100 Z" fill="#2d1f47" fillOpacity="0.2" />

      </svg>
    </div>
  );
};
