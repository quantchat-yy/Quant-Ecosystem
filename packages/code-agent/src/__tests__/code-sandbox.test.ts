import { MockCodeSandbox } from '../sandbox/code-sandbox.js';
import { SandboxConfig } from '../types.js';

describe('MockCodeSandbox', () => {
  let sandbox: MockCodeSandbox;
  const config: SandboxConfig = {
    timeoutMs: 5000,
    memoryMb: 512,
    cpuCores: 1,
    diskMb: 1024,
    networkAccess: false,
  };

  beforeEach(() => {
    sandbox = new MockCodeSandbox();
  });

  it('executes a command and returns result', async () => {
    const result = await sandbox.execute('npm test', config);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('npm test');
  });

  it('returns preset response', async () => {
    sandbox.setResponse('fail', {
      exitCode: 1,
      stdout: '',
      stderr: 'err',
      durationMs: 100,
      timedOut: false,
    });
    const result = await sandbox.execute('fail', config);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('err');
  });

  it('simulates timeout when durationMs exceeds config', async () => {
    sandbox.setResponse('slow', {
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 10000,
      timedOut: false,
    });
    const result = await sandbox.execute('slow', config);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it('denies network access', async () => {
    const netConfig = { ...config, networkAccess: true };
    await expect(sandbox.execute('curl x', netConfig)).rejects.toThrow('Network access denied');
  });

  it('cleanup sets flag', async () => {
    await sandbox.cleanup();
    expect(sandbox.cleaned).toBe(true);
  });
});
