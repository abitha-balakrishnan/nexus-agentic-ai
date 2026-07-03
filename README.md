
# NEXUS: Autonomous Multi-Agent Swarm Orchestration Engine

NEXUS is an enterprise-grade, state-of-the-art autonomous orchestration engine designed to model, execute, and cryptographically audit multi-agent swarm workflows. Combining dynamic cognitive planning, a dual-layer immutable ledger, real-time WebSocket telemetry, and resilient self-healing capabilities, NEXUS turns complex natural language prompts into structured, verifiable execution graphs.

---

## 🌌 System Architecture

```
                               ┌───────────────────────┐
                               │     User Interface    │
                               │ (React, Tailwind CSS) │
                               └───────────┬───────────┘
                                           │
                                  WebSockets / HTTP
                                           │
                                           ▼
                               ┌───────────────────────┐
                               │     NEXUS Server      │
                               │  (Express.js / Node)  │
                               └───────────┬───────────┘
                                           │
                  ┌────────────────────────┼────────────────────────┐
                  ▼                        ▼                        ▼
      ┌───────────────────────┐┌───────────────────────┐┌───────────────────────┐
      │   Multi-Agent Swarm   ││ Cryptographic Ledger  ││  Dual-Layer Storage   │
      │  (Orchestrator, etc.) ││ (SHA-256 Hash Chain) ││ (Firestore & SQLite)  │
      └───────────────────────┘└───────────────────────┘└───────────────────────┘
```

---

## ✨ Key Features

### 🧠 Dynamic Multi-Agent Swarm
NEXUS implements a collaborative multi-agent workforce powered by advanced large language models (LLMs):
*   **Master Orchestrator**: Parses natural language triggers and dynamically charts optimal workflow execution plans.
*   **Data Retrieval**: Harvests contextual and transactional inputs required for workflow execution.
*   **Decision Engine**: Applies structured business rules combined with contextual RAG semantic history to formulate decisions.
*   **Verifier**: Enforces strict verification protocols, validation rules, and SLA compliance metrics.
*   **Action Executor**: Commits verified actions, dispatches integration calls, and triggers notifications.
*   **Anomaly Detector**: Runs asynchronously alongside the swarm to scan for behavioral anomalies, process bottlenecks, or projected SLA failures.
*   **Memory Agent**: Provides local RAG support, saving workflow outcomes and retrieving context across historical sessions.

### 🛡️ Cryptographic Trust & Verification
NEXUS ensures absolute operational integrity by recording all swarm decisions, logs, and self-healing events to an immutable blockchain-style ledger:
*   **SHA-256 Hash Chain**: Each ledger block cryptographically binds its payload with the preceding block's hash.
*   **Real-time Fraud/Tamper Auditing**: One-click deep validation scans the entire ledger chain dynamically on the dashboard to ensure block headers match mathematical roots.

### 🩺 Advanced Self-Healing Protocols
NEXUS does not break under failure. If any agent execution encounters an exception or times out:
1.  **Diagnostics Trigger**: An immediate self-evaluation is dispatched.
2.  **Context Alignment**: Parameter adjustments and issue resolutions are made dynamically.
3.  **Graceful Recovery**: The workflow recovers mid-execution with high-availability retry budgets.

### ⚡ Live Telemetry & Visual Builder
*   **Interactive Node Graph**: Design, inspect, and modify workflows directly on a clean, responsive visual interface.
*   **Real-time WebSocket Pipeline**: Watch agent status changes, reasoning paths, and execution telemetry stream instantly without polling delays.
*   **Version History Control**: Save fully-realized version snapshots to cloud storage and revert states seamlessly.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v18+), Vite, Tailwind CSS, Lucide Icons, Framer Motion (Transitions and Micro-animations).
*   **Backend**: Express.js (TypeScript Server), WebSocket server (`ws`), Groq SDK (Llama 3.3).
*   **Database & Persistence**:
    *   **Durable Cloud Storage**: Firebase Firestore (Persistent enterprise data & user states).
    *   **User Authentication**: Firebase Auth (User-specific access and execution history).
    *   **Local High-Availability Fallback**: SQLite (`better-sqlite3` for local ledger offline reliability).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn
*   A valid Groq API Key (`GROQ_API_KEY`) and Firebase project credentials (configured automatically during system initialization).

### Installation

1.  Clone the repository and navigate to the project root:
    ```bash
    git clone <repository-url>
    cd nexus-swarm
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env` file in the root directory (using `.env.example` as a template):
    ```env
    GROQ_API_KEY=your_groq_api_key_here
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

### Development Scripts

To run the application in development mode (Express server proxying client-side Vite asset updates):
```bash
npm run dev
```

To build and compile the full-stack server-side distribution bundle for production deployment:
```bash
npm run build
```

To boot the highly performant production environment:
```bash
npm start
```

---

## 🔒 Security & Data Privacy

*   **Secure API Architecture**: All model API requests and credential operations are proxied server-side (`/api/*`), preventing private keys, tokens, or configuration maps from leaking to the browser.
*   **Auth Guardrails**: Workflows, versions, and audit trails are mapped and secured to user credentials using robust backend checks.
*   **Ledger Anchoring**: Cryptographic guarantees verify database contents have not been modified or truncated out-of-order.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
