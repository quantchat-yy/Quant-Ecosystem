import type { CapabilityProvider } from './types.js';

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface ContactsCapability extends CapabilityProvider<'contacts'> {
  list(): Promise<Contact[]>;
  get(id: string): Promise<Contact>;
  create(contact: Omit<Contact, 'id'>): Promise<Contact>;
  update(id: string, data: Partial<Contact>): Promise<Contact>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Contact[]>;
  sync(): Promise<void>;
}
