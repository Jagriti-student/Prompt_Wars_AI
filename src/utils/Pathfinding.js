export const STADIUM_GRAPH = {
  "Gate 1": { "Corridor A": { d: 20, stairs: false } },
  "Gate 2": { "Corridor B": { d: 20, stairs: false } },
  "Corridor A": { 
    "Gate 1": { d: 20, stairs: false }, 
    "North Stand": { d: 30, stairs: true }, 
    "Food Court 1": { d: 15, stairs: false }, 
    "Corridor C": { d: 40, stairs: false } 
  },
  "Corridor B": { 
    "Gate 2": { d: 20, stairs: false }, 
    "South Stand": { d: 30, stairs: true }, 
    "Washrooms": { d: 10, stairs: false }, 
    "Corridor C": { d: 40, stairs: false } 
  },
  "Corridor C": { 
    "Corridor A": { d: 40, stairs: false }, 
    "Corridor B": { d: 40, stairs: false }, 
    "East Stand": { d: 25, stairs: true }, 
    "West Stand": { d: 25, stairs: true },
    "Emergency Exit A": { d: 30, stairs: false } 
  },
  "North Stand": { "Corridor A": { d: 30, stairs: true } },
  "South Stand": { "Corridor B": { d: 30, stairs: true } },
  "East Stand": { "Corridor C": { d: 25, stairs: true } },
  "West Stand": { "Corridor C": { d: 25, stairs: true } },
  "Food Court 1": { "Corridor A": { d: 15, stairs: false } },
  "Washrooms": { "Corridor B": { d: 10, stairs: false } },
  "Emergency Exit A": { 
    "Corridor A": { d: 10, stairs: true }, 
    "West Stand": { d: 15, stairs: true },
    "Corridor C": { d: 30, stairs: false }
  },
  "Emergency Exit B": { 
    "Corridor B": { d: 10, stairs: true }, 
    "East Stand": { d: 15, stairs: true } 
  },
};

export const POIs = {
  gates: ["Gate 1", "Gate 2"],
  stands: ["North Stand", "South Stand", "East Stand", "West Stand"],
  amenities: ["Food Court 1", "Washrooms"],
  food: ["Food Court 1"],
  washrooms: ["Washrooms"],
  exits: ["Emergency Exit A", "Emergency Exit B"]
};

export const NODE_LAYOUT = {
  "Gate 1": { x: 20, y: 10 },
  "Gate 2": { x: 80, y: 10 },
  "Corridor A": { x: 20, y: 35 },
  "Corridor B": { x: 80, y: 35 },
  "Corridor C": { x: 50, y: 50 },
  "North Stand": { x: 20, y: 70 },
  "South Stand": { x: 80, y: 70 },
  "East Stand": { x: 80, y: 50 },
  "West Stand": { x: 20, y: 50 },
  "Food Court 1": { x: 40, y: 25 },
  "Washrooms": { x: 60, y: 25 },
  "Emergency Exit A": { x: 5, y: 50 },
  "Emergency Exit B": { x: 95, y: 50 }
};

export function findShortestPath(start, end, crowdDensities = {}, pref = "fastest") {
  const distances = {};
  const previous = {};
  const queue = new Set();
  
  if (start === end) return { path: [start], totalTime: 0, pref };

  for (let node in STADIUM_GRAPH) {
    distances[node] = Infinity;
    queue.add(node);
  }
  distances[start] = 0;

  while (queue.size > 0) {
    let current = null;
    for (let node of queue) {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    }

    if (current === end) break;
    queue.delete(current);

    if (distances[current] === Infinity) break;

    for (let neighbor in STADIUM_GRAPH[current]) {
      const edge = STADIUM_GRAPH[current][neighbor];
      const baseDistance = edge.d;
      
      // FAIL-SAFE: If sensor is offline (null), assume cautious moderate crowd (2.2) to prevent reckless routing
      let crowdMod = crowdDensities[neighbor];
      if (crowdMod === null || crowdMod === undefined) crowdMod = 2.2;
      
      if (pref === "accessible" && edge.stairs) continue;
      if (pref === "safest" && crowdMod >= 4.0 && neighbor !== end) continue;
      if (crowdMod >= 8.0 && neighbor !== end) crowdMod = 999; 

      let penalty = crowdMod;
      if (pref === "fastest") penalty = Math.pow(crowdMod, 1.2); 
      else if (pref === "least_crowded") penalty = Math.pow(crowdMod, 3.0);
      else if (pref === "safest") penalty = Math.pow(crowdMod, 2.0); 
      
      const alt = distances[current] + (baseDistance * penalty);

      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  const path = [];
  let current = end;
  while (current) {
    path.unshift(current);
    current = previous[current];
  }
  
  if (path[0] === start && distances[end] < 10000) {
    return { path, totalTime: distances[end], pref };
  }
  return { path: [], totalTime: Infinity, pref };
}

export function findNearestExit(start, crowdDensities = {}) {
  let bestExit = null;
  let bestTime = Infinity;
  let bestPath = [];

  for (let exit of POIs.exits) {
    const result = findShortestPath(start, exit, crowdDensities, "safest");
    if (result.totalTime < bestTime) {
      bestTime = result.totalTime;
      bestExit = exit;
      bestPath = result.path;
    }
  }
  return { exit: bestExit, path: bestPath, time: bestTime };
}

export function findBestAmenity(start, type, crowdDensities = {}, queues = {}, pref = "fastest") {
  const targets = POIs[type] || [];
  let bestTarget = null;
  let bestScore = Infinity;
  let bestData = null;

  for(let target of targets) {
    const nav = findShortestPath(start, target, crowdDensities, pref);
    if (nav.path.length > 0) {
      const walkTimeMinutes = Math.round(nav.totalTime / 10);
      const queueTimeMinutes = queues[target] || 0;
      
      let score = walkTimeMinutes + queueTimeMinutes;
      if (pref === "least_crowded") score += (queueTimeMinutes * 5);
      
      if (score < bestScore) {
         bestScore = score;
         bestTarget = target;
         bestData = { ...nav, queueTime: queueTimeMinutes };
      }
    }
  }
  return { target: bestTarget, ...bestData, score: bestScore };
}

// AI Confidence scoring
export function calculateConfidence(path, densities = {}, predictive = {}) {
  if (!path || path.length === 0) return { safetyScore: 0, speedScore: 0, text: "No viable path." };
  
  let safetyScore = 100;
  let speedScore = 100;
  let riskFound = false;
  let offlineFound = false;
  
  path.forEach(node => {
     let d = densities[node];
     if (d === null) {
        offlineFound = true;
        safetyScore -= 10;
        speedScore -= 15;
     } else {
        if (d >= 8.0) safetyScore -= 40;
        else if (d >= 6.0) safetyScore -= 25;
        else if (d >= 4.0) safetyScore -= 15;
        
        if (d >= 2.0) speedScore -= 5;
     }
     
     if (predictive[node] && predictive[node] > 4.0) {
        safetyScore -= 15;
        riskFound = true;
     }
  });

  safetyScore = Math.max(0, Math.round(safetyScore));
  speedScore = Math.max(0, Math.round(speedScore));

  let text = "Stable route. Normal flow.";
  if (safetyScore > 80 && speedScore > 80) text = "Clear path ahead. Low crowds + stable history.";
  else if (offlineFound) text = "Reliant on predictive fallback (Sensors Offline). Variable speed.";
  else if (riskFound) text = "Forecasted congestion ahead. Proceed cautiously.";
  else if (safetyScore < 60) text = "Significant crowding detected. Flow compromised.";
  
  return { safetyScore, speedScore, text };
}
