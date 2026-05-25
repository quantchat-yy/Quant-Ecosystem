// ============================================================================
// ML Pipeline - Online Learning
// ============================================================================

import {
  OnlineLearningConfig,
  StreamingUpdate,
  DriftDetectionResult,
  ModelCheckpoint,
  MiniBatchState,
} from '../types';

interface WeightState {
  weights: number[];
  bias: number;
  velocity: number[];
  squaredGradients: number[];
  step: number;
}

interface ADWINBucket {
  total: number;
  count: number;
  variance: number;
}

export class OnlineLearning {
  private config: OnlineLearningConfig;
  private weightState: WeightState;
  private miniBatch: MiniBatchState;
  private checkpoints: ModelCheckpoint[] = [];
  private adwinBuckets: ADWINBucket[] = [];
  private lossHistory: number[] = [];
  private driftDetected: boolean = false;
  private totalSamples: number = 0;
  private epochCount: number = 0;

  constructor(config: Partial<OnlineLearningConfig> = {}) {
    this.config = {
      inputDimension: config.inputDimension ?? 10,
      learningRate: config.learningRate ?? 0.01,
      batchSize: config.batchSize ?? 32,
      optimizer: config.optimizer ?? 'adam',
      lrSchedule: config.lrSchedule ?? 'cosine_annealing',
      lrMin: config.lrMin ?? 0.0001,
      lrMax: config.lrMax ?? 0.01,
      warmupSteps: config.warmupSteps ?? 100,
      cycleLength: config.cycleLength ?? 1000,
      weightDecay: config.weightDecay ?? 0.0001,
      momentumBeta: config.momentumBeta ?? 0.9,
      adamBeta2: config.adamBeta2 ?? 0.999,
      adamEpsilon: config.adamEpsilon ?? 1e-8,
      adwinDelta: config.adwinDelta ?? 0.002,
      maxCheckpoints: config.maxCheckpoints ?? 10,
      gradientClipNorm: config.gradientClipNorm ?? 1.0,
    };

    const dim = this.config.inputDimension;
    this.weightState = {
      weights: this.xavierInit(dim),
      bias: 0,
      velocity: new Array(dim).fill(0) as number[],
      squaredGradients: new Array(dim).fill(0) as number[],
      step: 0,
    };

    this.miniBatch = {
      features: [],
      labels: [],
      currentSize: 0,
      maxSize: this.config.batchSize,
    };
  }

  private xavierInit(dim: number): number[] {
    const scale = Math.sqrt(2.0 / (dim + 1));
    return Array.from({ length: dim }, () => (Math.random() * 2 - 1) * scale);
  }

  update(features: number[], label: number): StreamingUpdate {
    this.totalSamples += 1;

    this.miniBatch.features.push(features);
    this.miniBatch.labels.push(label);
    this.miniBatch.currentSize += 1;

    let loss = 0;
    let updated = false;

    if (this.miniBatch.currentSize >= this.miniBatch.maxSize) {
      loss = this.processMiniBatch();
      updated = true;
      this.epochCount += 1;

      this.updateADWIN(loss);

      if (this.epochCount % 100 === 0) {
        this.createCheckpoint(loss);
      }
    }

    return {
      loss,
      updated,
      currentLR: this.getCurrentLearningRate(),
      totalSamples: this.totalSamples,
      driftDetected: this.driftDetected,
      step: this.weightState.step,
    };
  }

