export default interface ParseOptions {
  headers?: Record<string, string>;
  cookies?: any;
  forceNewContext?: boolean;
  userAgent?: string;
  timeout?: number;
  strategies?: ("domcontentloaded" | "load" | "networkidle" | "commit")[];
  waitUntil?: "domcontentloaded" | "load" | "networkidle" | "commit";
  waitForSelector?: string;
  selectorTimeout?: number;
  preEvaluateDelay?: number;
  humanizeDelay?: boolean;
  humanizeDelayMax?: number;
  evalArg?: any;
}
