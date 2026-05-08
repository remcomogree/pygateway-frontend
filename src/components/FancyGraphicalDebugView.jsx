import React, { useState, useEffect } from 'react';

/**
 * FancyGraphicalDebugView Component
 * 
 * Enhanced, modern, animated version of GraphicalDebugView with:
 * - Flowing animations
 * - Real-time timing visualization
 * - Interactive hover effects
 * - Modern gradients and shadows
 * - Responsive design
 * - Beautiful animations and transitions
 */
const FancyGraphicalDebugView = ({ requestId, debugEntries = [] }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [hoveredPhase, setHoveredPhase] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Animation effect for request flow
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setAnimationProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Phase mapping with enhanced styling
  const PHASE_ORDER = [
    'client_start',
    'global_plugins_loaded',
    'plugins_loaded', 
    'certificate_phase',
    'rewrite_phase',
    'access_phase',
    'request_validation',
    'upstream_forwarded',
    'response_validation',
    'header_filter_phase',
    'body_filter_phase',
    'response_ready'
  ];

  const PHASE_CONFIG = {
    'client_start': { 
      icon: '👤', 
      name: 'Client Request', 
      color: '#4f46e5',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Initial client request received'
    },
    'global_plugins_loaded': { 
      icon: '🌐', 
      name: 'Global Plugins', 
      color: '#059669',
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      description: 'Global plugins loaded and initialized'
    },
    'plugins_loaded': { 
      icon: '🔌', 
      name: 'Route Plugins', 
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Route-specific plugins loaded'
    },
    'certificate_phase': { 
      icon: '🔒', 
      name: 'Certificate', 
      color: '#dc2626',
      gradient: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
      description: 'SSL/TLS certificate validation'
    },
    'rewrite_phase': { 
      icon: '✏️', 
      name: 'Rewrite', 
      color: '#ea580c',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: 'URL rewriting and transformation'
    },
    'access_phase': { 
      icon: '🚪', 
      name: 'Access Control', 
      color: '#0891b2',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: 'Authentication and authorization'
    },
    'request_validation': { 
      icon: '📏', 
      name: 'Request Validation', 
      color: '#7c2d12',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      description: 'Request format and content validation'
    },
    'upstream_forwarded': { 
      icon: '⬆️', 
      name: 'Upstream', 
      color: '#15803d',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      description: 'Request forwarded to upstream service'
    },
    'response_validation': { 
      icon: '📐', 
      name: 'Response Validation', 
      color: '#0369a1',
      gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      description: 'Response format and content validation'
    },
    'header_filter_phase': { 
      icon: '📋', 
      name: 'Header Filter', 
      color: '#7c2d12',
      gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
      description: 'Response header processing'
    },
    'body_filter_phase': { 
      icon: '📄', 
      name: 'Body Filter', 
      color: '#581c87',
      gradient: 'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
      description: 'Response body processing'
    },
    'response_ready': { 
      icon: '✅', 
      name: 'Response Ready', 
      color: '#059669',
      gradient: 'linear-gradient(135deg, #85FFBD 0%, #FFFB7D 100%)',
      description: 'Response ready to send to client'
    }
  };

  // Process debug entries
  const processDebugEntries = () => {
    if (!debugEntries || debugEntries.length === 0) {
      return { entriesByPhase: {}, firstEntry: null, timings: {} };
    }

    const sortedEntries = debugEntries.slice().sort((a, b) => {
      const stepA = a.info && typeof a.info.step === 'number' ? a.info.step : 0;
      const stepB = b.info && typeof b.info.step === 'number' ? b.info.step : 0;
      return stepA - stepB;
    });

    const entriesByPhase = {};
    const timings = {};
    let startTime = null;

    sortedEntries.forEach((entry, index) => {
      const phase = entry.info?.phase || entry.phase || 'unknown';
      
      if (!entriesByPhase[phase]) {
        entriesByPhase[phase] = [];
      }
      entriesByPhase[phase].push(entry);

      // Calculate timings
      const entryTime = new Date(entry.timestamp).getTime();
      if (!startTime) startTime = entryTime;
      timings[phase] = {
        elapsed: entryTime - startTime,
        duration: entry.info?.time_used ? (entry.info.time_used * 1000) : 0
      };
    });

    const firstEntry = sortedEntries[0];
    if (firstEntry) {
      entriesByPhase['client_start'] = [{
        info: {
          phase: 'client_start',
          step: -1,
          method: firstEntry.info?.method || firstEntry.method,
          url: firstEntry.info?.url || firstEntry.info?.uri || firstEntry.url || firstEntry.uri,
          service_name: firstEntry.info?.service_name || firstEntry.service_name,
          client: firstEntry.info?.client || firstEntry.info?.remote_addr || firstEntry.client || firstEntry.remote_addr,
          timestamp: firstEntry.timestamp
        },
        timestamp: firstEntry.timestamp
      }];
      timings['client_start'] = { elapsed: 0, duration: 0 };
    }

    return { entriesByPhase, firstEntry, timings };
  };

  const { entriesByPhase, firstEntry, timings } = processDebugEntries();

  const renderPhase = (phase, index) => {
    const entries = entriesByPhase[phase] || [];
    if (entries.length === 0) return null;
    
    const entry = entries[entries.length - 1];
    const config = PHASE_CONFIG[phase];
    if (!config) return null;
    
    const hasError = entry.info?.status_code > 399 || 
                    entry.info?.plugin_errors?.length > 0 ||
                    phase.includes('failed') ||
                    entry.info?.error;

    const isSelected = selectedPhase === phase;
    const isHovered = hoveredPhase === phase;
    const timing = timings[phase] || { elapsed: 0, duration: 0 };
    
    // Animation progress for this phase
    const phaseProgress = Math.max(0, Math.min(100, (animationProgress - (index * 10))));
    const isAnimating = isPlaying && phaseProgress > 0;

    return (
      <div 
        key={phase}
        className="fancy-phase-step"
        onClick={() => setSelectedPhase(phase)}
        onMouseEnter={() => setHoveredPhase(phase)}
        onMouseLeave={() => setHoveredPhase(null)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
          position: 'relative',
          margin: '10px',
          background: hasError ? 
            'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' : 
            config.gradient,
          boxShadow: isSelected || isHovered ? 
            `0 20px 40px ${config.color}40, 0 8px 16px ${config.color}20` :
            '0 8px 32px rgba(0,0,0,0.12)',
          transform: isSelected ? 'translateY(-8px) scale(1.05)' : 
                    isHovered ? 'translateY(-4px) scale(1.02)' : 
                    isAnimating ? `translateY(-2px) scale(${1 + phaseProgress/1000})` : 
                    'translateY(0) scale(1)',
          border: isSelected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
          animation: isAnimating ? 'pulse 0.6s ease-in-out' : 'none'
        }}
      >
        {/* Animated glow effect */}
        {isAnimating && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            right: '-4px',
            bottom: '-4px',
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${config.color}40, ${config.color}20)`,
            animation: 'glow 0.8s ease-in-out infinite alternate',
            zIndex: -1
          }} />
        )}

        {/* Phase icon */}
        <div style={{ 
          fontSize: '32px', 
          marginBottom: '8px',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease'
        }}>
          {config.icon}
        </div>
        
        {/* Phase name */}
        <div style={{ 
          fontSize: '12px', 
          fontWeight: '600',
          textAlign: 'center', 
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          lineHeight: '1.2'
        }}>
          {config.name}
        </div>

        {/* Timing info */}
        {timing.duration > 0 && (
          <div style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.9)',
            marginTop: '4px',
            background: 'rgba(0,0,0,0.2)',
            padding: '2px 6px',
            borderRadius: '8px'
          }}>
            {timing.duration.toFixed(1)}ms
          </div>
        )}
        
        {/* Error indicator */}
        {hasError && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'linear-gradient(135deg, #ff4757, #ff3742)',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(255,71,87,0.4)',
            animation: 'bounce 1s infinite'
          }}>
            !
          </div>
        )}

        {/* Hover tooltip */}
        {isHovered && (
          <div style={{
            position: 'absolute',
            bottom: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            {config.description}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '8px',
              height: '8px',
              background: 'rgba(0,0,0,0.9)',
              rotate: '45deg'
            }} />
          </div>
        )}
      </div>
    );
  };

  const renderFlowConnections = () => {
    const activePhases = PHASE_ORDER.filter(phase => entriesByPhase[phase]);
    
    return (
      <div style={{ position: 'relative', height: '60px', margin: '20px 0' }}>
        <svg 
          width="100%" 
          height="60" 
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Main flow line */}
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            
            {/* Animated flow */}
            <linearGradient id="animatedFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5">
                <animate attributeName="stop-color" 
                  values="#4f46e5;#7c3aed;#059669;#4f46e5" 
                  dur="3s" 
                  repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#059669">
                <animate attributeName="stop-color" 
                  values="#059669;#4f46e5;#7c3aed;#059669" 
                  dur="3s" 
                  repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          
          <line 
            x1="10%" 
            y1="30" 
            x2="90%" 
            y2="30" 
            stroke="url(#flowGradient)" 
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Animated flow particles */}
          {isPlaying && (
            <>
              <circle r="3" fill="#fff" opacity="0.8">
                <animateMotion dur="2s" repeatCount="indefinite">
                  <path d="M 10% 30 L 90% 30" />
                </animateMotion>
              </circle>
              <circle r="2" fill="#4f46e5" opacity="0.6">
                <animateMotion dur="2.5s" repeatCount="indefinite">
                  <path d="M 10% 30 L 90% 30" />
                </animateMotion>
              </circle>
            </>
          )}
        </svg>
      </div>
    );
  };

  const renderPhaseDetails = () => {
    if (!selectedPhase) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>Select a Phase</h3>
          <p style={{ margin: 0 }}>Click on any phase above to see detailed information</p>
        </div>
      );
    }

    const config = PHASE_CONFIG[selectedPhase];
    const entries = entriesByPhase[selectedPhase] || [];
    const entry = entries[entries.length - 1];
    const timing = timings[selectedPhase] || { elapsed: 0, duration: 0 };
    
    if (!entry || !config) {
      return <p>No data available for this phase</p>;
    }
    
    const hasError = entry.info?.status_code > 399 || 
                    entry.info?.plugin_errors?.length > 0 ||
                    selectedPhase.includes('failed') ||
                    entry.info?.error;

    return (
      <div style={{
        background: `linear-gradient(135deg, ${config.color}10, ${config.color}05)`,
        borderRadius: '16px',
        padding: '24px',
        border: `2px solid ${config.color}20`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '32px',
            marginRight: '12px',
            padding: '8px',
            borderRadius: '12px',
            background: config.gradient
          }}>
            {config.icon}
          </div>
          <div>
            <h3 style={{ 
              margin: '0 0 4px 0', 
              color: '#1e293b',
              fontSize: '20px'
            }}>
              {config.name} {hasError ? '⚠️' : '✅'}
            </h3>
            <p style={{ 
              margin: 0, 
              color: '#64748b',
              fontSize: '14px'
            }}>
              {config.description}
            </p>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>STEP</div>
            <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
              {entry.info?.step || '-'}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>DURATION</div>
            <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
              {timing.duration > 0 ? `${timing.duration.toFixed(2)}ms` : '-'}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>ELAPSED</div>
            <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
              {timing.elapsed > 0 ? `${timing.elapsed}ms` : '-'}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>STATUS</div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: hasError ? '#dc2626' : '#059669'
            }}>
              {entry.info?.status_code || '-'}
            </div>
          </div>
        </div>

        {/* Additional details */}
        {selectedPhase === 'client_start' && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Request Details</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {(() => {
                // Find plugins_loaded phase for request details
                const pluginsLoadedEntry = debugEntries.find(entry => 
                  (entry.info?.phase === 'plugins_loaded' || entry.phase === 'plugins_loaded')
                );
                console.log('🔍 FancyGraphicalDebugView - plugins_loaded entry found:', pluginsLoadedEntry);
                if (pluginsLoadedEntry) {
                  const data = pluginsLoadedEntry.info || pluginsLoadedEntry;
                  console.log('🔍 FancyGraphicalDebugView - Using plugins_loaded data:', data);
                  return (
                    <>
                      <div><strong>Method:</strong> {data.method || '-'}</div>
                      <div><strong>URL:</strong> {data.url || '-'}</div>
                      <div><strong>Client IP:</strong> {data.client || '-'}</div>
                      <div><strong>Service:</strong> {data.service_name || '-'}</div>
                    </>
                  );
                }
                // Fallback to firstEntry if plugins_loaded not found
                console.log('🔍 FancyGraphicalDebugView - Using firstEntry fallback:', firstEntry);
                return (
                  <>
                    <div><strong>Method:</strong> {firstEntry?.info?.method || firstEntry?.method || '-'}</div>
                    <div><strong>URL:</strong> {firstEntry?.info?.url || firstEntry?.url || '-'}</div>
                    <div><strong>Client IP:</strong> {firstEntry?.info?.client || firstEntry?.client || '-'}</div>
                    <div><strong>Service:</strong> {firstEntry?.info?.service_name || firstEntry?.service_name || '-'}</div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Plugin execution info */}
        {entry.info?.plugin_executed && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Plugins Executed</h4>
            <div style={{
              background: 'rgba(255,255,255,0.5)',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace'
            }}>
              {Array.isArray(entry.info.plugin_executed) ? 
                entry.info.plugin_executed.map(pe => pe.plugins ? pe.plugins.join(', ') : '').join(' | ') :
                entry.info.plugin_executed.plugins ? entry.info.plugin_executed.plugins.join(', ') : '-'
              }
            </div>
          </div>
        )}

        {/* Plugin errors */}
        {entry.info?.plugin_errors && entry.info.plugin_errors.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>Plugin Errors</h4>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '12px',
              borderRadius: '8px',
              color: '#dc2626'
            }}>
              {entry.info.plugin_errors.map(err => err.error || err).join(', ')}
            </div>
          </div>
        )}

        {/* JSON details toggle */}
        <details style={{ marginTop: '20px' }}>
          <summary style={{ 
            cursor: 'pointer', 
            fontWeight: '600',
            color: '#1e293b',
            padding: '8px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.5)'
          }}>
            Full JSON Data
          </summary>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            fontSize: '12px',
            overflowX: 'auto',
            marginTop: '12px',
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #334155'
          }}>
            {JSON.stringify(entry.info, null, 2)}
          </div>
        </details>
      </div>
    );
  };

  if (!debugEntries || debugEntries.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        color: 'white',
        margin: '20px 0'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
        <h3 style={{ margin: '0 0 8px 0' }}>No Debug Data</h3>
        <p style={{ margin: 0, opacity: 0.9 }}>No debug data available for visualization</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      borderRadius: '24px',
      padding: '32px',
      margin: '20px 0',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translateY(-2px) scale(1.02); }
          50% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        position: 'relative',
        zIndex: 1
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            color: '#1e293b',
            fontSize: '28px',
            fontWeight: '700'
          }}>
            🎭 Enhanced Request Flow
          </h2>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#64748b' }}>
            <span><strong>Request ID:</strong> {requestId || '-'}</span>
            <span><strong>Method:</strong> {firstEntry?.info?.method || '-'}</span>
            <span><strong>Service:</strong> {firstEntry?.info?.service_name || '-'}</span>
          </div>
        </div>
        
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? 
              'linear-gradient(135deg, #ef4444, #dc2626)' :
              'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {isPlaying ? '⏸️ Pause Animation' : '▶️ Play Animation'}
        </button>
      </div>
      
      {/* Flow visualization */}
      <div style={{ 
        margin: '32px 0', 
        minHeight: '300px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Phase bubbles */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          padding: '20px 0',
          flexWrap: 'wrap'
        }}>
          {PHASE_ORDER.map((phase, index) => renderPhase(phase, index)).filter(Boolean)}
        </div>
        
        {/* Flow connections */}
        {renderFlowConnections()}
      </div>
      
      {/* Phase details */}
      <div style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '16px',
        marginTop: '32px',
        minHeight: '200px',
        position: 'relative',
        zIndex: 1
      }}>
        {renderPhaseDetails()}
      </div>
    </div>
  );
};

export default FancyGraphicalDebugView;
