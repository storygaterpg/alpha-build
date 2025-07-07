/**
 * Services index
 */

// AI Proxy service
export { default as aiProxy } from './AIProxy';
export type { ChatMessage } from './AIProxy';
export { default as useAI } from './useAI';

// Context7 service
export { default as context7Service } from './context7Service';

// Export everything as a default object
import aiProxy from './AIProxy';
import useAI from './useAI';
import context7Service from './context7Service';

export default {
  aiProxy,
  useAI,
  context7Service
}; 