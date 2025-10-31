/**
 * Bug Report Utilities
 * Handles screenshot capture, console logging, and network monitoring
 */

export interface ConsoleLog {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: any[];
}

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  body?: string;
  response?: string;
  duration: number;
  timestamp: string;
}

export interface DiagnosticData {
  consoleLogs: ConsoleLog[];
  networkRequests: NetworkRequest[];
  screenshot?: string;
  browser: string;
  browserVersion: string;
  os: string;
  userAgent: string;
  pageUrl: string;
  pageTitle: string;
}

/**
 * Capture a screenshot of the current viewport using html2canvas
 * Falls back gracefully if there are styling issues (e.g., unsupported CSS functions)
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    // Dynamically import html2canvas to avoid bloating bundle if not used
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(document.body, {
      backgroundColor: '#ffffff',
      scale: 1,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 5000,
      onclone: (clonedDocument) => {
        // Disable any problematic CSS features for screenshot
        const style = clonedDocument.createElement('style');
        style.textContent = `
          * {
            transition: none !important;
            animation: none !important;
          }
        `;
        clonedDocument.head.appendChild(style);
      }
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    // Log the error but don't fail the bug report submission
    console.warn('Screenshot capture failed (bug report will still be submitted):', error);
    return null;
  }
}

/**
 * Start monitoring console output
 */
export function startConsoleMonitoring(): ConsoleLog[] {
  const logs: ConsoleLog[] = [];

  // Store original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  const createLogEntry = (level: ConsoleLog['level'], args: any[]): ConsoleLog => ({
    timestamp: new Date().toISOString(),
    level,
    message: args.map((arg) => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' '),
    args,
  });

  console.log = function (...args: any[]) {
    logs.push(createLogEntry('log', args));
    originalLog.apply(console, args);
  };

  console.warn = function (...args: any[]) {
    logs.push(createLogEntry('warn', args));
    originalWarn.apply(console, args);
  };

  console.error = function (...args: any[]) {
    logs.push(createLogEntry('error', args));
    originalError.apply(console, args);
  };

  console.info = function (...args: any[]) {
    logs.push(createLogEntry('info', args));
    originalInfo.apply(console, args);
  };

  console.debug = function (...args: any[]) {
    logs.push(createLogEntry('debug', args));
    originalDebug.apply(console, args);
  };

  return logs;
}

/**
 * Monitor network requests using Performance API and fetch interception
 */
export function startNetworkMonitoring(): NetworkRequest[] {
  const requests: NetworkRequest[] = [];

  // Intercept fetch requests
  const originalFetch = window.fetch;

  window.fetch = function (...args: any[]) {
    const startTime = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
    const init = typeof args[0] === 'string' ? args[1] : args[0];
    const method = init?.method || 'GET';

    return originalFetch.apply(window, args)
      .then((response) => {
        const duration = performance.now() - startTime;
        const clonedResponse = response.clone();

        // Extract response data
        const responseText = clonedResponse.text().then((text) => {
          requests.push({
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(init?.headers instanceof Headers ? init.headers.entries() : []),
            responseHeaders: Object.fromEntries(response.headers.entries()),
            response: text.substring(0, 500), // Limit response size
            duration,
            timestamp: new Date().toISOString(),
          });

          return clonedResponse;
        });

        return response;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        requests.push({
          url,
          method,
          duration,
          timestamp: new Date().toISOString(),
        });
        throw error;
      });
  } as any;

  return requests;
}

/**
 * Get browser and OS information
 */
export function getBrowserInfo(): {
  browser: string;
  browserVersion: string;
  os: string;
} {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  let os = 'Unknown';

  // Detect browser
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
    browserVersion = userAgent.match(/Edge?\/(\d+)/)?.[1] || 'Unknown';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  }

  return { browser, browserVersion, os };
}

/**
 * Collect all diagnostic data
 */
export async function collectDiagnosticData(
  consoleLogs: ConsoleLog[],
  networkRequests: NetworkRequest[]
): Promise<DiagnosticData> {
  const browserInfo = getBrowserInfo();
  const screenshot = await captureScreenshot();

  // Get only failed or slow requests (to limit data size)
  const relevantRequests = networkRequests.filter(
    (req) => !req.status || req.status >= 400 || req.duration > 5000
  );

  // Get only error and warning console logs (to limit data size)
  const relevantLogs = consoleLogs.filter(
    (log) => log.level === 'error' || log.level === 'warn'
  );

  return {
    consoleLogs: relevantLogs.slice(-50), // Last 50 relevant logs
    networkRequests: relevantRequests.slice(-20), // Last 20 relevant requests
    screenshot,
    browser: browserInfo.browser,
    browserVersion: browserInfo.browserVersion,
    os: browserInfo.os,
    userAgent: navigator.userAgent,
    pageUrl: window.location.href,
    pageTitle: document.title,
  };
}

/**
 * Initialize monitoring on page load
 */
export function initializeBugReportMonitoring() {
  const consoleLogs = startConsoleMonitoring();
  const networkRequests = startNetworkMonitoring();

  return { consoleLogs, networkRequests };
}
