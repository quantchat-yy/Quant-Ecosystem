import { type RouteStep, type VoiceInstruction } from '../types.js';

export class VoiceGuidance {
  getInstruction(step: RouteStep, distanceToStep: number, language: 'en' | 'hi'): VoiceInstruction {
    if (distanceToStep >= 500) {
      const text =
        language === 'en'
          ? `In about ${Math.round(distanceToStep)} meters, ${step.instruction}`
          : `Lagbhag ${Math.round(distanceToStep)} meter mein ${step.instruction}`;
      return { text, language, distanceTrigger: distanceToStep };
    }
    if (distanceToStep >= 200) {
      const text =
        language === 'en'
          ? `In ${Math.round(distanceToStep)} meters, prepare to ${step.instruction}`
          : `${Math.round(distanceToStep)} meter mein ${step.instruction} ke liye taiyaar rahein`;
      return { text, language, distanceTrigger: distanceToStep };
    }
    const text = language === 'en' ? `Turn now: ${step.instruction}` : `Ab ${step.instruction}`;
    return { text, language, distanceTrigger: distanceToStep };
  }

  getSpeedAlert(speedLimit: number, language: 'en' | 'hi'): VoiceInstruction {
    const text =
      language === 'en'
        ? `Speed limit is ${speedLimit} km/h. Please slow down.`
        : `Speed limit ${speedLimit} km/h hai. Kripya dheere chalein.`;
    return { text, language, distanceTrigger: 0 };
  }

  getArrivalAnnouncement(language: 'en' | 'hi'): VoiceInstruction {
    const text = language === 'en' ? 'You have arrived' : 'Aap apni manzil par pahunch gaye hain';
    return { text, language, distanceTrigger: 0 };
  }
}
