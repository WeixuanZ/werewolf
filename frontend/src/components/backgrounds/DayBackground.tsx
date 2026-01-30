import React from 'react';

export const DayBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#0a1a2a', // Fallback
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="daySky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2a40" /> {/* Dark Blue */}
            <stop offset="50%" stopColor="#2c3e50" /> {/* Slate Blue */}
            <stop offset="100%" stopColor="#34495e" /> {/* Lighter Slate */}
          </linearGradient>

          <filter id="cloudShadow">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Sky */}
        <rect width="1920" height="1080" fill="url(#daySky)" />

        {/* 2. Clouds (Soft Rounded) */}
        <defs>
          <filter id="cloud-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
          {/* Completely rounded cloud shape - built from overlapping circles essentially */}
          <path
            id="soft-cloud"
            d="M40,60 
                        A 20,20 0 0,1 60,40 
                        A 25,25 0 0,1 100,40 
                        A 20,20 0 0,1 120,60 
                        A 15,15 0 0,1 110,85 
                        A 20,20 0 0,1 70,90 
                        A 20,20 0 0,1 40,85 
                        A 15,15 0 0,1 40,60 Z"
          />
        </defs>

        <g fill="#ecf0f1" opacity="0.6" filter="url(#cloudShadow)">
          {/* Cloud 1 - Top Left */}
          <use href="#soft-cloud" transform="translate(150, 100) scale(1.8)" opacity="0.9" />

          {/* Cloud 2 - Far Right */}
          <use href="#soft-cloud" transform="translate(1400, 180) scale(1.5)" opacity="0.7" />

          {/* Cloud 3 - Center */}
          <use href="#soft-cloud" transform="translate(900, 120) scale(2.0)" opacity="0.5" />

          {/* Cloud 4 - Depth */}
          <use href="#soft-cloud" transform="translate(1700, 250) scale(1.0)" opacity="0.4" />
        </g>

        {/* 3. Distant Mountains (Lighter Blue/Grey) */}
        <path
          d="M0,1080 L0,700 
                       L250,550 L550,750 L850,500 L1200,700 L1500,550 L1920,650 
                       L1920,1080 Z"
          fill="#3d566e"
          opacity="0.7"
        />

        {/* 4. Mid-Range Mountains (Darker Slate Blue) */}
        <path
          d="M0,1080 L0,850 
                       L300,750 L600,900 L1000,700 L1400,850 L1700,750 L1920,850 
                       L1920,1080 Z"
          fill="#2c3e50"
        />

        {/* 5. Foreground Trees/Hills (Darkest Blue) */}
        <path
          d="M0,1080 L0,950 
                       C400,980 800,920 1200,950 
                       C1600,980 1800,920 1920,950 
                       L1920,1080 Z"
          fill="#1a2530"
        />

        {/* Foreground Trees (Stylized Conifers) - Matching style with Night but blue palette */}
        <g fill="#1a2530">
          {' '}
          {/* Very Dark Blue */}
          {/* Left Big Tree */}
          <path d="M100,1080 L150,1080 L125,800 Z" />
          <path d="M125,800 L95,900 L125,880 L155,900 Z" />
          <path d="M125,880 L85,1000 L125,970 L165,1000 Z" />
          <path d="M125,970 L70,1100 L180,1100 Z" />
          {/* Right Big Tree */}
          <path d="M1800,1100 L1850,1100 L1825,750 Z" />
          <path d="M1825,750 L1795,850 L1825,830 L1855,850 Z" />
          <path d="M1825,830 L1785,950 L1825,920 L1865,950 Z" />
          <path d="M1825,920 L1770,1080 L1880,1080 Z" />
          {/* Far Right */}
          <path d="M1900,1100 L1940,1100 L1920,850 Z" />
          <path d="M1920,850 L1900,920 L1940,920 Z" />
          <path d="M1920,900 L1890,1000 L1950,1000 Z" />
        </g>
      </svg>
    </div>
  );
};
