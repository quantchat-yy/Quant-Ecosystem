// ============================================================================
// QuantMail - Repos Page (Full Rewrite)
// Repository list with search, filter, create, fork, clone URL
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  visibility: 'public' | 'private' | 'internal';
  isForked: boolean;
  forkedFrom?: string;
  lastUpdated: string;
  createdAt: string;
  defaultBranch: string;
  size: number;
  topics: string[];
  hasWiki: boolean;
  hasIssues: boolean;
  owner: { name: string; avatarUrl: string };
  cloneUrls: { https: string; ssh: string };
}

interface CreateRepoForm {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  initReadme: boolean;
  gitignoreTemplate: string;
  license: string;
}

interface ReposPageProps {
  userId?: string;
}

const LANGUAGES = ['All', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby', 'Swift'];
const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently Updated' },
  { value: 'stars', label: 'Most Stars' },
  { value: 'forks', label: 'Most Forks' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'created', label: 'Newest' },
];

const GITIGNORE_TEMPLATES = ['None', 'Node', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby'];
const LICENSE_OPTIONS = ['None', 'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-2-Clause', 'ISC', 'Unlicense'];

export const ReposPage: React.FC<ReposPageProps> = ({ userId }) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateRepoForm>({
    name: '', description: '', visibility: 'public', initReadme: true, gitignoreTemplate: 'None', license: 'MIT'
  });
  const [creating, setCreating] = useState<boolean>(false);
  const [cloneUrlRepo, setCloneUrlRepo] = useState<string | null>(null);
  const [cloneProtocol, setCloneProtocol] = useState<'https' | 'ssh'>('https');
  const [forking, setForking] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30', sort: sortBy });
      if (searchQuery) params.set('q', searchQuery);
      if (languageFilter !== 'All') params.set('language', languageFilter);
      if (visibilityFilter !== 'all') params.set('visibility', visibilityFilter);
      const response = await fetch(`/api/repos?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      const data = await response.json();
      setRepos(data.repositories || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, searchQuery, languageFilter, visibilityFilter]);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  const handleCreateRepo = useCallback(async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(createForm)
      });
      if (!response.ok) throw new Error('Failed to create repository');
      const newRepo = await response.json();
      setRepos(prev => [newRepo, ...prev]);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', visibility: 'public', initReadme: true, gitignoreTemplate: 'None', license: 'MIT' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository');
    } finally {
      setCreating(false);
    }
  }, [createForm]);

  const handleForkRepo = useCallback(async (repoId: string) => {
    setForking(repoId);
    try {
      const response = await fetch(`/api/repos/${repoId}/fork`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fork repository');
      const forkedRepo = await response.json();
      setRepos(prev => [forkedRepo, ...prev]);
    } catch (err) {
      console.error('Fork failed:', err);
    } finally {
      setForking(null);
    }
  }, []);

  const handleStarRepo = useCallback(async (repoId: string) => {
    try {
      const repo = repos.find(r => r.id === repoId);
      if (!repo) return;
      await fetch(`/api/repos/${repoId}/star`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setRepos(prev => prev.map(r => r.id === repoId ? { ...r, stars: r.stars + 1 } : r));
    } catch (err) {
      console.error('Star failed:', err);
    }
  }, [repos]);

  const copyCloneUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    });
  }, []);

  const filteredRepos = useMemo(() => {
    return repos;
  }, [repos]);

  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  if (error && repos.length === 0) {
    return (
      <div className="repos-error">
        <h2>Failed to Load Repositories</h2>
        <p>{error}</p>
        <button onClick={fetchRepos}>Retry</button>
      </div>
    );
  }

  return (
    <div className="repos-page">
      <header className="repos-header">
        <h1>Repositories</h1>
        <button onClick={() => setShowCreateModal(true)} className="create-repo-btn">+ New Repository</button>
      </header>

      <div className="repos-filters">
        <input type="text" placeholder="Find a repository..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="repo-search" />
        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="language-filter">
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'public' | 'private')} className="visibility-filter">
          <option value="all">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="repos-count">{totalCount} repositories found</div>

      {loading ? (
        <div className="repos-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="repo-skeleton">
              <div className="skeleton-title"></div>
              <div className="skeleton-desc"></div>
              <div className="skeleton-meta"></div>
            </div>
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="repos-empty">
          <h3>No repositories found</h3>
          <p>Try adjusting your search or filters, or create a new repository.</p>
        </div>
      ) : (
        <div className="repos-list">
          {filteredRepos.map(repo => (
            <div key={repo.id} className="repo-card">
              <div className="repo-card-header">
                <div className="repo-name-section">
                  <a href={`/repos/${repo.id}`} className="repo-name">{repo.name}</a>
                  <span className={`visibility-badge ${repo.visibility}`}>{repo.visibility}</span>
                  {repo.isForked && <span className="forked-badge">forked from {repo.forkedFrom}</span>}
                </div>
                <div className="repo-actions">
                  <button onClick={() => handleStarRepo(repo.id)} className="star-btn">&#9733; {repo.stars}</button>
                  <button onClick={() => handleForkRepo(repo.id)} disabled={forking === repo.id} className="fork-btn">
                    {forking === repo.id ? 'Forking...' : `Fork ${repo.forks}`}
                  </button>
                  <button onClick={() => setCloneUrlRepo(cloneUrlRepo === repo.id ? null : repo.id)} className="clone-btn">Clone</button>
                </div>
              </div>
              {repo.description && <p className="repo-description">{repo.description}</p>}
              {repo.topics.length > 0 && (
                <div className="repo-topics">
                  {repo.topics.map(t => <span key={t} className="topic-badge">{t}</span>)}
                </div>
              )}
              <div className="repo-meta">
                {repo.language && (
                  <span className="repo-language">
                    <span className="language-dot" style={{ backgroundColor: repo.languageColor }}></span>
                    {repo.language}
                  </span>
                )}
                <span className="repo-stars">&#9733; {repo.stars}</span>
                <span className="repo-forks">&#x2442; {repo.forks}</span>
                <span className="repo-issues">{repo.openIssues} issues</span>
                <span className="repo-updated">Updated {formatRelativeTime(repo.lastUpdated)}</span>
              </div>
              {cloneUrlRepo === repo.id && (
                <div className="clone-dropdown">
                  <div className="clone-tabs">
                    <button onClick={() => setCloneProtocol('https')} className={cloneProtocol === 'https' ? 'active' : ''}>HTTPS</button>
                    <button onClick={() => setCloneProtocol('ssh')} className={cloneProtocol === 'ssh' ? 'active' : ''}>SSH</button>
                  </div>
                  <div className="clone-url-row">
                    <input type="text" readOnly value={cloneProtocol === 'https' ? repo.cloneUrls.https : repo.cloneUrls.ssh} className="clone-url-input" />
                    <button onClick={() => copyCloneUrl(cloneProtocol === 'https' ? repo.cloneUrls.https : repo.cloneUrls.ssh)} className="copy-btn">Copy</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalCount > 30 && (
        <div className="repos-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(totalCount / 30)}</span>
          <button disabled={page >= Math.ceil(totalCount / 30)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-repo-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create a New Repository</h2>
            <div className="form-group">
              <label>Repository name *</label>
              <input type="text" value={createForm.name} onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))} placeholder="my-awesome-project" />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input type="text" value={createForm.description} onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Short description" />
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <div className="radio-group">
                <label><input type="radio" name="visibility" value="public" checked={createForm.visibility === 'public'} onChange={() => setCreateForm(prev => ({ ...prev, visibility: 'public' }))} /> Public</label>
                <label><input type="radio" name="visibility" value="private" checked={createForm.visibility === 'private'} onChange={() => setCreateForm(prev => ({ ...prev, visibility: 'private' }))} /> Private</label>
              </div>
            </div>
            <div className="form-group">
              <label><input type="checkbox" checked={createForm.initReadme} onChange={(e) => setCreateForm(prev => ({ ...prev, initReadme: e.target.checked }))} /> Initialize with README</label>
            </div>
            <div className="form-group">
              <label>.gitignore template</label>
              <select value={createForm.gitignoreTemplate} onChange={(e) => setCreateForm(prev => ({ ...prev, gitignoreTemplate: e.target.value }))}>
                {GITIGNORE_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>License</label>
              <select value={createForm.license} onChange={(e) => setCreateForm(prev => ({ ...prev, license: e.target.value }))}>
                {LICENSE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">Cancel</button>
              <button onClick={handleCreateRepo} disabled={creating || !createForm.name.trim()} className="create-btn">
                {creating ? 'Creating...' : 'Create Repository'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReposPage;
