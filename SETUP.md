# NEXUS: Autonomous Enterprise Workflows

## Setup Instructions

1. **Environment Variables**:
   - Ensure `GEMINI_API_KEY` is set in your AI Studio Secrets.
   - The app uses port 3000 by default.

2. **Running the App**:
   - The app is configured as a full-stack Express + Vite application.
   - Run `npm run dev` to start the development server.

3. **Features**:
   - **Multi-Agent Orchestration**: Master Orchestrator, Data Retrieval, Decision Engine, Action Executor, Verifier, and Anomaly Detector.
   - **Self-Healing**: Automatic root cause analysis and retry logic.
   - **Audit Ledger**: SQLite-based immutable ledger with SHA256 hash chaining.
   - **Real-time Updates**: WebSockets for live agent status streaming.
   - **RAG Memory**: Semantic memory using vector embeddings (simulated for prototype).

## Mock Data
- Purchase Orders: PO-001 (₹25k), PO-002 (₹45k), PO-003 (₹120k).
- Vendors: Global Corp, Tech Solutions, Prime Supplies.
