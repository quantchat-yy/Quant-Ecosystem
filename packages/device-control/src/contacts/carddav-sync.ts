import type { UnifiedContact } from './contact-types.js';
import type { ContactStore } from './contact-store.js';

export interface CardDAVClient {
  fetchContacts(): Promise<string[]>;
  pushContact(vcf: string): Promise<void>;
  deleteContact(id: string): Promise<void>;
}

export function parseVCard(vcf: string): UnifiedContact {
  const lines = vcf.split(/\r?\n/);
  const c: UnifiedContact = {
    id: '',
    firstName: '',
    lastName: '',
    displayName: '',
    phones: [],
    emails: [],
    addresses: [],
    groups: [],
    favorite: false,
    nicknames: [],
    relationships: [],
  };
  for (const raw of lines) {
    const line = raw.replace(/^\s+/, '');
    if (line.startsWith('FN:') || line.startsWith('FN;'))
      c.displayName = line.split(':').slice(1).join(':');
    else if (line.startsWith('N:') || line.startsWith('N;')) {
      const parts = line.split(':').slice(1).join(':').split(';');
      c.lastName = parts[0] ?? '';
      c.firstName = parts[1] ?? '';
    } else if (line.startsWith('TEL')) {
      const val = line.split(':').slice(1).join(':');
      const typeLower = line.toLowerCase();
      const type = typeLower.includes('work')
        ? 'work'
        : typeLower.includes('home')
          ? 'home'
          : 'mobile';
      c.phones.push({ number: val, type });
    } else if (line.startsWith('EMAIL')) {
      const val = line.split(':').slice(1).join(':');
      const type = line.toLowerCase().includes('work') ? 'work' : 'personal';
      c.emails.push({ address: val, type });
    } else if (line.startsWith('ADR')) {
      const val = line.split(':').slice(1).join(':');
      const parts = val.split(';');
      c.addresses.push({
        street: parts[2],
        city: parts[3],
        state: parts[4],
        zip: parts[5],
        country: parts[6],
        type: 'home',
      });
    } else if (line.startsWith('BDAY:')) c.birthday = line.slice(5);
    else if (line.startsWith('NOTE:')) c.notes = line.slice(5);
    else if (line.startsWith('NICKNAME:')) c.nicknames = line.slice(9).split(',');
    else if (line.startsWith('UID:')) c.id = line.slice(4);
  }
  if (!c.id) c.id = crypto.randomUUID();
  return c;
}

export function toVCard(contact: UnifiedContact): string {
  const lines = ['BEGIN:VCARD', 'VERSION:4.0'];
  lines.push(`FN:${contact.displayName}`);
  lines.push(`N:${contact.lastName};${contact.firstName};;;`);
  if (contact.id) lines.push(`UID:${contact.id}`);
  for (const p of contact.phones) lines.push(`TEL;TYPE=${p.type}:${p.number}`);
  for (const e of contact.emails) lines.push(`EMAIL;TYPE=${e.type}:${e.address}`);
  for (const a of contact.addresses)
    lines.push(
      `ADR;TYPE=${a.type}:;;${a.street ?? ''};${a.city ?? ''};${a.state ?? ''};${a.zip ?? ''};${a.country ?? ''}`,
    );
  if (contact.birthday) lines.push(`BDAY:${contact.birthday}`);
  if (contact.notes) lines.push(`NOTE:${contact.notes}`);
  if (contact.nicknames.length) lines.push(`NICKNAME:${contact.nicknames.join(',')}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export class CardDAVSync {
  constructor(private client: CardDAVClient) {}

  async syncFromServer(store: ContactStore): Promise<void> {
    const vcards = await this.client.fetchContacts();
    for (const vcf of vcards) {
      const parsed = parseVCard(vcf);
      const existing = store.getContact(parsed.id);
      if (!existing) {
        store.addContact(parsed);
        continue;
      }
      if ((parsed.lastContacted ?? 0) >= (existing.lastContacted ?? 0))
        store.updateContact(parsed.id, parsed);
    }
  }

  async pushToServer(store: ContactStore): Promise<void> {
    for (const c of store.getAllContacts()) await this.client.pushContact(toVCard(c));
  }
}
