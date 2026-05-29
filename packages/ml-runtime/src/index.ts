// ============================================================================
// ML Runtime Package - Barrel Export
// ============================================================================

/**
 * @simulated This implementation is a simulation/prototype.
 * Classification: NAIVE
 * Reason: Re-exports ONNX runtime interfaces that rely on simulated backends
 * Production path: Ensure all exported modules bind to real ONNX runtime
 */

export { OnnxServerRuntime, ServerRuntimeConfigSchema } from './onnx-server';

export type {
  OnnxBackend,
  OnnxSession,
  OnnxTensor,
  TensorType,
  SessionOptions,
  ExecutionProvider,
  ServerRuntimeConfig,
  InferenceResult,
} from './onnx-server';

export { OnnxBrowserRuntime, BrowserRuntimeConfigSchema } from './onnx-browser';

export type {
  BrowserExecutionProvider,
  BrowserRuntimeConfig,
  BrowserCapabilities,
  BrowserInferenceResult,
} from './onnx-browser';

export { ModelLoader, ModelLoaderConfigSchema } from './model-loader';

export type {
  StorageBackend,
  ModelDownloader,
  ModelLoaderConfig,
  ModelManifest,
  CacheStats,
} from './model-loader';
