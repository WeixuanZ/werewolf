import React from 'react';

export const NightBackground: React.FC = () => {
  // Memoize stars to prevent re-render flickering
  // Memoize stars to prevent re-render flickering
  const [stars, setStars] = React.useState<
    { cx: number; cy: number; r: number; opacity: number }[]
  >([]);

  React.useEffect(() => {
    const newStars = [...Array(100)].map(() => ({
      cx: Math.random() * 1920,
      cy: Math.random() * 800,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
    }));
    setStars(newStars);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#0f0518', // Fallback
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
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f0518" /> {/* Very Dark Deep Purple/Black */}
            <stop offset="50%" stopColor="#1C0B2B" /> {/* Deep Purple */}
            <stop offset="100%" stopColor="#2D1142" /> {/* Rich Purple */}
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Sky */}
        <rect width="1920" height="1080" fill="url(#nightSky)" />

        {/* 2. Stars */}
        <g fill="#FFFFFF">
          {stars.map((star, i) => (
            <circle key={i} cx={star.cx} cy={star.cy} r={star.r} opacity={star.opacity} />
          ))}
        </g>

        {/* 3. Moon */}
        <g filter="url(#glow)">
          {/* Outer Glow */}
          <circle cx="1650" cy="180" r="65" fill="#E6E6FA" opacity="0.3" />
          {/* Moon Body */}
          <circle cx="1650" cy="180" r="50" fill="#F8F8FF" />
        </g>

        {/* 4. Distant Mountains (Lighter/Atmospheric Purple) */}
        <path
          d="M0,1080 L0,700 
                       L250,550 L550,750 L850,500 L1200,700 L1500,550 L1920,650 
                       L1920,1080 Z"
          fill="#3E1F59"
          opacity="0.6"
        />

        {/* 5. Mid-Range Mountains (Darker Purple) */}
        <path
          d="M0,1080 L0,850 
                       L300,750 L600,900 L1000,700 L1400,850 L1700,750 L1920,850 
                       L1920,1080 Z"
          fill="#2A123E"
        />

        {/* 6. Foreground Trees/Hills (Darkest Purple/Black) */}
        <path
          d="M0,1080 L0,950 
                       C400,980 800,920 1200,950 
                       C1600,980 1800,920 1920,950 
                       L1920,1080 Z"
          fill="#150621"
        />

        {/* Foreground Trees (Stylized Conifers) */}
        <g fill="#150621">
          {/* Left Group */}
          <path d="M100,1080 L140,850 L180,1080 Z" />
          <path d="M40,1080 L80,900 L120,1080 Z" />
          <path d="M-20,1080 L20,880 L60,1080 Z" />

          {/* Branches details would be complex in pure path, sticking to elegant silhouettes */}
          <path d="M140,850 L100,950 L180,950 Z" />
          <path d="M140,880 L110,980 L170,980 Z" />

          {/* More robust tree shapes */}
          {/* Left Large */}
          <path d="M250,1080 L300,700 L350,1080 Z" />
          <circle cx="300" cy="1080" r="80" />

          {/* Right Group */}
          <path d="M1750,1080 L1800,800 L1850,1080 Z" />
          <path d="M1850,1080 L1890,880 L1930,1080 Z" />
          <path d="M1600,1080 L1650,900 L1700,1080 Z" />
        </g>

        {/* Refining the tree silhouettes to be more "elegant" and less "triangle" */}
        {/* Let's overlay some better tree shapes using a reusable def in the future, but for now simple elegant curves */}
        <g fill="#150621">
          {/* Left Cluster */}
          <path
            d="M50,1080 Q100,1000 150,1080 T250,1080 T350,1080"
            stroke="#150621"
            strokeWidth="0"
          />
          {/* Replacing the simple triangles with better paths */}
        </g>

        {/* Re-drawing Foreground Trees to be high quality */}
        <g fill="#0e0417">
          {' '}
          {/* Almost black */}
          {/* Left Big Tree */}
          <path
            d="M100,1080 L100,850 L60,950 L100,920 L140,950 L100,850 Z"
            strokeWidth="20"
            strokeLinejoin="round"
          />
          <path d="M100,850 L60,950 L100,920 L140,950 Z" /> {/* Top bit */}
          <path d="M100,920 L50,1050 L100,1000 L150,1050 L100,920 Z" /> {/* Mid bit */}
          <path d="M100,1000 L40,1150 L160,1150 Z" /> {/* Base */}
          {/* Actually, let's use the 'pine-1' style paths but cleaner */}
          <path d="M100,1080 L150,1080 L125,800 Z" /> {/* Trunk/Core */}
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
