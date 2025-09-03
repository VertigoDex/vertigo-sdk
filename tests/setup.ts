import { vi } from "vitest";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Set up global mocks
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null,
})) as any;

// Increase timeout for blockchain operations
vi.setConfig({ testTimeout: 30000 });

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
