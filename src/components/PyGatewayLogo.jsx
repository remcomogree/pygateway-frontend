import React from 'react';

/**
 * PyGateway Logo Component
 * 
 * SVG implementation of the PyGateway logo with the pig character and connections
 */
const PyGatewayLogo = ({ size = 'medium', className = '', showText = true }) => {
  const sizes = {
    small: { width: 120, height: 60, fontSize: '18px' },
    medium: { width: 180, height: 90, fontSize: '24px' },
    large: { width: 240, height: 120, fontSize: '32px' }
  };

  const { width, height, fontSize } = sizes[size] || sizes.medium;

  return (
    <div className={`pygateway-logo ${className}`} style={{ width, height }}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 240 120" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle for pig head */}
        <circle 
          cx="120" 
          cy="60" 
          r="35" 
          fill="#B19CD9" 
          stroke="#6B5B95" 
          strokeWidth="3"
        />
        
        {/* Pig ears */}
        <path 
          d="M 95 35 Q 90 25 100 30 Q 105 25 100 35 Z" 
          fill="#B19CD9" 
          stroke="#6B5B95" 
          strokeWidth="2"
        />
        <path 
          d="M 140 35 Q 135 25 145 30 Q 150 25 145 35 Z" 
          fill="#B19CD9" 
          stroke="#6B5B95" 
          strokeWidth="2"
        />
        
        {/* Inner ears */}
        <ellipse cx="100" cy="32" rx="4" ry="6" fill="#D8BFD8" />
        <ellipse cx="140" cy="32" rx="4" ry="6" fill="#D8BFD8" />
        
        {/* Eyes */}
        <circle cx="110" cy="55" r="4" fill="#2C3E50" />
        <circle cx="130" cy="55" r="4" fill="#2C3E50" />
        
        {/* Snout */}
        <ellipse cx="120" cy="70" rx="8" ry="6" fill="#9370DB" stroke="#6B5B95" strokeWidth="2" />
        
        {/* Nostrils */}
        <ellipse cx="117" cy="70" rx="1.5" ry="2" fill="#2C3E50" />
        <ellipse cx="123" cy="70" rx="1.5" ry="2" fill="#2C3E50" />
        
        {/* Connection lines - left side */}
        <g stroke="#4DB6AC" strokeWidth="3" fill="none">
          <line x1="60" y1="40" x2="85" y2="50" />
          <line x1="60" y1="60" x2="85" y2="60" />
          <line x1="60" y1="80" x2="85" y2="70" />
        </g>
        
        {/* Connection lines - right side */}
        <g stroke="#4DB6AC" strokeWidth="3" fill="none">
          <line x1="155" y1="50" x2="180" y2="40" />
          <line x1="155" y1="60" x2="180" y2="60" />
          <line x1="155" y1="70" x2="180" y2="80" />
        </g>
        
        {/* Connection nodes - left */}
        <circle cx="60" cy="40" r="4" fill="#4DB6AC" />
        <circle cx="60" cy="60" r="4" fill="#4DB6AC" />
        <circle cx="60" cy="80" r="4" fill="#4DB6AC" />
        
        {/* Connection nodes - right */}
        <circle cx="180" cy="40" r="4" fill="#4DB6AC" />
        <circle cx="180" cy="60" r="4" fill="#4DB6AC" />
        <circle cx="180" cy="80" r="4" fill="#4DB6AC" />
      </svg>
      
      {showText && (
        <div className="logo-text" style={{ fontSize, marginTop: '8px' }}>
          <span className="logo-py">Py</span>
          <span className="logo-gateway">Gateway</span>
        </div>
      )}
      
      <style jsx="true">{`
        .pygateway-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .logo-text {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-weight: bold;
          text-align: center;
          line-height: 1;
        }
        
        .logo-py {
          color: #4DB6AC;
        }
        
        .logo-gateway {
          color: #2C3E50;
        }
        
        .pygateway-logo svg {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        
        .pygateway-logo:hover svg {
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
          transform: scale(1.05);
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default PyGatewayLogo;
