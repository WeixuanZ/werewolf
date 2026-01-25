import React from 'react';

export const WerewolfBackgroundForest: React.FC = () => {
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
        background: 'linear-gradient(to bottom, #87CEEB, #FFE4B5, #FFA500)',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="day-fog-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFE4B5" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFE4B5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFE4B5" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Background Trees (Lighter, further away) */}
        <path
          d="M0,100 L0,60 L5,70 L10,55 L15,70 L20,60 L25,75 L30,50 L35,75 L40,60 L45,70 L50,55 L55,75 L60,65 L65,70 L70,55 L75,70 L80,60 L85,75 L90,65 L95,70 L100,60 L100,100 Z"
          fill="#2d5a27"
          fillOpacity="0.5"
        />

        {/* Midground Trees */}
        <path
          d="M-5,100 L-5,75 L5,85 L10,70 L20,85 L30,65 L40,85 L50,70 L60,85 L70,75 L80,85 L90,70 L105,85 L105,100 Z"
          fill="#1e4620"
          fillOpacity="0.7"
        />

        {/* Foreground Trees (Darkest, closest) */}
        <path
          d="M0,100 L0,80 L8,90 L15,75 L22,90 L30,78 L38,90 L45,80 L52,92 L60,75 L68,90 L75,82 L82,92 L90,80 L98,90 L100,85 L100,100 Z"
          fill="#143312"
          fillOpacity="0.9"
        />

        {/* Fog Layer */}
        <rect x="0" y="60" width="100" height="40" fill="url(#day-fog-gradient)" />
      </svg>
    </div>
  );
};
