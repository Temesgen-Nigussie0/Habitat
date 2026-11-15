import { useMemo } from 'react'

interface RealisticBurningFlameProps {
  size?: number
  className?: string
}

export default function RealisticBurningFlame({
  size = 140,
  className = '',
}: RealisticBurningFlameProps) {
  // Generate random stable embers floating upward
  const embers = useMemo(
    () => [
      { id: 1, left: '38%', delay: '0s', duration: '2.8s', size: 3, drift: '-8px' },
      { id: 2, left: '52%', delay: '0.7s', duration: '3.2s', size: 4, drift: '10px' },
      { id: 3, left: '46%', delay: '1.4s', duration: '2.5s', size: 2.5, drift: '-5px' },
      { id: 4, left: '60%', delay: '1.9s', duration: '3.0s', size: 3.5, drift: '7px' },
      { id: 5, left: '34%', delay: '2.3s', duration: '3.4s', size: 2, drift: '-12px' },
    ],
    []
  )

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size * 1.25 }}
    >
      <style>{`
        @keyframes flameBreathe {
          0%, 100% {
            transform: scale(1) scaleY(1) rotate(0deg);
            filter: drop-shadow(0 0 24px rgba(255, 106, 0, 0.7)) drop-shadow(0 0 50px rgba(255, 60, 0, 0.4));
          }
          35% {
            transform: scale(1.03) scaleY(1.06) rotate(-1.2deg);
            filter: drop-shadow(0 0 30px rgba(255, 120, 0, 0.85)) drop-shadow(0 0 60px rgba(255, 70, 0, 0.5));
          }
          70% {
            transform: scale(0.98) scaleY(1.03) rotate(1.4deg);
            filter: drop-shadow(0 0 22px rgba(255, 90, 0, 0.65)) drop-shadow(0 0 45px rgba(255, 50, 0, 0.35));
          }
        }

        @keyframes flameCorePulse {
          0%, 100% {
            transform: scale(1) scaleY(1) translateY(0);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.05) scaleY(1.1) translateY(-2px);
            opacity: 1;
          }
        }

        @keyframes flameMidWaver {
          0%, 100% {
            transform: rotate(0deg) skewX(0deg);
          }
          33% {
            transform: rotate(-1.5deg) skewX(-1.5deg);
          }
          66% {
            transform: rotate(1.8deg) skewX(1.2deg);
          }
        }

        @keyframes emberRise {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translate3d(var(--drift), -70px, 0) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes auraShimmer {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.08);
          }
        }
      `}</style>

      {/* Shimmering particle dust ring / ambient radial halo */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 106, 0, 0.28) 0%, rgba(255, 80, 0, 0.12) 45%, transparent 70%)',
          animation: 'auraShimmer 4s ease-in-out infinite',
        }}
      />

      {/* Burning Ember Sparks Floating Upward */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {embers.map((e) => (
          <span
            key={e.id}
            className="absolute rounded-full"
            style={
              {
                left: e.left,
                bottom: '35%',
                width: e.size,
                height: e.size,
                backgroundColor: '#FFE600',
                boxShadow: '0 0 8px #FF6A00, 0 0 14px #FF3B30',
                '--drift': e.drift,
                animation: `emberRise ${e.duration} infinite ease-out`,
                animationDelay: e.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Layered Vector Flame */}
      <div
        className="relative z-10 w-full h-full flex items-center justify-center origin-bottom"
        style={{ animation: 'flameBreathe 3s ease-in-out infinite' }}
      >
        <svg
          viewBox="0 0 120 160"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer Flame Gradient */}
            <linearGradient id="outerFlameGrad" x1="60" y1="150" x2="60" y2="10" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E63900" />
              <stop offset="25%" stopColor="#FF4500" />
              <stop offset="65%" stopColor="#FF6A00" />
              <stop offset="100%" stopColor="#FFA000" />
            </linearGradient>

            {/* Mid Flame Gradient */}
            <linearGradient id="midFlameGrad" x1="60" y1="145" x2="60" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6A00" />
              <stop offset="50%" stopColor="#FF9F0A" />
              <stop offset="90%" stopColor="#FFD60A" />
              <stop offset="100%" stopColor="#FFEAA7" />
            </linearGradient>

            {/* Inner Core Flame Gradient */}
            <linearGradient id="coreFlameGrad" x1="60" y1="140" x2="60" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF9F0A" />
              <stop offset="40%" stopColor="#FFD60A" />
              <stop offset="85%" stopColor="#FFF9DB" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>

            {/* Blue base oxygen glow */}
            <radialGradient id="baseBlueGrad" cx="60" cy="148" r="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(41, 121, 255, 0.45)" />
              <stop offset="60%" stopColor="rgba(255, 106, 0, 0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* 1. Outer Flame Silhouette */}
          <path
            d="M60 10C63 28 76 46 88 64C102 85 106 108 97 128C88 147 69 155 58 155C46 155 28 146 21 127C12 104 20 81 33 61C43 45 54 28 60 10Z"
            fill="url(#outerFlameGrad)"
          />

          {/* 1b. Outer Left Flickering Tongue */}
          <path
            d="M58 24C65 44 80 58 84 80C87 96 82 110 74 122C68 116 68 107 68 98C68 83 58 72 54 58C52 50 54 36 58 24Z"
            fill="#FF8500"
            opacity="0.6"
            style={{
              transformOrigin: '58px 90px',
              animation: 'flameMidWaver 3.4s ease-in-out infinite',
            }}
          />

          {/* 2. Middle Vibrant Flame Layer */}
          <g style={{ transformOrigin: '60px 140px', animation: 'flameMidWaver 2.6s ease-in-out infinite' }}>
            <path
              d="M60 38C64 52 74 66 81 81C89 97 90 114 83 128C76 141 62 147 55 147C47 147 34 140 29 127C23 111 27 94 36 80C44 68 53 53 60 38Z"
              fill="url(#midFlameGrad)"
            />
          </g>

          {/* 3. Inner White-Hot Core */}
          <g style={{ transformOrigin: '60px 145px', animation: 'flameCorePulse 2s ease-in-out infinite' }}>
            <path
              d="M60 74C63 85 70 96 73 107C76 119 73 130 67 138C63 144 57 145 54 145C49 145 42 142 39 135C35 125 38 114 43 105C48 95 55 84 60 74Z"
              fill="url(#coreFlameGrad)"
            />
          </g>

          {/* 4. Oxygen Heart / Bottom Base Glow */}
          <ellipse cx="60" cy="144" rx="24" ry="10" fill="url(#baseBlueGrad)" />
        </svg>
      </div>
    </div>
  )
}

