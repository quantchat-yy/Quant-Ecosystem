// ============================================================================
// QuantMail - Inbox Page (Full Rewrite)
// Smart category tabs, batch actions, drag-to-label, star/snooze/archive
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logger } from '@quant/common';

interface EmailAddress {
  name?: string;
  email: string;
}

interface EmailAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  snippet: string;
  body: string;
  category: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isSnoozed: boolean;
  snoozeUntil?: string;
  attachments: EmailAttachment[];
  receivedAt: string;
  threadId: string;
  threadCount: number;
}

interface CategoryTab {
  id: string;
  label: string;
  icon: string;
  unreadCount: number;
}

interface InboxPageProps {
  userId?: string;
}

interface SearchFilter {
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  dateRange?: { start: string; end: string };
  isUnread?: boolean;
  label?: string;
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const InboxPage: React.FC<InboxPageProps> = ({ userId }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('primary');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<SearchFilter>({});
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dragOverLabel, setDragOverLabel] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<string[]>([
    'Important',
    'Work',
    'Personal',
    'Finance',
    'Travel',
    'Shopping',
  ]);
  const [batchActionInProgress, setBatchActionInProgress] = useState<boolean>(false);
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState<string | null>(null);
  const emailListRef = useRef<HTMLDivElement>(null);

