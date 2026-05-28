export type InferenceBackend = 'onnx-web' | 'onnx-native' | 'server' | 'mock';

export interface Tensor {
  data: Float32Array;
  shape: number[];
}

const BACKEND_PRIORITY: InferenceBackend[] = ['onnx-native', 'onnx-web', 'server', 'mock'];

export class InferenceRuntime {
  readonly backend: InferenceBackend;

  constructor(available: InferenceBackend[] = ['mock']) {
    this.backend = this.selectBackend(available);
  }

  private selectBackend(available: InferenceBackend[]): InferenceBackend {
    for (const preferred of BACKEND_PRIORITY) {
      if (available.includes(preferred)) return preferred;
    }
    return 'mock';
  }

  async run(_model: string, input: Tensor): Promise<Tensor> {
    if (this.backend === 'mock') {
      return { data: new Float32Array(input.data.length), shape: [...input.shape] };
    }
    // Non-mock backends would load and run real models
    return { data: new Float32Array(input.data.length), shape: [...input.shape] };
  }
}
