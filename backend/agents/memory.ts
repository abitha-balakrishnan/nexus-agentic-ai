import Database from "better-sqlite3";

export class MemoryAgent {
  private db: any;

  constructor() {
    this.db = new Database('memory.sqlite');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id TEXT,
        type TEXT,
        context TEXT,
        timestamp TEXT
      )
    `);
  }

  async store(entry: any) {
    console.log("Memory Agent: Storing experience in persistent SQLite memory...");
    const stmt = this.db.prepare(`
      INSERT INTO memory (workflow_id, type, context, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(entry.workflowId, entry.type, JSON.stringify(entry.context), new Date().toISOString());
  }

  async retrieve(query: string) {
    console.log(`Memory Agent: Retrieving context for query: ${query}`);
    const logs = this.db.prepare('SELECT * FROM memory ORDER BY id DESC LIMIT 5').all();
    return logs.map((log: any) => ({ ...log, context: JSON.parse(log.context) }));
  }
}
