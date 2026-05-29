import { z } from 'zod';

export const WearableDeviceTypeSchema = z.enum(['glasses', 'watch', 'headset']);
export type WearableDeviceType = z.infer<typeof WearableDeviceTypeSchema>;

export const ConnectionStatusSchema = z.enum(['connected', 'disconnected', 'pairing', 'error']);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const WearableDeviceSchema = z.object({
  id: z.string(),
  type: WearableDeviceTypeSchema,
  name: z.string(),
  capabilities: z.array(z.string()),
  connectionStatus: ConnectionStatusSchema,
});
export type WearableDevice = z.infer<typeof WearableDeviceSchema>;

export const HUDElementTypeSchema = z.enum(['notification', 'translation', 'navigation', 'info']);
export type HUDElementType = z.infer<typeof HUDElementTypeSchema>;

export const HUDPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
});
export type HUDPosition = z.infer<typeof HUDPositionSchema>;

export const HUDElementSchema = z.object({
  id: z.string(),
  type: HUDElementTypeSchema,
  position: HUDPositionSchema,
  content: z.string(),
  priority: z.number().min(0).max(10),
  ttl: z.number().positive().optional(),
});
export type HUDElement = z.infer<typeof HUDElementSchema>;

export const HandoffStateSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'transferring',
  'completed',
]);
export type HandoffState = z.infer<typeof HandoffStateSchema>;

export const HandoffSessionSchema = z.object({
  id: z.string(),
  sourceDevice: z.string(),
  targetDevice: z.string(),
  state: HandoffStateSchema,
  context: z.record(z.unknown()),
  startedAt: z.date(),
});
export type HandoffSession = z.infer<typeof HandoffSessionSchema>;

export const TranslationSegmentSchema = z.object({
  text: z.string(),
  translated: z.string(),
  confidence: z.number().min(0).max(1),
});
export type TranslationSegment = z.infer<typeof TranslationSegmentSchema>;

export const TranslationOverlaySchema = z.object({
  id: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  segments: z.array(TranslationSegmentSchema),
  position: HUDPositionSchema,
});
export type TranslationOverlay = z.infer<typeof TranslationOverlaySchema>;

export const OverlayModeSchema = z.enum(['passthrough', 'mixed', 'immersive']);
export type OverlayMode = z.infer<typeof OverlayModeSchema>;

export const AnchoredObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: HUDPositionSchema,
  scale: z.number().positive().default(1),
});
export type AnchoredObject = z.infer<typeof AnchoredObjectSchema>;

export const ARPassthroughConfigSchema = z.object({
  resolution: z.object({ width: z.number().positive(), height: z.number().positive() }),
  frameRate: z.number().positive(),
  overlayMode: OverlayModeSchema,
  anchoredObjects: z.array(AnchoredObjectSchema),
});
export type ARPassthroughConfig = z.infer<typeof ARPassthroughConfigSchema>;

export interface DisplayInfo {
  width: number;
  height: number;
  refreshRate: number;
  fieldOfView: number;
}

export interface HealthMetrics {
  heartRate?: number;
  steps?: number;
  calories?: number;
  bloodOxygen?: number;
}

export interface TrackingData {
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; yaw: number; roll: number };
  timestamp: number;
}

export interface ARFrame {
  timestamp: number;
  resolution: { width: number; height: number };
  overlays: string[];
}
