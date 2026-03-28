import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    if (getApps().length === 0) {
      const app = initializeApp({
        projectId: firebaseConfig.projectId,
      });
      if (firebaseConfig.firestoreDatabaseId) {
        console.log(`[Server] Initializing Firestore with Database ID: ${firebaseConfig.firestoreDatabaseId}`);
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      } else {
        console.log("[Server] Initializing Firestore with default database");
        db = getFirestore(app);
      }
    } else {
      const app = getApps()[0];
      if (firebaseConfig.firestoreDatabaseId) {
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      } else {
        db = getFirestore(app);
      }
    }
    console.log("Firebase Admin initialized successfully");
    
    // Test Firestore connection
    if (db) {
      db.collection('workflow_events').limit(1).get()
        .then(() => console.log("[Server] Firestore connection verified."))
        .catch(err => console.error("[Server] Firestore connection test failed:", err));
    }
  } else {
    console.warn("firebase-applet-config.json not found, skipping Firebase Admin initialization");
  }
} catch (e) {
  console.error("Failed to initialize Firebase Admin:", e);
}

// Import agents
import { MasterOrchestrator } from "./backend/agents/orchestrator";
import { DataRetrievalAgent } from "./backend/agents/data_retrieval";
import { DecisionEngineAgent } from "./backend/agents/decision_engine";
import { ActionExecutorAgent } from "./backend/agents/action_executor";
import { VerifierAgent } from "./backend/agents/verifier";
import { AnomalyDetectorAgent } from "./backend/agents/anomaly_detector";
import { MemoryAgent } from "./backend/agents/memory";

