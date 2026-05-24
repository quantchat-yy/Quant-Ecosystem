// ============================================================================
// QuantMail - Contacts Page (Full Rewrite)
// Alphabetical list, groups, search, add contact, import/export, quick email
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  avatarUrl?: string;
  groups: string[];
  birthday?: string;
  address?: string;
  notes?: string;
  isFavorite: boolean;
  lastContactedAt?: string;
  createdAt: string;
}

interface ContactGroup {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface AddContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  birthday: string;
  groups: string[];
  notes: string;
}

interface ContactsPageProps {
  userId?: string;
}

export const ContactsPage: React.FC<ContactsPageProps> = ({ userId }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [addForm, setAddForm] = useState<AddContactForm>({
    firstName: '', lastName: '', email: '', phone: '', company: '', title: '', birthday: '', groups: [], notes: ''
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'recent'>('name');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contacts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
      setGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleAddContact = useCallback(async () => {
    if (!addForm.firstName.trim() || !addForm.email.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(addForm)
      });
      if (!response.ok) throw new Error('Failed to add contact');
      const newContact = await response.json();
      setContacts(prev => [...prev, newContact]);
      setShowAddForm(false);
      setAddForm({ firstName: '', lastName: '', email: '', phone: '', company: '', title: '', birthday: '', groups: [], notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  }, [addForm]);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setContacts(prev => prev.filter(c => c.id !== contactId));
      if (selectedContact?.id === contactId) setSelectedContact(null);
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  }, [selectedContact]);

  const handleToggleFavorite = useCallback(async (contactId: string) => {
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;
      await fetch(`/api/contacts/${contactId}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ isFavorite: !contact.isFavorite })
      });
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, isFavorite: !c.isFavorite } : c));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }, [contacts]);

  const handleImportContacts = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const imported: { firstName: string; lastName: string; email: string }[] = [];
      for (const line of lines.slice(1)) {
        const [firstName, lastName, email] = line.split(',').map(s => s.trim().replace(/"/g, ''));
        if (email && email.includes('@')) {
          imported.push({ firstName: firstName || '', lastName: lastName || '', email });
        }
      }
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ contacts: imported })
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(prev => [...prev, ...(data.imported || [])]);
      }
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  }, []);

  const handleExportContacts = useCallback(() => {
    const headers = 'First Name,Last Name,Email,Phone,Company\n';
    const rows = contacts.map(c => `"${c.firstName}","${c.lastName}","${c.email}","${c.phone || ''}","${c.company || ''}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (selectedGroup !== 'all') {
      result = result.filter(c => c.groups.includes(selectedGroup));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'email': return a.email.localeCompare(b.email);
        case 'recent': return (b.lastContactedAt || '').localeCompare(a.lastContactedAt || '');
        default: return 0;
      }
    });
    return result;
  }, [contacts, selectedGroup, searchQuery, sortBy]);

  const alphabeticalGroups = useMemo(() => {
    const grouped: Record<string, Contact[]> = {};
    filteredContacts.forEach(c => {
      const letter = (c.firstName || c.email).charAt(0).toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(c);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContacts]);

  const isBirthdayToday = (birthday?: string): boolean => {
    if (!birthday) return false;
    const today = new Date();
    const bday = new Date(birthday);
    return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
  };

  if (error && contacts.length === 0) {
    return (<div className="contacts-error"><h2>Failed to Load Contacts</h2><p>{error}</p><button onClick={fetchContacts}>Retry</button></div>);
  }

  return (
    <div className="contacts-page">
      <header className="contacts-header">
        <h1>Contacts ({contacts.length})</h1>
        <div className="header-actions">
          <button onClick={() => setShowAddForm(true)} className="add-contact-btn">+ Add Contact</button>
          <label className="import-btn">
            Import {importing && '...'}
            <input type="file" accept=".csv" hidden onChange={(e) => { if (e.target.files?.[0]) handleImportContacts(e.target.files[0]); }} />
          </label>
          <button onClick={handleExportContacts} className="export-btn">Export</button>
        </div>
      </header>

      <div className="contacts-layout">
        <aside className="groups-sidebar">
          <h3>Groups</h3>
          <button onClick={() => setSelectedGroup('all')} className={`group-item ${selectedGroup === 'all' ? 'active' : ''}`}>
            All Contacts <span className="group-count">{contacts.length}</span>
          </button>
          <button onClick={() => setSelectedGroup('favorites')} className={`group-item ${selectedGroup === 'favorites' ? 'active' : ''}`}>
            Favorites <span className="group-count">{contacts.filter(c => c.isFavorite).length}</span>
          </button>
          {groups.map(g => (
            <button key={g.id} onClick={() => setSelectedGroup(g.name)} className={`group-item ${selectedGroup === g.name ? 'active' : ''}`}>
              <span className="group-color" style={{ backgroundColor: g.color }}></span>
              {g.name} <span className="group-count">{g.count}</span>
            </button>
          ))}
        </aside>

        <main className="contacts-main">
          <div className="contacts-toolbar">
            <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="contacts-search" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'recent')}>
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="recent">Recently Contacted</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-state">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="contact-skeleton"></div>)}</div>
          ) : filteredContacts.length === 0 ? (
            <div className="empty-state"><h3>No contacts found</h3><p>Add your first contact or adjust your search.</p></div>
          ) : (
            <div className="contacts-list">
              {alphabeticalGroups.map(([letter, letterContacts]) => (
                <div key={letter} className="letter-group">
                  <div className="letter-header">{letter}</div>
                  {letterContacts.map(contact => (
                    <div key={contact.id} className="contact-item" onClick={() => setSelectedContact(contact)}>
                      <div className="contact-avatar">
                        {contact.avatarUrl ? <img src={contact.avatarUrl} alt="" /> : <span className="avatar-initial">{contact.firstName.charAt(0)}{contact.lastName.charAt(0)}</span>}
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">{contact.firstName} {contact.lastName}</div>
                        <div className="contact-email">{contact.email}</div>
                      </div>
                      <div className="contact-badges">
                        {isBirthdayToday(contact.birthday) && <span className="birthday-badge" title="Birthday today!">&#x1F382;</span>}
                        {contact.isFavorite && <span className="favorite-badge">&#x2B50;</span>}
                      </div>
                      <div className="contact-actions">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(contact.id); }} className="fav-btn">{contact.isFavorite ? '★' : '☆'}</button>
                        <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="email-btn" title="Send email">&#x2709;</a>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </main>

        {selectedContact && (
          <aside className="contact-detail-panel">
            <div className="detail-header">
              <div className="detail-avatar">
                {selectedContact.avatarUrl ? <img src={selectedContact.avatarUrl} alt="" /> : <span className="avatar-large">{selectedContact.firstName.charAt(0)}{selectedContact.lastName.charAt(0)}</span>}
              </div>
              <h2>{selectedContact.firstName} {selectedContact.lastName}</h2>
              {selectedContact.title && selectedContact.company && <p>{selectedContact.title} at {selectedContact.company}</p>}
            </div>
            <div className="detail-fields">
              <div className="field"><label>Email</label><a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a></div>
              {selectedContact.phone && <div className="field"><label>Phone</label><span>{selectedContact.phone}</span></div>}
              {selectedContact.address && <div className="field"><label>Address</label><span>{selectedContact.address}</span></div>}
              {selectedContact.birthday && <div className="field"><label>Birthday</label><span>{new Date(selectedContact.birthday).toLocaleDateString()}</span></div>}
              {selectedContact.notes && <div className="field"><label>Notes</label><p>{selectedContact.notes}</p></div>}
              {selectedContact.groups.length > 0 && <div className="field"><label>Groups</label><div className="group-chips">{selectedContact.groups.map(g => <span key={g} className="group-chip">{g}</span>)}</div></div>}
            </div>
            <div className="detail-actions">
              <button onClick={() => handleDeleteContact(selectedContact.id)} className="delete-btn">Delete</button>
              <button onClick={() => setSelectedContact(null)}>Close</button>
            </div>
          </aside>
        )}
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="add-contact-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Contact</h2>
            <div className="form-row">
              <div className="form-group"><label>First Name *</label><input type="text" value={addForm.firstName} onChange={(e) => setAddForm(p => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="form-group"><label>Last Name</label><input type="text" value={addForm.lastName} onChange={(e) => setAddForm(p => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Email *</label><input type="email" value={addForm.email} onChange={(e) => setAddForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="form-group"><label>Phone</label><input type="tel" value={addForm.phone} onChange={(e) => setAddForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="form-row">
              <div className="form-group"><label>Company</label><input type="text" value={addForm.company} onChange={(e) => setAddForm(p => ({ ...p, company: e.target.value }))} /></div>
              <div className="form-group"><label>Title</label><input type="text" value={addForm.title} onChange={(e) => setAddForm(p => ({ ...p, title: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Birthday</label><input type="date" value={addForm.birthday} onChange={(e) => setAddForm(p => ({ ...p, birthday: e.target.value }))} /></div>
            <div className="form-group"><label>Notes</label><textarea value={addForm.notes} onChange={(e) => setAddForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            <div className="modal-actions">
              <button onClick={() => setShowAddForm(false)}>Cancel</button>
              <button onClick={handleAddContact} disabled={saving || !addForm.firstName.trim() || !addForm.email.trim()}>{saving ? 'Saving...' : 'Add Contact'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
