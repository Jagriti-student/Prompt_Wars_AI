import { STADIUM_GRAPH, POIs } from './Pathfinding';

export class SimulationEngine {
  constructor(onUpdate) {
    this.intervalId = null;
    this.onUpdate = onUpdate;
    this.densities = this.initializeDensities();
    this.queues = this.initializeQueues();
    this.history = {}; 
    
    Object.keys(STADIUM_GRAPH).forEach(node => {
      this.history[node] = [1.0, 1.0, 1.0];
    });
  }

  initializeDensities() {
    const d = {};
    Object.keys(STADIUM_GRAPH).forEach(node => { d[node] = 1.0; });
    return d;
  }

  initializeQueues() {
    return { "Gate 1": 5, "Gate 2": 4, "Food Court 1": 8, "Washrooms": 2 };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTick = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  loop() {
    if (!this.isRunning) return;
    
    const now = performance.now();
    if (now - this.lastTick >= 4000) {
      this.tick();
      this.lastTick = now;
    }
    
    requestAnimationFrame(() => this.loop());
  }

  tick() {
    let stateChanged = false;
    let alerts = [];

    // Queue fluctuations
    for (let key in this.queues) {
      const change = Math.floor(Math.random() * 5) - 2;
      const newVal = Math.max(0, this.queues[key] + change);
      if (this.queues[key] !== newVal) {
        this.queues[key] = newVal;
        stateChanged = true;
      }
    }

    const nodes = Object.keys(this.densities);

    // AI SIMULATION: Organic Swarm Flow
    // Find the most congested node, and flow its crowd to a random connected neighbor
    let mostCongested = nodes[0];
    nodes.forEach(n => {
      // Ignore offline sensors for flow calc
      if (this.densities[n] !== null && (this.densities[n] > this.densities[mostCongested] || this.densities[mostCongested] === null)) {
        mostCongested = n;
      }
    });

    if (this.densities[mostCongested] > 1.5) {
       const neighbors = Object.keys(STADIUM_GRAPH[mostCongested]);
       if (neighbors.length > 0) {
         const targetFlow = neighbors[Math.floor(Math.random() * neighbors.length)];
         if (this.densities[targetFlow] !== null && !targetFlow.includes("Emergency Exit")) {
            // Transfer density (Flow)
            this.densities[targetFlow] = Math.min(10.0, this.densities[targetFlow] + 1.5);
            this.densities[mostCongested] = Math.max(1.0, this.densities[mostCongested] - 1.0);
            stateChanged = true;
         }
       }
    }

    // AI SIMULATION: Random injection to simulate new entrants
    if (Math.random() > 0.6) {
      const injectTarget = POIs.gates[Math.floor(Math.random() * POIs.gates.length)];
      if (this.densities[injectTarget] !== null) {
        this.densities[injectTarget] = Math.min(8.0, this.densities[injectTarget] + 2.0);
        stateChanged = true;
      }
    }
    
    // Recovery (dissipation)
    const clearNode = nodes[Math.floor(Math.random() * nodes.length)];
    if (Math.random() > 0.4 && this.densities[clearNode] !== null && this.densities[clearNode] > 1.0) {
      this.densities[clearNode] = Math.max(1.0, this.densities[clearNode] - 1.5);
      stateChanged = true;
    }

    // FAIL-SAFE SIMULATION: Sensor Dropout
    // 5% chance a random sensor goes temporarily offline (null), or comes back online
    const sensorTarget = nodes[Math.floor(Math.random() * nodes.length)];
    if (Math.random() > 0.95) {
      if (this.densities[sensorTarget] !== null && !sensorTarget.includes("Emergency Exit")) {
        this.densities[sensorTarget] = null; // offline
        alerts.push(`Sensor offline at ${sensorTarget}. Using predictive fallback.`);
      } else if (this.densities[sensorTarget] === null) {
        this.densities[sensorTarget] = 1.0; // Restored
      }
      stateChanged = true;
    }

    // Check for Critical Alerts
    nodes.forEach(n => {
       if (this.densities[n] >= 8.0) alerts.push(`CRITICAL: Overcrowding at ${n}.`);
    });

    // Update historical learning matrix
    Object.keys(this.densities).forEach(node => {
      this.history[node].shift();
      // If offline, use last known history value
      const val = this.densities[node] !== null ? this.densities[node] : this.history[node][1];
      this.history[node].push(val);
    });

    if (stateChanged && this.onUpdate) {
      const predictive = {};
      Object.keys(this.densities).forEach(node => {
        const hist = this.history[node];
        if (hist[0] < hist[1] && hist[1] < hist[2]) {
          predictive[node] = hist[2] * 1.5; 
        } else {
          predictive[node] = hist[2];
        }
      });

      this.onUpdate({
        densities: { ...this.densities },
        queues: { ...this.queues },
        predictive,
        alerts
      });
    }
  }
}
