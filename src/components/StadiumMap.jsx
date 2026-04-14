import React, { useState, useCallback, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { NODE_LAYOUT, STADIUM_GRAPH } from '../utils/Pathfinding';

// Premium Dark Theme for Google Maps
const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px',
  border: '1px solid var(--border-muted)'
};

// Map center (adjust to a real stadium location if needed)
const center = { lat: 28.6139, lng: 77.2090 };

export default function StadiumMap({ 
  densities, 
  queues, 
  activePath = [], 
  currentLocation = "Gate 1", 
  selectedDest = null, 
  onSelectNode, 
  lostPersonNode = null 
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const [map, setMap] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Memoize LatLngs to ensure stable object references
  const nodeLatLngs = useMemo(() => {
    const coords = {};
    Object.keys(NODE_LAYOUT).forEach(nodeId => {
      const pos = NODE_LAYOUT[nodeId];
      coords[nodeId] = {
        lat: center.lat + (pos.y - 50) * 0.0001,
        lng: center.lng + (pos.x - 50) * 0.0001
      };
    });
    return coords;
  }, []);

  const getNodeColor = (nodeId) => {
    const val = densities[nodeId];
    if (val === null || val === undefined) return '#a3a3a3'; 
    if (val >= 8.0) return '#ef4444'; 
    if (val >= 4.0) return '#f59e0b'; 
    return '#10b981'; 
  };

  // Memoize Edges to prevent unnecessary re-renders of Polyline components
  const edges = useMemo(() => {
    const drawnEdges = new Set();
    const result = [];
    Object.keys(STADIUM_GRAPH).forEach(source => {
      Object.keys(STADIUM_GRAPH[source]).forEach(target => {
        const pair = [source, target].sort().join('-');
        if (!drawnEdges.has(pair) && nodeLatLngs[source] && nodeLatLngs[target]) {
          drawnEdges.add(pair);
          
          const isPath = activePath.includes(source) && activePath.includes(target);
          const posSource = activePath.indexOf(source);
          const posTarget = activePath.indexOf(target);
          const isNext = isPath && Math.abs(posSource - posTarget) === 1;

          result.push({
            id: pair,
            path: [nodeLatLngs[source], nodeLatLngs[target]],
            isNext
          });
        }
      });
    });
    return result;
  }, [activePath, nodeLatLngs]);

  if (!isLoaded) return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', borderRadius: '12px', color: 'var(--text-muted)' }}>Loading Maps Engine...</div>;

  return (
    <div className="stadium-map-container" style={{ position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={18}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy'
        }}
      >
        {/* Render Stadium Edges */}
        {edges.map(edge => (
          <Polyline
            key={edge.id}
            path={edge.path}
            options={{
              strokeColor: edge.isNext ? "#3b82f6" : "#475569",
              strokeOpacity: edge.isNext ? 1 : 0.4,
              strokeWeight: edge.isNext ? 5 : 3,
              zIndex: edge.isNext ? 10 : 1
            }}
          />
        ))}

        {/* Render Stadium Nodes */}
        {Object.entries(nodeLatLngs).map(([nodeId, position]) => {
          const isCurrent = nodeId === currentLocation;
          const isDest = nodeId === selectedDest;
          const isLost = nodeId === lostPersonNode;
          const color = isLost ? '#fbbf24' : (isCurrent ? '#3b82f6' : (isDest ? '#10b981' : getNodeColor(nodeId)));
          
          // Safer access to google maps constants
          const circlePath = window.google?.maps?.SymbolPath?.CIRCLE ?? 0;

          return (
            <Marker
              key={nodeId}
              position={position}
              onClick={() => onSelectNode && onSelectNode(nodeId)}
              onMouseOver={() => setHoveredNode(nodeId)}
              onMouseOut={() => setHoveredNode(null)}
              label={{
                 text: nodeId,
                 color: "white",
                 fontSize: "10px",
                 className: "map-marker-label"
              }}
              icon={{
                path: circlePath,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
                scale: isCurrent || isDest || isLost ? 9 : 6,
              }}
            />
          );
        })}

        {hoveredNode && nodeLatLngs[hoveredNode] && (
          <InfoWindow position={nodeLatLngs[hoveredNode]}>
            <div style={{ color: 'black', padding: '5px' }}>
              <strong>{hoveredNode}</strong>
              <div>Density: {densities[hoveredNode] || 'N/A'}</div>
              {queues[hoveredNode] && <div>Queue: {queues[hoveredNode]} min</div>}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <style>{`
        .map-marker-label {
           background: rgba(0,0,0,0.7);
           padding: 2px 4px;
           border-radius: 4px;
           transform: translateY(-25px);
        }
      `}</style>
    </div>
  );
}
