// Contacts Service - Native contacts access abstraction

export interface ContactField {
  type: 'phone' | 'email' | 'address';
  value: string;
  label?: string;
  isPrimary?: boolean;
}

export interface Contact {
  id: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  fields: ContactField[];
  photoUri?: string;
}

export type ContactPermission = 'granted' | 'denied' | 'restricted' | 'not_determined';

export class ContactsService {
  private permission: ContactPermission = 'not_determined';
  private contacts: Contact[] = [];

  async requestPermission(): Promise<ContactPermission> {
    this.permission = 'granted';
    return this.permission;
  }

  getPermissionStatus(): ContactPermission {
    return this.permission;
  }

  async getAll(): Promise<Contact[]> {
    this.ensurePermission();
    return [...this.contacts];
  }

  async search(query: string): Promise<Contact[]> {
    this.ensurePermission();
    const lower = query.toLowerCase();
    return this.contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(lower) ||
        c.fields.some((f) => f.value.toLowerCase().includes(lower)),
    );
  }

  async getById(id: string): Promise<Contact | null> {
    this.ensurePermission();
    return this.contacts.find((c) => c.id === id) ?? null;
  }

  /** @internal - for testing */
  _setContacts(contacts: Contact[]): void {
    this.contacts = contacts;
  }

  private ensurePermission(): void {
    if (this.permission !== 'granted') {
      throw new Error('Contacts permission not granted');
    }
  }
}
