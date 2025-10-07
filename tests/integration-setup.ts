import { vi } from "vitest";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// DO NOT mock fetch or WebSocket for integration tests
// Integration tests need real network calls

// Increase timeout for blockchain operations
vi.setConfig({ testTimeout: 30000 });
