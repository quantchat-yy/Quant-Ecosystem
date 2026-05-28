// ============================================================================
// QuantMail - Repository Detail Page
// Full git UI: file tree, commit history, branches, PRs, code review, merge
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@quant/common';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastCommit: { message: string; date: string; author: string };
}

interface Commit {
  sha: string;
  message: string;
  author: { name: string; email: string; avatarUrl: string };
  date: string;
  additions: number;
  deletions: number;
  filesChanged: number;
}

interface Branch {
  name: string;
  isDefault: boolean;
  isProtected: boolean;
  lastCommit: { sha: string; message: string; date: string };
  behindDefault: number;
  aheadDefault: number;
}

interface PullRequest {
  id: string;
  number: number;
  title: string;
  author: { name: string; avatarUrl: string };
  status: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  reviewers: { name: string; status: 'approved' | 'changes_requested' | 'pending' }[];
  labels: { name: string; color: string }[];
  comments: number;
  additions: number;
  deletions: number;
  sourceBranch: string;
  targetBranch: string;
  hasConflicts: boolean;
}

interface DiffHunk {
  header: string;
  lines: {
    type: 'added' | 'removed' | 'context';
    content: string;
    lineNumber: number;
    newLineNumber?: number;
  }[];
}

interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

interface ReviewComment {
  id: string;
  author: { name: string; avatarUrl: string };
  body: string;
  path: string;
  line: number;
  createdAt: string;
  resolved: boolean;
}

interface RepoDetailPageProps {
  repoId: string;
}

type ActiveTab = 'code' | 'commits' | 'branches' | 'prs' | 'review';

