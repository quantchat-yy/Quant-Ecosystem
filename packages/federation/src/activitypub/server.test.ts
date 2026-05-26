import { describe, it, expect } from 'vitest';
import { FederationServer } from './server.js';
import { Actor } from './actor.js';

describe('FederationServer', () => {
  it('GET actor route returns valid actor', () => {
    const server = new FederationServer();
    const actor = new Actor('alice', 'local.example');
    server.registerActor(actor);

    const response = server.handle('GET', '/users/alice');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/activity+json');
    const body = response.body as Record<string, unknown>;
    expect(body['type']).toBe('Person');
    expect(body['preferredUsername']).toBe('alice');
  });

  it('POST inbox calls processor', () => {
    const server = new FederationServer();
    const actor = new Actor('bob', 'local.example');
    server.registerActor(actor);

    const response = server.handle('POST', '/users/bob/inbox', {
      type: 'Follow',
      actor: 'https://remote.example/users/carol',
      object: 'https://local.example/users/bob',
    });

    expect(response.status).toBe(202);
    const body = response.body as Record<string, unknown>;
    expect(body['type']).toBe('Accept');
  });

  it('GET outbox returns collection', () => {
    const server = new FederationServer();
    const actor = new Actor('dave', 'local.example');
    server.registerActor(actor);

    const response = server.handle('GET', '/users/dave/outbox');

    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(body['type']).toBe('OrderedCollection');
    expect(body['totalItems']).toBe(0);
  });

  it('GET followers returns collection', () => {
    const server = new FederationServer();
    const actor = new Actor('eve', 'local.example');
    server.registerActor(actor);

    const response = server.handle('GET', '/users/eve/followers');

    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(body['type']).toBe('OrderedCollection');
  });
});
