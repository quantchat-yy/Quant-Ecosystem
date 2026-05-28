export interface ContactPhone {
  number: string;
  type: 'mobile' | 'home' | 'work';
  label?: string;
}
export interface ContactEmail {
  address: string;
  type: 'personal' | 'work';
  label?: string;
}
export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  type: 'home' | 'work';
}
export interface ContactGroup {
  id: string;
  name: string;
  members: string[];
}
export interface ContactRelationship {
  type: 'family' | 'friend' | 'colleague' | 'other';
  label: string;
}

export interface UnifiedContact {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phones: ContactPhone[];
  emails: ContactEmail[];
  addresses: ContactAddress[];
  birthday?: string;
  notes?: string;
  avatar?: string;
  groups: string[];
  favorite: boolean;
  lastContacted?: number;
  nicknames: string[];
  relationships: ContactRelationship[];
}
