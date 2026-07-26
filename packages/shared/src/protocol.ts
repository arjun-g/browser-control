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
  | "back"
  | "forward"
  | "click"
  | "type"
  | "keypress"
  | "read_dom"
  | "screenshot"
  | "attach_debugger"
  | "detach_debugger"
  | "debugger_status"
  | "cdp_command"
  | "cdp_click"
  | "cdp_type"
  | "cdp_keypress"
  | "cdp_scroll"
  | "cdp_wait_for_selector"
  | "wait_for_navigation"
  | "cdp_screenshot";

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