  private processMiniBatch(): number {
    const { features, labels } = this.miniBatch;
    const n = features.length;

    let totalLoss = 0;
    const gradients = new Array(this.config.inputDimension).fill(0) as number[];
    let biasGradient = 0;

    for (let i = 0; i < n; i++) {
      const featureRow = features[i] ?? [];
      const prediction = this.predict(featureRow);
      const labelVal = labels[i] ?? 0;

      const error = prediction - labelVal;
      totalLoss += error * error;

      for (let j = 0; j < this.config.inputDimension; j++) {
        gradients[j] = (gradients[j] ?? 0) + (2 * error * (featureRow[j] ?? 0)) / n;
      }
      biasGradient += (2 * error) / n;
    }

    const avgLoss = totalLoss / n;
    this.lossHistory.push(avgLoss);
    if (this.lossHistory.length > 1000) this.lossHistory.shift();

    // Add weight decay (L2 regularization)
    for (let j = 0; j < this.config.inputDimension; j++) {
      gradients[j] =
        (gradients[j] ?? 0) + this.config.weightDecay * (this.weightState.weights[j] ?? 0);
    }

    // Gradient clipping by norm
    const gradNorm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));
    if (gradNorm > this.config.gradientClipNorm) {
      const scale = this.config.gradientClipNorm / gradNorm;
      for (let j = 0; j < gradients.length; j++) {
        gradients[j] = (gradients[j] ?? 0) * scale;
      }
      biasGradient *= scale;
    }

    const lr = this.getCurrentLearningRate();
    this.applyOptimizer(gradients, biasGradient, lr);

    this.miniBatch.features = [];
    this.miniBatch.labels = [];
    this.miniBatch.currentSize = 0;

    return avgLoss;
  }

  private applyOptimizer(gradients: number[], biasGradient: number, lr: number): void {
    this.weightState.step += 1;
    const step = this.weightState.step;

    switch (this.config.optimizer) {
      case 'sgd':
        this.applySGD(gradients, biasGradient, lr);
        break;
      case 'momentum':
        this.applyMomentum(gradients, biasGradient, lr);
        break;
      case 'adam':
        this.applyAdam(gradients, biasGradient, lr, step);
        break;
      case 'rmsprop':
        this.applyRMSProp(gradients, biasGradient, lr);
        break;
      default:
        this.applyAdam(gradients, biasGradient, lr, step);
    }
  }

  private applySGD(gradients: number[], biasGradient: number, lr: number): void {
    for (let i = 0; i < this.config.inputDimension; i++) {
      this.weightState.weights[i] = (this.weightState.weights[i] ?? 0) - lr * (gradients[i] ?? 0);
    }
    this.weightState.bias -= lr * biasGradient;
  }

  private applyMomentum(gradients: number[], biasGradient: number, lr: number): void {
    const beta = this.config.momentumBeta;
    for (let i = 0; i < this.config.inputDimension; i++) {
      const vel = this.weightState.velocity[i] ?? 0;
      const grad = gradients[i] ?? 0;
      this.weightState.velocity[i] = beta * vel + grad;
      this.weightState.weights[i] =
        (this.weightState.weights[i] ?? 0) - lr * (this.weightState.velocity[i] ?? 0);
    }
    this.weightState.bias -= lr * biasGradient;
  }

  private applyAdam(gradients: number[], biasGradient: number, lr: number, step: number): void {
    const beta1 = this.config.momentumBeta;
    const beta2 = this.config.adamBeta2;
    const epsilon = this.config.adamEpsilon;

    const bc1 = 1 - Math.pow(beta1, step);
    const bc2 = 1 - Math.pow(beta2, step);

    for (let i = 0; i < this.config.inputDimension; i++) {
      const grad = gradients[i] ?? 0;
      const vel = this.weightState.velocity[i] ?? 0;
      const sq = this.weightState.squaredGradients[i] ?? 0;

      // Update first moment
      this.weightState.velocity[i] = beta1 * vel + (1 - beta1) * grad;

      // Update second moment
      this.weightState.squaredGradients[i] = beta2 * sq + (1 - beta2) * grad * grad;

      // Bias-corrected estimates
      const mHat = (this.weightState.velocity[i] ?? 0) / bc1;
      const vHat = (this.weightState.squaredGradients[i] ?? 0) / bc2;

      // Update weights
      this.weightState.weights[i] =
        (this.weightState.weights[i] ?? 0) - (lr * mHat) / (Math.sqrt(vHat) + epsilon);
    }

    this.weightState.bias -= lr * biasGradient;
  }

  private applyRMSProp(gradients: number[], biasGradient: number, lr: number): void {
    const beta2 = this.config.adamBeta2;
    const epsilon = this.config.adamEpsilon;

    for (let i = 0; i < this.config.inputDimension; i++) {
      const grad = gradients[i] ?? 0;
      const sq = this.weightState.squaredGradients[i] ?? 0;

      this.weightState.squaredGradients[i] = beta2 * sq + (1 - beta2) * grad * grad;

      this.weightState.weights[i] =
        (this.weightState.weights[i] ?? 0) -
        (lr * grad) / (Math.sqrt(this.weightState.squaredGradients[i] ?? 0) + epsilon);
    }

    this.weightState.bias -= lr * biasGradient;
  }

  getCurrentLearningRate(): number {
    const step = this.weightState.step;

    switch (this.config.lrSchedule) {
      case 'cosine_annealing':
        return this.cosineAnnealingLR(step);
      case 'step_decay':
        return this.stepDecayLR(step);
      case 'warm_restarts':
        return this.warmRestartsLR(step);
      case 'constant':
      default:
        return this.config.learningRate;
    }
  }

  private cosineAnnealingLR(step: number): number {
    const { lrMin, lrMax, cycleLength, warmupSteps } = this.config;

    if (step < warmupSteps) {
      return lrMin + (lrMax - lrMin) * (step / warmupSteps);
    }

    const t = (step - warmupSteps) % cycleLength;
    return lrMin + 0.5 * (lrMax - lrMin) * (1 + Math.cos((Math.PI * t) / cycleLength));
  }

  private stepDecayLR(step: number): number {
    const decayRate = 0.5;
    const stepSize = this.config.cycleLength;
    return this.config.lrMax * Math.pow(decayRate, Math.floor(step / stepSize));
  }

  private warmRestartsLR(step: number): number {
    const { lrMin, lrMax } = this.config;
    let cycleLength = this.config.cycleLength;
    let currentStep = step;

    while (currentStep >= cycleLength) {
      currentStep -= cycleLength;
      cycleLength *= 2;
    }

    const t = currentStep / cycleLength;
    return lrMin + 0.5 * (lrMax - lrMin) * (1 + Math.cos(Math.PI * t));
  }

  // ADWIN (Adaptive Windowing) drift detection
  private updateADWIN(value: number): void {
    this.adwinBuckets.push({ total: value, count: 1, variance: 0 });
    this.compressADWINBuckets();
    this.driftDetected = this.detectDriftADWIN();
  }

  private compressADWINBuckets(): void {
    const maxBuckets = 32;
    while (this.adwinBuckets.length > maxBuckets) {
      const b1 = this.adwinBuckets[0]!;
      const b2 = this.adwinBuckets[1]!;

      const mergedCount = b1.count + b2.count;
      const mergedTotal = b1.total + b2.total;
      const mean1 = b1.total / b1.count;
      const mean2 = b2.total / b2.count;
      const mergedMean = mergedTotal / mergedCount;

      const mergedVariance =
        b1.variance +
        b2.variance +
        b1.count * (mean1 - mergedMean) * (mean1 - mergedMean) +
        b2.count * (mean2 - mergedMean) * (mean2 - mergedMean);

      this.adwinBuckets.splice(0, 2, {
        total: mergedTotal,
        count: mergedCount,
        variance: mergedVariance,
      });
    }
  }

  private detectDriftADWIN(): boolean {
    const n = this.adwinBuckets.length;
    if (n < 4) return false;

    const delta = this.config.adwinDelta;

    for (let split = 2; split < n - 1; split++) {
      let leftTotal = 0,
        leftCount = 0;
      let rightTotal = 0,
        rightCount = 0;

      for (let i = 0; i < split; i++) {
        const bucket = this.adwinBuckets[i]!;
        leftTotal += bucket.total;
        leftCount += bucket.count;
      }
      for (let i = split; i < n; i++) {
        const bucket = this.adwinBuckets[i]!;
        rightTotal += bucket.total;
        rightCount += bucket.count;
      }

      if (leftCount === 0 || rightCount === 0) continue;

      const leftMean = leftTotal / leftCount;
      const rightMean = rightTotal / rightCount;
      const totalCount = leftCount + rightCount;

      const epsilon = Math.sqrt(
        (1 / (2 * leftCount) + 1 / (2 * rightCount)) * Math.log((4 * totalCount) / delta),
      );

      if (Math.abs(leftMean - rightMean) > epsilon) {
        this.adwinBuckets.splice(0, split);
        return true;
      }
    }

    return false;
  }

  detectDrift(): DriftDetectionResult {
    return {
      driftDetected: this.driftDetected,
      currentMean: this.getCurrentWindowMean(),
      windowSize: this.adwinBuckets.reduce((sum, b) => sum + b.count, 0),
      confidence: 1 - this.config.adwinDelta,
    };
  }

  private getCurrentWindowMean(): number {
    let total = 0,
      count = 0;
    for (const bucket of this.adwinBuckets) {
      total += bucket.total;
      count += bucket.count;
    }
    return count > 0 ? total / count : 0;
  }

  predict(features: number[]): number {
    let sum = this.weightState.bias;
    const len = Math.min(features.length, this.weightState.weights.length);
    for (let i = 0; i < len; i++) {
      sum += (this.weightState.weights[i] ?? 0) * (features[i] ?? 0);
    }
    return sum;
  }

  private createCheckpoint(loss: number): void {
    const checkpoint: ModelCheckpoint = {
      step: this.weightState.step,
      weights: [...this.weightState.weights],
      bias: this.weightState.bias,
      loss,
      timestamp: Date.now(),
      learningRate: this.getCurrentLearningRate(),
    };

    this.checkpoints.push(checkpoint);
    if (this.checkpoints.length > this.config.maxCheckpoints) {
      this.checkpoints.shift();
    }
  }

  restoreCheckpoint(index: number): boolean {
    const checkpoint = this.checkpoints[index];
    if (!checkpoint) return false;

    this.weightState.weights = [...checkpoint.weights];
    this.weightState.bias = checkpoint.bias;
    return true;
  }

  getBestCheckpoint(): ModelCheckpoint | null {
    if (this.checkpoints.length === 0) return null;
    return this.checkpoints.reduce((best, cp) => (cp.loss < best.loss ? cp : best));
  }

  getCheckpoints(): ModelCheckpoint[] {
    return [...this.checkpoints];
  }

  getLossHistory(): number[] {
    return [...this.lossHistory];
  }

  getWeights(): { weights: number[]; bias: number } {
    return {
      weights: [...this.weightState.weights],
      bias: this.weightState.bias,
    };
  }

  getTotalSamples(): number {
    return this.totalSamples;
  }

  getStep(): number {
    return this.weightState.step;
  }

  reset(): void {
    const dim = this.config.inputDimension;
    this.weightState = {
      weights: this.xavierInit(dim),
      bias: 0,
      velocity: new Array(dim).fill(0) as number[],
      squaredGradients: new Array(dim).fill(0) as number[],
      step: 0,
    };
    this.miniBatch = {
      features: [],
      labels: [],
      currentSize: 0,
      maxSize: this.config.batchSize,
    };
    this.lossHistory = [];
    this.adwinBuckets = [];
    this.driftDetected = false;
    this.totalSamples = 0;
    this.epochCount = 0;
  }
}
