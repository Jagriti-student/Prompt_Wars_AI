import React from 'react';
import { MapPin } from 'lucide-react';
import { NODE_LAYOUT, STADIUM_GRAPH } from '../utils/Pathfinding';

export default function StadiumMap({ densities, queues, activePath = [], currentLocation = "Gate 1", selectedDest = null, onSelectNode, lostPersonNode = null }) {
  
  const getNodeColor = (nodeId) => {
    const val = densities[nodeId];
    if (val === null || val === undefined) return '#a3a3a3'; // Offline
    if (val >= 4.0) return 'var(--danger)';
    if (val >= 2.0) return 'var(--accent-cyan)';
    return 'var(--success)';
  };

  const getEdgeStyle = (source, target) => {
    const isPath = activePath.includes(source) && activePath.includes(target);
    const posSource = activePath.indexOf(source);
    const posTarget = activePath.indexOf(target);
    const isNext = isPath && Math.abs(posSource - posTarget) === 1;
    
    return {
      stroke: isNext ? 'var(--accent-blue)' : 'var(--border-muted)',
      width: isNext ? 4 : 2,
      dash: isNext ? '8, 6' : 'none',
      flowClass: isNext ? (posSource < posTarget ? 'flow-forward' : 'flow-reverse') : ''
    };
  };

  const renderEdges = () => {
    const edges = [];
    const drawn = new Set();
    
    Object.keys(STADIUM_GRAPH).forEach(source => {
      Object.keys(STADIUM_GRAPH[source]).forEach(target => {
        const pair = [source, target].sort().join('-');
        if (!drawn.has(pair)) {
          drawn.add(pair);
          const p1 = NODE_LAYOUT[source];
          const p2 = NODE_LAYOUT[target];
          const style = getEdgeStyle(source, target);
          const edgeDensity = (densities[source] + densities[target]) / 2 || 1;
          const particleCount = Math.floor(edgeDensity / 2) + 1;

          edges.push(
            <g key={pair}>
              <line 
                x1={`${p1.x}%`} y1={`${p1.y}%`} 
                x2={`${p2.x}%`} y2={`${p2.y}%`} 
                stroke={style.stroke}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                className={style.flowClass}
                opacity={0.6}
              />
              {/* Moving Crowd Particles */}
              {[...Array(particleCount)].map((_, i) => (
                <circle key={`${pair}-p-${i}`} r="1.5" fill="var(--accent-cyan)" className="particle-flow">
                  <animateMotion 
                    dur={`${6 / edgeDensity}s`} 
                    repeatCount="indefinite"
                    begin={`${i * (2/particleCount)}s`}
                    path={`M ${p1.x},${p1.y} L ${p2.x},${p2.y}`}
                  />
                </circle>
              ))}
              {/* Arrows for active path */}
              {style.flowClass && (
                 <circle r="3" fill="var(--accent-blue)" style={{ filter: 'drop-shadow(0 0 5px var(--accent-blue))' }}>
                    <animateMotion 
                      dur="1.5s" 
                      repeatCount="indefinite"
                      path={style.flowClass === 'flow-forward' ? `M ${p1.x},${p1.y} L ${p2.x},${p2.y}` : `M ${p2.x},${p2.y} L ${p1.x},${p1.y}`}
                    />
                 </circle>
              )}
            </g>
          );
        }
      });
    });
    return edges;
  };

  return (
    <div className="stadium-map-container">
      <svg className="map-lines" width="100%" height="100%">
        {renderEdges()}
      </svg>
      
      {Object.entries(NODE_LAYOUT).map(([nodeId, pos]) => {
        const isCurrent = nodeId === currentLocation;
        const isDest = nodeId === selectedDest;
        const isOnPath = activePath.includes(nodeId);
        const isOffline = densities[nodeId] === null;
        const isDangerous = densities[nodeId] >= 7.0;
        const isLostPerson = nodeId === lostPersonNode;
        
        return (
          <div 
            key={nodeId} 
            className={`map-node ${isCurrent ? 'current-loc' : ''} ${isDest ? 'dest-loc' : ''} ${isOnPath ? 'on-path' : ''} ${isOffline ? 'offline-pulse' : ''} ${isDangerous ? 'danger-zone-pulse' : ''} ${isLostPerson ? 'lost-person-pulse' : ''}`}
            style={{ 
              left: `${pos.x}%`, 
              top: `${pos.y}%`,
              backgroundColor: isLostPerson ? '#fbbf24' : getNodeColor(nodeId),
              borderColor: isLostPerson ? '#d97706' : (isCurrent ? 'var(--pin-color)' : (isOnPath ? 'var(--accent-cyan)' : 'var(--border-muted)'))
            }}
            onClick={() => onSelectNode && onSelectNode(nodeId)}
          >
            {isCurrent && <MapPin fill="var(--pin-color)" size={16} stroke={isCurrent ? "transparent" : "#000"} className="pin-icon" />}
            <span className="node-label" style={{ color: isOffline ? '#888' : 'var(--text-main)', textDecoration: isOffline ? 'line-through' : 'none' }}>{nodeId}</span>
            {queues[nodeId] !== undefined && (
              <div className="queue-indicator" style={{ opacity: isOffline ? 0.3 : 1 }}>{queues[nodeId]}m queue</div>
            )}
          </div>
        );
      })}

      <style>{`
        .stadium-map-container {
          position: relative;
          width: 100%;
          border-radius: 12px;
          background-color: #0d1117;
          border: 1px solid var(--border-muted);
          overflow: hidden;
          min-height: 380px;
        }
        .map-lines { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 1; }
        .map-node {
          position: absolute;
          width: 14px; height: 14px;
          margin-left: -7px; margin-top: -7px;
          border-radius: 50%; border: 2px solid;
          z-index: 10; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .offline-pulse {
          animation: opulse 2s infinite ease-in-out;
        }
        @keyframes opulse {
          0% { opacity: 0.3; transform: scale(1); } 
          50% { opacity: 0.8; transform: scale(1.1); } 
          100% { opacity: 0.3; transform: scale(1); }
        }
        .flow-forward { animation: dflow 1s linear infinite reverse; }
        .flow-reverse { animation: dflow 1s linear infinite; }
        @keyframes dflow {
          to { stroke-dashoffset: 14; }
        }
        .node-label {
          position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
          font-size: 0.65rem; white-space: nowrap; font-weight: 500;
          color: var(--text-main); background: rgba(0,0,0,0.6); padding: 2px 4px; border-radius: 4px; z-index: 50;
        }
        .queue-indicator {
          position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
          font-size: 0.6rem; white-space: nowrap; font-weight: bold;
          color: var(--warning); background: rgba(0,0,0,0.8); padding: 1px 4px; border-radius: 4px;
        }
        .lost-person-pulse {
          animation: gold-pulse 1s infinite alternate;
          z-index: 100;
          box-shadow: 0 0 20px #fbbf24;
        }
        @keyframes gold-pulse {
          from { transform: scale(1); filter: brightness(1); }
          to { transform: scale(1.4); filter: brightness(1.5); }
        }
      `}</style>
    </div>
  );
}
