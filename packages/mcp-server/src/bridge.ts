import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type {
  BridgeCommand,
  BridgeEnvelope,
  BridgeHello,
  BridgeResult,
  BrowserKind,
  CommandAction,
} from "@browser-control/shared";
import { BRIDGE_CANDIDATE_PORTS } from "@browser-control/shared";

const MAX_MESSAGE_BYTES = 2_000_000;

type BrowserClient = {
  id: string;
  browser: BrowserKind;
  extensionVersion: string;
  socket: WebSocket;
};

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
};

export class BrowserBridge {
  private readonly wss: WebSocketServer;
  private readonly token?: string;
  private readonly agentName: string;
  private readonly clients = new Map<string, BrowserClient>();
  private readonly pending = new Map<string, PendingCommand>();
  readonly port: number;

  private constructor(wss: WebSocketServer, port: number, agentName: string, token?: string) {
    this.wss = wss;
    this.port = port;
    this.agentName = agentName;
    this.token = token;
    this.wss.on("connection", (socket) => this.handleConnection(socket));
  }

  /** Bind to the first available port from the candidate list (preferred port tried first). */
  static async create(preferredPort?: number, token?: string, agentName?: string): Promise<BrowserBridge> {
    const candidates: number[] = preferredPort
      ? [preferredPort, ...(BRIDGE_CANDIDATE_PORTS as readonly number[]).filter((p) => p !== preferredPort)]
      : [...BRIDGE_CANDIDATE_PORTS];

    const finalAgentName = agentName || process.env.BROWSER_AGENT_NAME || process.env.npm_lifecycle_script || "mcp-agent";

    for (const port of candidates) {
      try {
        const wss = await new Promise<WebSocketServer>((resolve, reject) => {
          const server = new WebSocketServer({ port });
          server.once("listening", () => resolve(server));
          server.once("error", reject);
        });
        return new BrowserBridge(wss, port, finalAgentName, token);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") continue;
        throw err;
      }
    }
    throw new Error(
      `No available bridge port. All candidate ports are in use: ${candidates.join(", ")}`,
    );
  }

  async close(): Promise<void> {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Bridge shutting down"));
      this.pending.delete(id);
    }

    for (const client of this.clients.values()) {
      try {
        client.socket.close(1001, "Bridge shutting down");
      } catch {
        // no-op
      }
    }
    this.clients.clear();

    await new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  listClients(): Array<{ id: string; browser: BrowserKind; extensionVersion: string }> {
    return [...this.clients.values()].map((c) => ({
      id: c.id,
      browser: c.browser,
      extensionVersion: c.extensionVersion,
    }));
  }

  pickClient(preferredBrowser?: BrowserKind): BrowserClient | undefined {
    const clients = [...this.clients.values()];
    if (clients.length === 0) {
      return undefined;
    }

    if (preferredBrowser) {
      const matched = clients.find((c) => c.browser === preferredBrowser);
      if (matched) {
        return matched;
      }
    }

    return clients[0];
  }

  async sendCommand(args: {
    action: CommandAction;
    params: Record<string, unknown>;
    preferredBrowser?: BrowserKind;
    timeoutMs?: number;
  }): Promise<unknown> {
    const client = this.pickClient(args.preferredBrowser);
    if (!client) {
      throw new Error("No connected browser client. Start the extension in Chrome/Edge first.");
    }

    const id = randomUUID();
    const cmd: BridgeCommand = {
      type: "command",
      id,
      action: args.action,
      params: args.params,
      agent: this.agentName,
    };

    const payload = JSON.stringify(cmd);
    client.socket.send(payload);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command timed out after ${args.timeoutMs ?? 15000}ms`));
      }, args.timeoutMs ?? 15000);

      this.pending.set(id, { resolve, reject, timeout });
    });
  }

  private handleConnection(socket: WebSocket): void {
    let clientId: string | undefined;

    socket.on("message", (raw) => {
      try {
        const text = raw.toString();
        if (Buffer.byteLength(text, "utf8") > MAX_MESSAGE_BYTES) {
          socket.close(1009, "Message too large");
          return;
        }

        const msg = JSON.parse(text) as Partial<BridgeEnvelope>;

        if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
          return;
        }

        if (msg.type === "hello") {
          const hello = msg as Partial<BridgeHello>;

          if (typeof hello.browser !== "string" || typeof hello.extensionVersion !== "string") {
            socket.close(1008, "Invalid hello payload");
            return;
          }

          if (!["chrome", "edge", "firefox"].includes(hello.browser)) {
            socket.close(1008, "Unsupported browser client");
            return;
          }

          if (this.token && hello.token !== this.token) {
            socket.close(1008, "Invalid token");
            return;
          }

          clientId = randomUUID();
          this.clients.set(clientId, {
            id: clientId,
            browser: hello.browser,
            extensionVersion: hello.extensionVersion,
            socket,
          });

          socket.send(
            JSON.stringify({
              type: "hello_ack",
              clientId,
              serverTime: new Date().toISOString(),
            }),
          );
          return;
        }

        if (msg.type === "result") {
          const result = msg as Partial<BridgeResult>;
          if (typeof result.id !== "string" || typeof result.ok !== "boolean") {
            return;
          }

          const pending = this.pending.get(result.id);
          if (!pending) {
            return;
          }

          clearTimeout(pending.timeout);
          this.pending.delete(result.id);

          if (result.ok) {
            pending.resolve(result.result);
          } else {
            pending.reject(new Error(result.error ?? "Unknown browser error"));
          }
        }
      } catch (error) {
        socket.close(1003, `Bridge parse error: ${(error as Error).message}`);
      }
    });

    socket.on("close", () => {
      if (clientId) {
        this.clients.delete(clientId);
      }
    });

    socket.on("error", () => {
      if (clientId) {
        this.clients.delete(clientId);
      }
    });
  }
}