  const categoryTabs: CategoryTab[] = useMemo(
    () => [
      {
        id: 'primary',
        label: 'Primary',
        icon: 'inbox',
        unreadCount: emails.filter((e) => e.category === 'primary' && !e.isRead).length,
      },
      {
        id: 'social',
        label: 'Social',
        icon: 'users',
        unreadCount: emails.filter((e) => e.category === 'social' && !e.isRead).length,
      },
      {
        id: 'promotions',
        label: 'Promotions',
        icon: 'tag',
        unreadCount: emails.filter((e) => e.category === 'promotions' && !e.isRead).length,
      },
      {
        id: 'updates',
        label: 'Updates',
        icon: 'bell',
        unreadCount: emails.filter((e) => e.category === 'updates' && !e.isRead).length,
      },
      {
        id: 'forums',
        label: 'Forums',
        icon: 'message-circle',
        unreadCount: emails.filter((e) => e.category === 'forums' && !e.isRead).length,
      },
    ],
    [emails],
  );

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        page: String(page),
        limit: '50',
        sortBy,
        sortOrder,
        ...(searchQuery && { q: searchQuery }),
        ...(searchFilters.from && { from: searchFilters.from }),
        ...(searchFilters.hasAttachment && { hasAttachment: 'true' }),
        ...(searchFilters.isUnread && { isUnread: 'true' }),
        ...(searchFilters.label && { label: searchFilters.label }),
      });
      const response = await fetch(`/api/emails?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch emails: ${response.statusText}`);
      const data = await response.json();
      setEmails(data.emails || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, page, sortBy, sortOrder, searchQuery, searchFilters]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const handleSelectAll = useCallback(() => {
    if (selectedEmails.size === filteredEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredEmails.map((e) => e.id)));
    }
  }, [selectedEmails]);

  const handleSelectEmail = useCallback((emailId: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) next.delete(emailId);
      else next.add(emailId);
      return next;
    });
  }, []);

  const handleStarEmail = useCallback(
    async (emailId: string) => {
      try {
        const email = emails.find((e) => e.id === emailId);
        if (!email) return;
        await fetch(`/api/emails/${emailId}/star`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ starred: !email.isStarred }),
        });
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, isStarred: !e.isStarred } : e)),
        );
      } catch (err) {
        logger.error('Failed to star email:', err);
      }
    },
    [emails],
  );

  const handleArchiveBatch = useCallback(async () => {
    if (selectedEmails.size === 0) return;
    setBatchActionInProgress(true);
    try {
      await fetch('/api/emails/batch/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      });
      setEmails((prev) => prev.filter((e) => !selectedEmails.has(e.id)));
      setSelectedEmails(new Set());
    } catch (err) {
      logger.error('Failed to archive emails:', err);
    } finally {
      setBatchActionInProgress(false);
    }
  }, [selectedEmails]);

  const handleDeleteBatch = useCallback(async () => {
    if (selectedEmails.size === 0) return;
    setBatchActionInProgress(true);
    try {
      await fetch('/api/emails/batch/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      });
      setEmails((prev) => prev.filter((e) => !selectedEmails.has(e.id)));
      setSelectedEmails(new Set());
    } catch (err) {
      logger.error('Failed to delete emails:', err);
    } finally {
      setBatchActionInProgress(false);
    }
  }, [selectedEmails]);

  const handleMarkReadBatch = useCallback(
    async (read: boolean) => {
      if (selectedEmails.size === 0) return;
      setBatchActionInProgress(true);
      try {
        await fetch('/api/emails/batch/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ emailIds: Array.from(selectedEmails), read }),
        });
        setEmails((prev) =>
          prev.map((e) => (selectedEmails.has(e.id) ? { ...e, isRead: read } : e)),
        );
        setSelectedEmails(new Set());
      } catch (err) {
        logger.error('Failed to mark emails:', err);
      } finally {
        setBatchActionInProgress(false);
      }
    },
    [selectedEmails],
  );

  const handleSnoozeEmail = useCallback(async (emailId: string, duration: string) => {
    const snoozeUntil = new Date();
    switch (duration) {
      case '1h':
        snoozeUntil.setHours(snoozeUntil.getHours() + 1);
        break;
      case '3h':
        snoozeUntil.setHours(snoozeUntil.getHours() + 3);
        break;
      case 'tomorrow':
        snoozeUntil.setDate(snoozeUntil.getDate() + 1);
        snoozeUntil.setHours(9, 0, 0);
        break;
      case 'nextweek':
        snoozeUntil.setDate(snoozeUntil.getDate() + 7);
        snoozeUntil.setHours(9, 0, 0);
        break;
    }
    try {
      await fetch(`/api/emails/${emailId}/snooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() }),
      });
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, isSnoozed: true, snoozeUntil: snoozeUntil.toISOString() } : e,
        ),
      );
      setSnoozeMenuOpen(null);
    } catch (err) {
      logger.error('Failed to snooze email:', err);
    }
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, emailId: string) => {
    e.dataTransfer.setData('text/plain', emailId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, label: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLabel(label);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, label: string) => {
    e.preventDefault();
    const emailId = e.dataTransfer.getData('text/plain');
    setDragOverLabel(null);
    if (!emailId) return;
    try {
      await fetch(`/api/emails/${emailId}/labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ label }),
      });
      setEmails((prev) =>
        prev.map((em) => (em.id === emailId ? { ...em, labels: [...em.labels, label] } : em)),
      );
    } catch (err) {
      logger.error('Failed to apply label:', err);
    }
  }, []);

  const filteredEmails = useMemo(() => {
    let result = emails.filter((e) => e.category === activeCategory && !e.isArchived);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(query) ||
          e.from.email.toLowerCase().includes(query) ||
          e.snippet.toLowerCase().includes(query) ||
          (e.from.name && e.from.name.toLowerCase().includes(query)),
      );
    }
    if (searchFilters.hasAttachment) {
      result = result.filter((e) => e.attachments.length > 0);
    }
    if (searchFilters.isUnread) {
      result = result.filter((e) => !e.isRead);
    }
    if (searchFilters.label) {
      result = result.filter((e) => e.labels.includes(searchFilters.label!));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'date':
          cmp = new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
          break;
        case 'sender':
          cmp = (a.from.name || a.from.email).localeCompare(b.from.name || b.from.email);
          break;
        case 'subject':
          cmp = a.subject.localeCompare(b.subject);
          break;
      }
      return sortOrder === 'desc' ? cmp : -cmp;
    });
    return result;
  }, [emails, activeCategory, searchQuery, searchFilters, sortBy, sortOrder]);

  if (error) {
    return (
      <div className="inbox-error">
        <div className="error-icon">&#x26A0;</div>
        <h2>Failed to Load Inbox</h2>
        <p>{error}</p>
        <button onClick={fetchEmails} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="inbox-page">
      <header className="inbox-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="filter-toggle-btn"
          >
            Filters {showFilterPanel ? '▲' : '▼'}
          </button>
        </div>
        {showFilterPanel && (
          <div className="filter-panel">
            <label>
              <input
                type="checkbox"
                checked={!!searchFilters.hasAttachment}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    hasAttachment: e.target.checked || undefined,
                  }))
                }
              />
              Has attachment
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!searchFilters.isUnread}
                onChange={(e) =>
                  setSearchFilters((prev) => ({ ...prev, isUnread: e.target.checked || undefined }))
                }
              />
              Unread only
            </label>
            <select
              value={searchFilters.label || ''}
              onChange={(e) =>
                setSearchFilters((prev) => ({ ...prev, label: e.target.value || undefined }))
              }
            >
              <option value="">All labels</option>
              {availableLabels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'sender' | 'subject')}
            >
              <option value="date">Date</option>
              <option value="sender">Sender</option>
              <option value="subject">Subject</option>
            </select>
            <button onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}>
              {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>
        )}
      </header>

      <nav className="category-tabs">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            className={`category-tab ${activeCategory === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(tab.id);
              setPage(1);
            }}
          >
            <span className="tab-label">{tab.label}</span>
            {tab.unreadCount > 0 && <span className="unread-badge">{tab.unreadCount}</span>}
          </button>
        ))}
      </nav>

      {selectedEmails.size > 0 && (
        <div className="batch-actions-toolbar">
          <span className="selection-count">{selectedEmails.size} selected</span>
          <button onClick={handleArchiveBatch} disabled={batchActionInProgress}>
            Archive
          </button>
          <button onClick={handleDeleteBatch} disabled={batchActionInProgress}>
            Delete
          </button>
          <button onClick={() => handleMarkReadBatch(true)} disabled={batchActionInProgress}>
            Mark Read
          </button>
          <button onClick={() => handleMarkReadBatch(false)} disabled={batchActionInProgress}>
            Mark Unread
          </button>
          <button onClick={() => setSelectedEmails(new Set())} className="clear-selection">
            Clear
          </button>
        </div>
      )}

      <div className="inbox-content" ref={emailListRef}>
        <aside className="labels-sidebar">
          <h3>Labels</h3>
          {availableLabels.map((label) => (
            <div
              key={label}
              className={`label-item ${dragOverLabel === label ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, label)}
              onDragLeave={() => setDragOverLabel(null)}
              onDrop={(e) => handleDrop(e, label)}
            >
              <span
                className="label-color"
                style={{ backgroundColor: `hsl(${(label.charCodeAt(0) * 37) % 360}, 70%, 50%)` }}
              ></span>
              <span className="label-name">{label}</span>
            </div>
          ))}
        </aside>

        <main className="email-list">
          {loading ? (
            <div className="loading-state">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="email-skeleton">
                  <div className="skeleton-checkbox"></div>
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-line short"></div>
                    <div className="skeleton-line long"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#x1F4EC;</div>
              <h3>No emails in {activeCategory}</h3>
              <p>Messages that match this category will appear here.</p>
            </div>
          ) : (
            <>
              <div className="select-all-row">
                <input
                  type="checkbox"
                  checked={
                    selectedEmails.size === filteredEmails.length && filteredEmails.length > 0
                  }
                  onChange={handleSelectAll}
                />
                <span>Select all ({filteredEmails.length})</span>
              </div>
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={`email-row ${!email.isRead ? 'unread' : ''} ${selectedEmails.has(email.id) ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, email.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(email.id)}
                    onChange={() => handleSelectEmail(email.id)}
                    className="email-checkbox"
                  />
                  <button
                    className={`star-button ${email.isStarred ? 'starred' : ''}`}
                    onClick={() => handleStarEmail(email.id)}
                  >
                    {email.isStarred ? '★' : '☆'}
                  </button>
                  <div className="email-sender">{email.from.name || email.from.email}</div>
                  <div className="email-content-preview">
                    <span className="email-subject">{email.subject}</span>
                    <span className="email-snippet"> - {email.snippet}</span>
                  </div>
                  <div className="email-meta">
                    {email.attachments.length > 0 && (
                      <span
                        className="attachment-icon"
                        title={`${email.attachments.length} attachment(s)`}
                      >
                        &#128206;
                      </span>
                    )}
                    {email.labels.map((l) => (
                      <span
                        key={l}
                        className="email-label-chip"
                        style={{
                          backgroundColor: `hsl(${(l.charCodeAt(0) * 37) % 360}, 70%, 90%)`,
                        }}
                      >
                        {l}
                      </span>
                    ))}
                    {email.threadCount > 1 && (
                      <span className="thread-count">({email.threadCount})</span>
                    )}
                    <span className="email-time">{formatRelativeTime(email.receivedAt)}</span>
                  </div>
                  <div className="email-actions">
                    <button onClick={() => handleSnoozeEmail(email.id, 'tomorrow')} title="Snooze">
                      &#x23F0;
                    </button>
                    <button onClick={() => handleArchiveBatch()} title="Archive">
                      &#x1F4E6;
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </main>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
