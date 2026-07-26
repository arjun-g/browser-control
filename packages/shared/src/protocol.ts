export type BrowserKind = "chrome" | "edge" | "firefox";

export type BridgeHello = {
  type: "hello";
  browser: BrowserKind;
  extensionVersion: string;
  token?: string;
};

export type BridgeHelloAck = {
  type: "hello_ack";
  clientId: string;
  serverTime: string;
};

export type CommandAction =
  | "navigate"
  | "new_tab"
  | "list_tabs"
  | "back"
  | "forward"
  | "click"
  | "type"
  | "keypress"
  | "scroll"
  | "read_dom"
  | "screenshot"
  | "wait_for_selector"
  | "wait_for_navigation"
  | "cdp_command";

export type BridgeCommand = {
  type: "command";
  id: string;
  action: CommandAction;
  params: Record<string, unknown>;
};

export type BridgeResult = {
  type: "result";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type BridgeEnvelope = BridgeHello | BridgeHelloAck | BridgeCommand | BridgeResult;