export const RepoDetailPage: React.FC<RepoDetailPageProps> = ({ repoId }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState<boolean>(false);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [prFilter, setPrFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [prDiffs, setPrDiffs] = useState<FileDiff[]>([]);
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [commentFile, setCommentFile] = useState<string>('');
  const [commentLine, setCommentLine] = useState<number>(0);
  const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [merging, setMerging] = useState<boolean>(false);
  const [conflictFiles, setConflictFiles] = useState<string[]>([]);
  const [repoInfo, setRepoInfo] = useState<{
    name: string;
    description: string;
    defaultBranch: string;
  } | null>(null);

  const fetchRepoInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/repos/${repoId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch repository info');
      const data = await response.json();
      setRepoInfo(data);
      setSelectedBranch(data.defaultBranch || 'main');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository');
    }
  }, [repoId]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ branch: selectedBranch, path: currentPath });
      const response = await fetch(`/api/repos/${repoId}/files?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [repoId, selectedBranch, currentPath]);

  const fetchCommits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/repos/${repoId}/commits?branch=${selectedBranch}&limit=50`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      if (!response.ok) throw new Error('Failed to fetch commits');
      const data = await response.json();
      setCommits(data.commits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commits');
    } finally {
      setLoading(false);
    }
  }, [repoId, selectedBranch]);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/repos/${repoId}/branches`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  const fetchPullRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/repos/${repoId}/prs?status=${prFilter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch pull requests');
      const data = await response.json();
      setPullRequests(data.pullRequests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pull requests');
    } finally {
      setLoading(false);
    }
  }, [repoId, prFilter]);

  const fetchPRDiffs = useCallback(
    async (prId: string) => {
      try {
        const response = await fetch(`/api/repos/${repoId}/prs/${prId}/diff`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Failed to fetch diff');
        const data = await response.json();
        setPrDiffs(data.files || []);
        setReviewComments(data.comments || []);
      } catch (err) {
        logger.error('Failed to load diff:', err);
      }
    },
    [repoId],
  );

  useEffect(() => {
    fetchRepoInfo();
  }, [fetchRepoInfo]);

  useEffect(() => {
    switch (activeTab) {
      case 'code':
        fetchFiles();
        break;
      case 'commits':
        fetchCommits();
        break;
      case 'branches':
        fetchBranches();
        break;
      case 'prs':
        fetchPullRequests();
        break;
    }
  }, [activeTab, fetchFiles, fetchCommits, fetchBranches, fetchPullRequests]);

  const handleFileClick = useCallback(
    async (entry: FileEntry) => {
      if (entry.type === 'directory') {
        setCurrentPath(entry.path);
      } else {
        try {
          const response = await fetch(
            `/api/repos/${repoId}/files/${encodeURIComponent(entry.path)}?branch=${selectedBranch}`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            },
          );
          if (response.ok) {
            const data = await response.json();
            setFileContent(data.content);
            setViewingFile(entry.path);
          }
        } catch (err) {
          logger.error('Failed to load file:', err);
        }
      }
    },
    [repoId, selectedBranch],
  );

  const handleMergePR = useCallback(
    async (prId: string) => {
      setMerging(true);
      try {
        const response = await fetch(`/api/repos/${repoId}/prs/${prId}/merge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ strategy: 'squash' }),
        });
        if (!response.ok) {
          const data = await response.json();
          if (data.conflicts) {
            setConflictFiles(data.conflicts);
          }
          throw new Error(data.message || 'Merge failed');
        }
        setPullRequests((prev) =>
          prev.map((pr) => (pr.id === prId ? { ...pr, status: 'merged' as const } : pr)),
        );
        setSelectedPR(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Merge failed');
      } finally {
        setMerging(false);
      }
    },
    [repoId],
  );

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !selectedPR) return;
    try {
      const response = await fetch(`/api/repos/${repoId}/prs/${selectedPR.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          body: newComment,
          path: commentFile || undefined,
          line: commentLine || undefined,
        }),
      });
      if (response.ok) {
        const comment = await response.json();
        setReviewComments((prev) => [...prev, comment]);
        setNewComment('');
        setCommentFile('');
        setCommentLine(0);
      }
    } catch (err) {
      logger.error('Failed to add comment:', err);
    }
  }, [newComment, selectedPR, repoId, commentFile, commentLine]);

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean);
    return [
      { name: repoInfo?.name || 'root', path: '' },
      ...parts.map((p, i) => ({ name: p, path: parts.slice(0, i + 1).join('/') })),
    ];
  }, [currentPath, repoInfo]);

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (error && !repoInfo) {
    return (
      <div className="repo-error">
        <h2>Repository Not Found</h2>
        <p>{error}</p>
        <button onClick={fetchRepoInfo}>Retry</button>
      </div>
    );
  }

  return (
    <div className="repo-detail-page">
      <header className="repo-detail-header">
        <h1>{repoInfo?.name || 'Loading...'}</h1>
        {repoInfo?.description && <p className="repo-description">{repoInfo.description}</p>}
        <div className="branch-selector">
          <button onClick={() => setShowBranchDropdown(!showBranchDropdown)} className="branch-btn">
            Branch: {selectedBranch} &#9662;
          </button>
          {showBranchDropdown && (
            <div className="branch-dropdown">
              {branches.map((b) => (
                <button
                  key={b.name}
                  onClick={() => {
                    setSelectedBranch(b.name);
                    setShowBranchDropdown(false);
                  }}
                  className={b.name === selectedBranch ? 'active' : ''}
                >
                  {b.name} {b.isDefault && '(default)'} {b.isProtected && '🔒'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <nav className="repo-tabs">
        {(['code', 'commits', 'branches', 'prs', 'review'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            className={`repo-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'prs' ? 'Pull Requests' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="repo-content">
        {loading && <div className="loading-spinner">Loading...</div>}

        {activeTab === 'code' && !loading && (
          <div className="file-browser">
            <div className="breadcrumbs">
              {breadcrumbs.map((bc, i) => (
                <span key={i}>
                  <button onClick={() => setCurrentPath(bc.path)} className="breadcrumb-link">
                    {bc.name}
                  </button>
                  {i < breadcrumbs.length - 1 && <span className="breadcrumb-sep">/</span>}
                </span>
              ))}
            </div>
            {viewingFile ? (
              <div className="file-viewer">
                <div className="file-viewer-header">
                  <span>{viewingFile}</span>
                  <button
                    onClick={() => {
                      setViewingFile(null);
                      setFileContent(null);
                    }}
                  >
                    Back to tree
                  </button>
                </div>
                <pre className="file-content">
                  <code>{fileContent}</code>
                </pre>
              </div>
            ) : (
              <table className="file-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Last commit</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPath && (
                    <tr
                      className="file-row"
                      onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/'))}
                    >
                      <td className="file-name">
                        <span className="file-icon">&#x1F4C1;</span> ..
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}
                  {files
                    .sort((a, b) =>
                      a.type === b.type
                        ? a.name.localeCompare(b.name)
                        : a.type === 'directory'
                          ? -1
                          : 1,
                    )
                    .map((entry) => (
                      <tr
                        key={entry.path}
                        className="file-row"
                        onClick={() => handleFileClick(entry)}
                      >
                        <td className="file-name">
                          <span className="file-icon">
                            {entry.type === 'directory' ? '&#x1F4C1;' : '&#x1F4C4;'}
                          </span>
                          {entry.name}
                        </td>
                        <td className="commit-msg">{entry.lastCommit.message}</td>
                        <td className="commit-date">{formatDate(entry.lastCommit.date)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'commits' && !loading && (
          <div className="commit-history">
            {commits.length === 0 ? (
              <div className="empty-state">
                <p>No commits found on this branch.</p>
              </div>
            ) : (
              <table className="commits-table">
                <thead>
                  <tr>
                    <th>SHA</th>
                    <th>Message</th>
                    <th>Author</th>
                    <th>Date</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {commits.map((commit) => (
                    <tr key={commit.sha} className="commit-row">
                      <td className="commit-sha">
                        <code>{commit.sha.slice(0, 7)}</code>
                      </td>
                      <td className="commit-message">{commit.message}</td>
                      <td className="commit-author">
                        <img src={commit.author.avatarUrl} alt="" className="author-avatar" />
                        {commit.author.name}
                      </td>
                      <td className="commit-date">{formatDate(commit.date)}</td>
                      <td className="commit-stats">
                        <span className="additions">+{commit.additions}</span>{' '}
                        <span className="deletions">-{commit.deletions}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'branches' && !loading && (
          <div className="branches-list">
            {branches.map((branch) => (
              <div key={branch.name} className={`branch-item ${branch.isDefault ? 'default' : ''}`}>
                <div className="branch-info">
                  <span className="branch-name">{branch.name}</span>
                  {branch.isDefault && <span className="default-badge">default</span>}
                  {branch.isProtected && <span className="protected-badge">protected</span>}
                </div>
                <div className="branch-meta">
                  <span>{branch.lastCommit.message}</span>
                  <span className="branch-status">
                    {branch.aheadDefault} ahead, {branch.behindDefault} behind
                  </span>
                  <span>{formatDate(branch.lastCommit.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'prs' && !loading && (
          <div className="pr-list">
            <div className="pr-filters">
              <button
                onClick={() => setPrFilter('open')}
                className={prFilter === 'open' ? 'active' : ''}
              >
                Open
              </button>
              <button
                onClick={() => setPrFilter('closed')}
                className={prFilter === 'closed' ? 'active' : ''}
              >
                Closed
              </button>
              <button
                onClick={() => setPrFilter('all')}
                className={prFilter === 'all' ? 'active' : ''}
              >
                All
              </button>
            </div>
            {pullRequests.length === 0 ? (
              <div className="empty-state">
                <p>No pull requests found.</p>
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="pr-item"
                  onClick={() => {
                    setSelectedPR(pr);
                    setActiveTab('review');
                    fetchPRDiffs(pr.id);
                  }}
                >
                  <div className="pr-status-icon">
                    {pr.status === 'open' && <span className="status-open">&#x25CF;</span>}
                    {pr.status === 'merged' && <span className="status-merged">&#x25CF;</span>}
                    {pr.status === 'closed' && <span className="status-closed">&#x25CF;</span>}
                  </div>
                  <div className="pr-details">
                    <div className="pr-title">
                      {pr.title} <span className="pr-number">#{pr.number}</span>
                    </div>
                    <div className="pr-meta">
                      {pr.sourceBranch} → {pr.targetBranch} | {pr.author.name} |{' '}
                      {formatDate(pr.createdAt)}
                      {pr.hasConflicts && <span className="conflict-badge">Has conflicts</span>}
                    </div>
                    <div className="pr-labels">
                      {pr.labels.map((l) => (
                        <span
                          key={l.name}
                          className="pr-label"
                          style={{ backgroundColor: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pr-reviewers">
                    {pr.reviewers.map((r) => (
                      <span
                        key={r.name}
                        className={`reviewer-badge ${r.status}`}
                        title={`${r.name}: ${r.status}`}
                      >
                        {r.name.charAt(0)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'review' && selectedPR && (
          <div className="code-review">
            <div className="review-header">
              <h2>
                {selectedPR.title} <span className="pr-number">#{selectedPR.number}</span>
              </h2>
              <div className="review-actions">
                <button
                  onClick={() => setDiffViewMode(diffViewMode === 'unified' ? 'split' : 'unified')}
                >
                  {diffViewMode === 'unified' ? 'Split View' : 'Unified View'}
                </button>
                {selectedPR.status === 'open' && (
                  <button
                    onClick={() => handleMergePR(selectedPR.id)}
                    disabled={merging || selectedPR.hasConflicts}
                    className="merge-btn"
                  >
                    {merging
                      ? 'Merging...'
                      : selectedPR.hasConflicts
                        ? 'Resolve Conflicts First'
                        : 'Merge'}
                  </button>
                )}
              </div>
            </div>
            {conflictFiles.length > 0 && (
              <div className="conflict-resolution">
                <h3>Merge Conflicts</h3>
                {conflictFiles.map((f) => (
                  <div key={f} className="conflict-file">
                    <span>{f}</span>
                    <button>Resolve</button>
                  </div>
                ))}
              </div>
            )}
            <div className="diff-files">
              {prDiffs.map((file) => (
                <div key={file.path} className="diff-file">
                  <div className="diff-file-header">
                    <span className={`diff-status ${file.status}`}>{file.status}</span>
                    <span className="diff-path">{file.path}</span>
                    <span className="diff-stats">
                      <span className="additions">+{file.additions}</span>{' '}
                      <span className="deletions">-{file.deletions}</span>
                    </span>
                  </div>
                  {file.hunks.map((hunk, hIdx) => (
                    <div key={hIdx} className="diff-hunk">
                      <div className="hunk-header">{hunk.header}</div>
                      {hunk.lines.map((line, lIdx) => (
                        <div key={lIdx} className={`diff-line ${line.type}`}>
                          <span className="line-number">{line.lineNumber}</span>
                          <span className="line-content">
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}{' '}
                            {line.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="review-comments-section">
              <h3>Comments ({reviewComments.length})</h3>
              {reviewComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`review-comment ${comment.resolved ? 'resolved' : ''}`}
                >
                  <div className="comment-header">
                    <img src={comment.author.avatarUrl} alt="" className="comment-avatar" />
                    <span className="comment-author">{comment.author.name}</span>
                    <span className="comment-date">{formatDate(comment.createdAt)}</span>
                    {comment.path && (
                      <span className="comment-location">
                        {comment.path}:{comment.line}
                      </span>
                    )}
                  </div>
                  <div className="comment-body">{comment.body}</div>
                </div>
              ))}
              <div className="add-comment">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a review comment..."
                  rows={3}
                />
                <button onClick={handleAddComment} disabled={!newComment.trim()}>
                  Comment
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RepoDetailPage;
