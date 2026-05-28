export class TwiMLBuilder {
  private static escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static dial(number: string, callerId?: string): string {
    const callerAttr = callerId ? ` callerId="${TwiMLBuilder.escape(callerId)}"` : '';
    return `<Response><Dial${callerAttr}>${TwiMLBuilder.escape(number)}</Dial></Response>`;
  }

  static say(message: string, voice?: string): string {
    const voiceAttr = voice ? ` voice="${TwiMLBuilder.escape(voice)}"` : '';
    return `<Response><Say${voiceAttr}>${TwiMLBuilder.escape(message)}</Say></Response>`;
  }

  static hold(musicUrl?: string): string {
    if (musicUrl) {
      return `<Response><Play loop="0">${TwiMLBuilder.escape(musicUrl)}</Play></Response>`;
    }
    return `<Response><Say>Please hold</Say><Pause length="60"/></Response>`;
  }

  static conference(name: string): string {
    return `<Response><Dial><Conference>${TwiMLBuilder.escape(name)}</Conference></Dial></Response>`;
  }

  static gather(options: { action: string; numDigits?: number; timeout?: number }): string {
    let attrs = ` action="${TwiMLBuilder.escape(options.action)}"`;
    if (options.numDigits !== undefined) attrs += ` numDigits="${options.numDigits}"`;
    if (options.timeout !== undefined) attrs += ` timeout="${options.timeout}"`;
    return `<Response><Gather${attrs}/></Response>`;
  }
}