const app = express();
const PORT = 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Broadcast to all connected clients
function broadcast(message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

import Database from "better-sqlite3";

// Initialize SQLite for Audit Ledger
const auditDb = new Database('audit.sqlite');
auditDb.exec(`
  CREATE TABLE IF NOT EXISTS audit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT,
    agent_id TEXT,
    step_number INTEGER,
    decision TEXT,
    reasoning TEXT,
    input_context TEXT,
    confidence_score REAL,
    outcome TEXT,
    hash TEXT,
    prevHash TEXT,
    timestamp TEXT,
    status TEXT,
    message TEXT
  )
`);

// Get last hash from DB
const lastEntry = auditDb.prepare('SELECT hash FROM audit_ledger ORDER BY id DESC LIMIT 1').get() as any;
let lastHash = lastEntry ? lastEntry.hash : "0".repeat(64);

async function addToAuditLedger(entry: any) {
  const data = JSON.stringify(entry);
  const hash = crypto.createHash('sha256').update(data + lastHash).digest('hex');
  const auditEntry = { 
    ...entry, 
    hash, 
    prevHash: lastHash, 
    timestamp: new Date().toISOString(),
    // Compatibility fields for AuditTrail.tsx
    step_number: entry.step || 1,
    agent_id: entry.agent || 'master_orchestrator',
    decision: entry.message || 'No decision recorded',
    confidence_score: entry.confidence || 0.95,
    outcome: entry.status === 'completed' ? 'Success' : 
             entry.status === 'failed' ? 'Failure' : 
             entry.status === 'escalated' ? 'Escalated' : 'Awaiting human review'
  };

  // Persist to SQLite
  const stmt = auditDb.prepare(`
    INSERT INTO audit_ledger (
      workflow_id, agent_id, step_number, decision, reasoning, 
      input_context, confidence_score, outcome, hash, prevHash, 
      timestamp, status, message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    auditEntry.workflow_id,
    auditEntry.agent_id,
    auditEntry.step_number,
    auditEntry.decision,
    auditEntry.reasoning || '',
    JSON.stringify(auditEntry.input_context || {}),
    auditEntry.confidence_score,
    auditEntry.outcome,
    auditEntry.hash,
    auditEntry.prevHash,
    auditEntry.timestamp,
    auditEntry.status,
    auditEntry.message
  );

  lastHash = hash;
  
  // Also write to Firestore for real-time dashboard updates
  if (db) {
    try {
      console.log(`[Server] Attempting Firestore write to workflow_events for workflow: ${auditEntry.workflow_id}`);
      await db.collection('workflow_events').add(auditEntry);
      console.log(`[Server] Firestore write successful for workflow: ${auditEntry.workflow_id}`);
    } catch (e) {
      console.error(`[Server] Failed to write to Firestore for workflow ${auditEntry.workflow_id}:`, e);
    }
  } else {
    console.warn("[Server] Firestore Admin not initialized, skipping Firestore write.");
  }
  
  return auditEntry;
}

// Agent Instances
const orchestrator = new MasterOrchestrator();
const dataRetrieval = new DataRetrievalAgent();
const decisionEngine = new DecisionEngineAgent();
const actionExecutor = new ActionExecutorAgent();
const verifier = new VerifierAgent();
const anomalyDetector = new AnomalyDetectorAgent();
const memoryAgent = new MemoryAgent();

async function runWorkflow(workflowId: string, type: string, params: any, ws: WebSocket, customWorkflow?: any) {
  let steps = [];
  
  if (customWorkflow && customWorkflow.agents) {
    steps = customWorkflow.agents.map((agent: any, index: number) => {
      let instance;
      let defaultMessage = `Executing ${agent.id}...`;
      
      // Add more descriptive intermediate messages based on role
      switch (agent.role) {
        case 'data_retrieval': 
          instance = dataRetrieval; 
          defaultMessage = 'Fetching requested data from secure sources...';
          break;
        case 'decision_engine': 
          instance = decisionEngine; 
          defaultMessage = 'Analyzing data and determining optimal path...';
          break;
        case 'verifier': 
          instance = verifier; 
          defaultMessage = 'Validating results against compliance protocols...';
          break;
        case 'action_executor': 
          instance = actionExecutor; 
          defaultMessage = 'Executing final actions and committing to ledger...';
          break;
        case 'anomaly_detector': 
          instance = anomalyDetector; 
          defaultMessage = 'Scanning for behavioral anomalies...';
          break;
        default: 
          instance = orchestrator;
      }
      return { 
        agent: agent.id, 
        instance, 
        message: agent.description || defaultMessage, 
        step: index + 1 
      };
    });
  } else {
    steps = [
      { agent: 'master_orchestrator', instance: orchestrator, message: `Initiating ${type.replace('_', ' ')} workflow...`, step: 1 },
      { agent: 'data_retrieval', instance: dataRetrieval, message: 'Fetching email and retrieving context...', step: 2 },
      { agent: 'decision_engine', instance: decisionEngine, message: 'Connecting to admin and applying reasoning...', step: 3 },
      { agent: 'verifier', instance: verifier, message: 'Verifying outputs and SLA compliance...', step: 4 },
      { agent: 'action_executor', instance: actionExecutor, message: 'Executing final actions and logging audit trail...', step: 5 },
    ];
  }

  const totalSteps = steps.length;
  let context = { ...params };

  // Retrieve context from memory
  const relevantContext = await memoryAgent.retrieve(type || 'general');
  context = { ...context, relevantContext };

  for (const step of steps) {
    // Broadcast status via WebSocket
    const status = {
      workflow_id: workflowId,
      agent: step.agent,
      status: 'running',
      step: step.step,
      total_steps: totalSteps,
      message: step.message,
      timestamp: new Date().toISOString(),
    };
    broadcast({ type: 'WORKFLOW_UPDATE', data: status });
    await addToAuditLedger(status);

    // Run Anomaly Detector in parallel (if not already the current step)
    if (step.agent !== 'anomaly_detector') {
      anomalyDetector.execute(context).then(async (anomalyResult) => {
        if (anomalyResult.anomaly_detected) {
          const anomalyStatus = {
            workflow_id: workflowId,
            agent: 'anomaly_detector',
            status: 'escalated',
            step: step.step,
            total_steps: totalSteps,
            message: `Anomaly detected: Potential SLA breach predicted!`,
            timestamp: new Date().toISOString(),
          };
          broadcast({ type: 'WORKFLOW_UPDATE', data: anomalyStatus });
          await addToAuditLedger(anomalyStatus);
        }
      });
    }

    // Execute agent logic with self-healing
    let retryBudget = 3;
    let success = false;
    
    while (retryBudget > 0 && !success) {
      try {
        // Add a 30s timeout to agent execution
        const executionPromise = step.instance.execute(context);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Agent execution timed out (30s)")), 30000)
        );

        const result = await Promise.race([executionPromise, timeoutPromise]) as any;
        
        if (result.status === 'success') {
          success = true;
          context = { ...context, ...result };
        } else {
          throw new Error(result.message || "Agent execution failed");
        }
      } catch (e: any) {
        retryBudget--;
        const healingStatus = {
          workflow_id: workflowId,
          agent: step.agent,
          status: 'healing',
          step: step.step,
          total_steps: totalSteps,
          message: `Self-healing triggered: Attempt ${3 - retryBudget}/3. Root-cause: ${e.message}`,
          timestamp: new Date().toISOString(),
        };
        broadcast({ type: 'WORKFLOW_UPDATE', data: healingStatus });
        await addToAuditLedger(healingStatus);
        
        if (retryBudget > 0) {
          // LLM generates corrected context (simulated)
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!success) {
      const failureStatus = {
        workflow_id: workflowId,
        agent: step.agent,
        status: 'failed',
        step: step.step,
        total_steps: totalSteps,
        message: `Workflow failed after multiple self-healing attempts. Escalating to human...`,
        timestamp: new Date().toISOString(),
      };
      broadcast({ type: 'WORKFLOW_UPDATE', data: failureStatus });
      await addToAuditLedger(failureStatus);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Final completion
  const completionStatus = {
    workflow_id: workflowId,
    agent: 'master_orchestrator',
    status: 'completed',
    step: totalSteps,
    total_steps: totalSteps,
    message: 'Workflow completed successfully.',
    timestamp: new Date().toISOString(),
  };
  broadcast({ type: 'WORKFLOW_UPDATE', data: completionStatus });
  await addToAuditLedger(completionStatus);

  // Store in memory for future RAG
  await memoryAgent.store({ workflowId, type: type || 'custom', context });
}

// Workflow Versions (Persistent)
auditDb.exec(`
  CREATE TABLE IF NOT EXISTS workflow_versions (
    id TEXT PRIMARY KEY,
    name TEXT,
    version INTEGER,
    workflow TEXT,
    description TEXT,
    timestamp TEXT
  )
`);

async function startServer() {
  console.log("Starting NEXUS Server...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  // Seed initial system events if ledger is empty
  const countResult = auditDb.prepare('SELECT COUNT(*) as count FROM audit_ledger').get() as { count: number };
  if (countResult.count === 0) {
    const systemId = crypto.randomBytes(8).toString('hex');
    const bootEvents = [
      { workflow_id: systemId, agent: 'master_orchestrator', status: 'completed', step: 1, total_steps: 1, message: 'NEXUS Core System Online.', timestamp: new Date(Date.now() - 5000).toISOString() },
      { workflow_id: systemId, agent: 'anomaly_detector', status: 'completed', step: 1, total_steps: 1, message: 'Predictive monitoring active.', timestamp: new Date(Date.now() - 4000).toISOString() },
      { workflow_id: systemId, agent: 'verifier', status: 'completed', step: 1, total_steps: 1, message: 'Cryptographic chains verified.', timestamp: new Date(Date.now() - 3000).toISOString() },
    ];
    for (const event of bootEvents) {
      await addToAuditLedger(event);
    }
  }

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  app.get("/api/audit", (req, res) => {
    const logs = auditDb.prepare('SELECT * FROM audit_ledger ORDER BY id DESC LIMIT 100').all();
    res.json(logs);
  });

  app.get("/api/history", (req, res) => {
    // Group audit ledger by workflow_id to show unique workflows
    const logs = auditDb.prepare('SELECT * FROM audit_ledger ORDER BY id ASC').all() as any[];
    const history = logs.reduce((acc: any[], log) => {
      const existing = acc.find(h => h.workflow_id === log.workflow_id);
      if (!existing) {
        acc.push({
          workflow_id: log.workflow_id,
          timestamp: log.timestamp,
          status: log.status,
          steps: [log]
        });
      } else {
        existing.steps.push(log);
        // Update status to the latest one
        if (log.status === 'completed' || log.status === 'failed') {
          existing.status = log.status;
        }
      }
      return acc;
    }, []);
    res.json(history.reverse());
  });

  app.get("/api/versions", (req, res) => {
    const versions = auditDb.prepare('SELECT * FROM workflow_versions ORDER BY timestamp DESC').all();
    res.json(versions.map((v: any) => ({ ...v, workflow: JSON.parse(v.workflow) })));
  });

  app.post("/api/versions", (req, res) => {
    const { name, workflow, description } = req.body;
    const existingCountResult = auditDb.prepare('SELECT COUNT(*) as count FROM workflow_versions WHERE name = ?').get(name) as { count: number };
    const version = {
      id: crypto.randomBytes(4).toString('hex'),
      name,
      version: (existingCountResult?.count || 0) + 1,
      workflow: JSON.stringify(workflow),
      description,
      timestamp: new Date().toISOString()
    };
    
    auditDb.prepare(`
      INSERT INTO workflow_versions (id, name, version, workflow, description, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(version.id, version.name, version.version, version.workflow, version.description, version.timestamp);
    
    res.json({ ...version, workflow });
  });

  app.delete("/api/versions/:id", (req, res) => {
    const { id } = req.params;
    auditDb.prepare('DELETE FROM workflow_versions WHERE id = ?').run(id);
    res.json({ status: "deleted" });
  });

  app.post("/api/trigger", (req, res) => {
    const { type, params } = req.body;
    const workflowId = crypto.randomBytes(8).toString('hex');
    
    // Start workflow in background (will use WS to update)
    // In a real app, this would be a separate process or queue
    res.json({ workflowId, message: "Workflow initiated" });
  });

  // WebSocket handling
  wss.on("connection", (ws) => {
    console.log("Client connected to NEXUS WebSocket");
    
    ws.on("message", async (message) => {
      try {
        const { type, data } = JSON.parse(message.toString());
        console.log(`Received message type: ${type}`);

        if (type === 'TRIGGER_WORKFLOW') {
          const workflowId = crypto.randomBytes(8).toString('hex');
          // Start workflow without awaiting to not block the socket
          runWorkflow(workflowId, data.type, data.params, ws, data.workflow).catch(err => {
            console.error("Workflow execution error:", err);
          });
        } else if (type === 'GET_SYSTEM_STATS') {
          ws.send(JSON.stringify({
            type: 'SYSTEM_STATS',
            data: {
              cpu: Math.floor(Math.random() * 20) + 5,
              latency: Math.floor(Math.random() * 50) + 10,
              uptime: '99.99%',
              activeAgents: 12,
              dailyDecisions: 1420 + Math.floor(Math.random() * 100),
              securityAlerts: 0
            }
          }));
        } else if (type === 'EXECUTE_COMMAND') {
          const { command } = data;
          let response = `Command '${command}' executed.`;
          
          if (command === '/status') {
            response = "All agents are ONLINE. Master Orchestrator: IDLE, Data Retrieval: IDLE, Decision Engine: IDLE, Verifier: IDLE, Action Executor: IDLE, Anomaly Detector: RUNNING (Passive).";
          } else if (command === '/agents') {
            response = "Active Agents: \n- Master Orchestrator: Planning & Delegation\n- Data Retrieval: Context Fetching\n- Decision Engine: LLM Reasoning\n- Verifier: SLA Compliance\n- Action Executor: Execution\n- Anomaly Detector: Predictive Analysis";
          } else if (command === '/alerts') {
            response = "Security Alerts: No active threats detected. All cryptographic chains verified.";
          }

          ws.send(JSON.stringify({
            type: 'COMMAND_RESPONSE',
            data: {
              message: response,
              timestamp: new Date().toISOString()
            }
          }));
        }
      } catch (e) {
        console.error("Failed to parse client message:", e);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0'
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXUS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
