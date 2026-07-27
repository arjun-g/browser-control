export const BRIDGE_CANDIDATE_PORTS = [17374, 17375, 17376, 17377, 17378, 17379, 17380, 17381, 17382, 17383] as const;

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
  | "get_current_tab"
  | "close_tab"
  | "close_tabs"
  | "create_tab_group"
  | "delete_tab_group"
  | "back"
  | "forward"
  | "reload_tab"
  | "click"
  | "mouse_move"
  | "drag_and_drop"
  | "type"
  | "keypress"
  | "focus_element"
  | "blur_element"
  | "scroll"
  | "scroll_element"
  | "read_dom"
  | "dom_extract_element"
  | "screenshot"
  | "minimal_snapshot"
  | "semantic_snapshot"
  | "dom_snapshot"
  | "wait_for_selector"
  | "wait_for_navigation"
  | "set_viewport"
  | "emulate_mobile"
  | "resize_window"
  | "toggle_fullscreen"
  | "add_css"
  | "execute_javascript"
  | "get_cookies"
  | "set_cookie"
  | "delete_cookie"
  | "list_network_requests"
  | "get_performance_metrics"
  | "get_web_vitals"
  | "get_console_logs"
  | "list_downloads"
  | "read_download"
  | "cdp_command";

export type BridgeCommand = {
  type: "command";
  id: string;
  action: CommandAction;
  params: Record<string, unknown>;
  agent?: string;
};

export type BridgeResult = {
  type: "result";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type BridgeEnvelope = BridgeHello | BridgeHelloAck | BridgeCommand | BridgeResult;
