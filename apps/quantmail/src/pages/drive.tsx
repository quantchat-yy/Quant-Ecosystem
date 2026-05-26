// ============================================================================
// QuantMail - Drive Page
// File storage: folder tree, upload dropzone, sharing, version history, quota
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType: string;
  size: number;
  path: string;
  parentId: string | null;
  createdAt: string;
  modifiedAt: string;
  owner: { name: string; email: string; avatarUrl?: string };
  sharedWith: { email: string; permission: 'view' | 'edit' | 'admin' }[];
  isStarred: boolean;
  isTrashed: boolean;
  versions: FileVersion[];
  thumbnailUrl?: string;
}

interface FileVersion {
  id: string;
  version: number;
  size: number;
  modifiedAt: string;
  modifiedBy: string;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface ShareSettings {
  email: string;
  permission: 'view' | 'edit' | 'admin';
}

interface StorageQuota {
  used: number;
  total: number;
  breakdown: { type: string; size: number; color: string }[];
}

interface DrivePageProps {
  userId?: string;
}

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'modified' | 'size' | 'type';

export const DrivePage: React.FC<DrivePageProps> = ({ userId }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'My Drive' },
  ]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<DriveFile | null>(null);
  const [shareEmail, setShareEmail] = useState<string>('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [showVersions, setShowVersions] = useState<DriveFile | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: DriveFile } | null>(
    null,
  );
  const [quota, setQuota] = useState<StorageQuota>({
    used: 0,
    total: 15 * 1024 * 1024 * 1024,
    breakdown: [],
  });
  const [showNewFolderDialog, setShowNewFolderDialog] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set('folderId', currentFolderId);
      if (searchQuery) params.set('q', searchQuery);
      const response = await fetch(`/api/drive/files?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data.files || []);
      if (data.quota) setQuota(data.quota);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchQuery]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const navigateToFolder = useCallback((folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFiles(new Set());
  }, []);

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      const crumb = breadcrumbs[index];
      setCurrentFolderId(crumb.id);
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setSelectedFiles(new Set());
    },
    [breadcrumbs],
  );

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const newUploads: UploadItem[] = Array.from(fileList).map((file, i) => ({
        id: `upload-${Date.now()}-${i}`,
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      setUploads((prev) => [...prev, ...newUploads]);

      for (const upload of newUploads) {
        setUploads((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, status: 'uploading' as const } : u)),
        );
        try {
          const formData = new FormData();
          formData.append('file', upload.file);
          if (currentFolderId) formData.append('folderId', currentFolderId);

          const xhr = new XMLHttpRequest();
          await new Promise<void>((resolve, reject) => {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                setUploads((prev) =>
                  prev.map((u) => (u.id === upload.id ? { ...u, progress } : u)),
                );
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed: ${xhr.statusText}`));
            };
            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.open('POST', '/api/drive/upload');
            xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
            xhr.send(formData);
          });
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id ? { ...u, status: 'complete' as const, progress: 100 } : u,
            ),
          );
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? {
                    ...u,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : u,
            ),
          );
        }
      }
      fetchFiles();
    },
    [currentFolderId, fetchFiles],
  );

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      const response = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId }),
      });
      if (!response.ok) throw new Error('Failed to create folder');
      const folder = await response.json();
      setFiles((prev) => [folder, ...prev]);
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }, [newFolderName, currentFolderId]);

  const handleDelete = useCallback(async (fileIds: string[]) => {
    try {
      await fetch('/api/drive/files/trash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ fileIds }),
      });
      setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
      setSelectedFiles(new Set());
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!showShareModal || !shareEmail.trim()) return;
    try {
      await fetch(`/api/drive/files/${showShareModal.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email: shareEmail, permission: sharePermission }),
      });
      setFiles((prev) =>
        prev.map((f) =>
          f.id === showShareModal.id
            ? {
                ...f,
                sharedWith: [...f.sharedWith, { email: shareEmail, permission: sharePermission }],
              }
            : f,
        ),
      );
      setShareEmail('');
    } catch (err) {
      console.error('Failed to share:', err);
    }
  }, [showShareModal, shareEmail, sharePermission]);

  const handleRename = useCallback(
    async (fileId: string) => {
      if (!renameValue.trim()) {
        setRenaming(null);
        return;
      }
      try {
        await fetch(`/api/drive/files/${fileId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ name: renameValue }),
        });
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, name: renameValue } : f)));
        setRenaming(null);
        setRenameValue('');
      } catch (err) {
        console.error('Failed to rename:', err);
      }
    },
    [renameValue],
  );

  const handleStar = useCallback(async (fileId: string) => {
    try {
      await fetch(`/api/drive/files/${fileId}/star`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isStarred: !f.isStarred } : f)),
      );
    } catch (err) {
      console.error('Failed to star:', err);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: DriveFile) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'modified':
          cmp = new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'type':
          cmp = a.mimeType.localeCompare(b.mimeType);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [files, sortField, sortOrder]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  const getFileIcon = (file: DriveFile): string => {
    if (file.type === 'folder') return '\u{1F4C1}';
    if (file.mimeType.startsWith('image/')) return '\u{1F5BC}';
    if (file.mimeType.includes('pdf')) return '\u{1F4C4}';
    if (file.mimeType.includes('video')) return '\u{1F3AC}';
    if (file.mimeType.includes('audio')) return '\u{1F3B5}';
    if (file.mimeType.includes('zip') || file.mimeType.includes('tar')) return '\u{1F4E6}';
    if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel'))
      return '\u{1F4CA}';
    return '\u{1F4C4}';
  };

  const quotaPercentage = useMemo(() => Math.round((quota.used / quota.total) * 100), [quota]);

  if (error && files.length === 0) {
    return (
      <div className="drive-error">
        <h2>Failed to Load Drive</h2>
        <p>{error}</p>
        <button onClick={fetchFiles}>Retry</button>
      </div>
    );
  }

  return (
    <div
      className="drive-page"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
      onClick={() => setContextMenu(null)}
    >
      {isDragOver && (
        <div className="upload-overlay">
          <div className="overlay-content">
            <span className="upload-icon">{'\u{2B06}'}</span>
            <p>Drop files to upload</p>
          </div>
        </div>
      )}

      <header className="drive-header">
        <h1>Drive</h1>
        <div className="drive-actions">
          <button onClick={() => fileInputRef.current?.click()} className="upload-btn">
            Upload
          </button>
          <button onClick={() => setShowNewFolderDialog(true)} className="new-folder-btn">
            New Folder
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
        <div className="drive-search">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="view-controls">
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'active' : ''}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'active' : ''}
          >
            List
          </button>
          <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
            <option value="name">Name</option>
            <option value="modified">Modified</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
          </select>
        </div>
      </header>

      <div className="drive-layout">
        <aside className="drive-sidebar">
          <nav className="folder-tree">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setBreadcrumbs([{ id: null, name: 'My Drive' }]);
              }}
              className="tree-item"
            >
              My Drive
            </button>
            <button className="tree-item">Shared with me</button>
            <button className="tree-item">Starred</button>
            <button className="tree-item">Trash</button>
          </nav>
          <div className="storage-quota">
            <div className="quota-bar">
              <div className="quota-fill" style={{ width: `${quotaPercentage}%` }}></div>
            </div>
            <span className="quota-text">
              {formatFileSize(quota.used)} of {formatFileSize(quota.total)} used ({quotaPercentage}
              %)
            </span>
          </div>
        </aside>

        <main className="drive-content">
          <div className="breadcrumbs">
            {breadcrumbs.map((crumb, i) => (
              <span key={i}>
                <button onClick={() => navigateToBreadcrumb(i)} className="breadcrumb-link">
                  {crumb.name}
                </button>
                {i < breadcrumbs.length - 1 && <span className="breadcrumb-sep">/</span>}
              </span>
            ))}
          </div>

          {selectedFiles.size > 0 && (
            <div className="batch-toolbar">
              <span>{selectedFiles.size} selected</span>
              <button onClick={() => handleDelete(Array.from(selectedFiles))}>Delete</button>
              <button onClick={() => setSelectedFiles(new Set())}>Clear</button>
            </div>
          )}

          {loading ? (
            <div className="drive-loading">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="file-skeleton"></div>
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="empty-state">
              <h3>No files here</h3>
              <p>Upload files or create a folder to get started.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="file-grid">
              {sortedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`file-card ${selectedFiles.has(file.id) ? 'selected' : ''}`}
                  onClick={() =>
                    file.type === 'folder'
                      ? navigateToFolder(file)
                      : setSelectedFiles((prev) => {
                          const n = new Set(prev);
                          n.has(file.id) ? n.delete(file.id) : n.add(file.id);
                          return n;
                        })
                  }
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  onDoubleClick={() => file.type === 'folder' && navigateToFolder(file)}
                >
                  <div className="file-thumbnail">
                    {file.thumbnailUrl ? (
                      <img src={file.thumbnailUrl} alt="" />
                    ) : (
                      <span className="file-icon-large">{getFileIcon(file)}</span>
                    )}
                  </div>
                  <div className="file-card-info">
                    {renaming === file.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(file.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(file.id);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="file-name">{file.name}</span>
                    )}
                    {file.isStarred && <span className="star-indicator">\u2B50</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="file-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Modified</th>
                  <th>Size</th>
                  <th>Shared</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className={selectedFiles.has(file.id) ? 'selected' : ''}
                    onClick={() =>
                      file.type === 'folder'
                        ? navigateToFolder(file)
                        : setSelectedFiles((prev) => {
                            const n = new Set(prev);
                            n.has(file.id) ? n.delete(file.id) : n.add(file.id);
                            return n;
                          })
                    }
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <td className="file-name-cell">
                      <span className="file-icon">{getFileIcon(file)}</span>
                      {file.name}
                      {file.isStarred && ' \u2B50'}
                    </td>
                    <td>{new Date(file.modifiedAt).toLocaleDateString()}</td>
                    <td>{file.type === 'folder' ? '-' : formatFileSize(file.size)}</td>
                    <td>{file.sharedWith.length > 0 ? `${file.sharedWith.length} people` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>

      {uploads.length > 0 && (
        <div className="upload-panel">
          <h4>Uploads</h4>
          {uploads.map((u) => (
            <div key={u.id} className={`upload-item ${u.status}`}>
              <span className="upload-name">{u.file.name}</span>
              <div className="upload-progress-bar">
                <div className="progress-fill" style={{ width: `${u.progress}%` }}></div>
              </div>
              <span className="upload-status">
                {u.status === 'complete'
                  ? '\u2713'
                  : u.status === 'error'
                    ? '\u2717'
                    : `${u.progress}%`}
              </span>
            </div>
          ))}
          <button
            onClick={() => setUploads((prev) => prev.filter((u) => u.status !== 'complete'))}
            className="clear-uploads"
          >
            Clear completed
          </button>
        </div>
      )}

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button
            onClick={() => {
              setRenaming(contextMenu.file.id);
              setRenameValue(contextMenu.file.name);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              setShowShareModal(contextMenu.file);
              setContextMenu(null);
            }}
          >
            Share
          </button>
          <button
            onClick={() => {
              setShowVersions(contextMenu.file);
              setContextMenu(null);
            }}
          >
            Version history
          </button>
          <button
            onClick={() => {
              handleStar(contextMenu.file.id);
              setContextMenu(null);
            }}
          >
            {contextMenu.file.isStarred ? 'Unstar' : 'Star'}
          </button>
          <button
            onClick={() => {
              handleDelete([contextMenu.file.id]);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(null)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Share "{showShareModal.name}"</h2>
            <div className="share-form">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Email address"
              />
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
              >
                <option value="view">Viewer</option>
                <option value="edit">Editor</option>
              </select>
              <button onClick={handleShare} disabled={!shareEmail.trim()}>
                Share
              </button>
            </div>
            <div className="shared-list">
              <h4>Shared with:</h4>
              {showShareModal.sharedWith.map((s) => (
                <div key={s.email} className="shared-item">
                  <span>{s.email}</span>
                  <span className="perm-badge">{s.permission}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShareModal(null)}>Done</button>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="modal-overlay" onClick={() => setShowVersions(null)}>
          <div className="versions-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Version History - {showVersions.name}</h2>
            <div className="versions-list">
              {showVersions.versions.length === 0 ? (
                <p>No previous versions.</p>
              ) : (
                showVersions.versions.map((v) => (
                  <div key={v.id} className="version-item">
                    <span className="version-num">v{v.version}</span>
                    <span className="version-date">{new Date(v.modifiedAt).toLocaleString()}</span>
                    <span className="version-by">{v.modifiedBy}</span>
                    <span className="version-size">{formatFileSize(v.size)}</span>
                    <button className="restore-btn">Restore</button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowVersions(null)}>Close</button>
          </div>
        </div>
      )}

      {showNewFolderDialog && (
        <div className="modal-overlay" onClick={() => setShowNewFolderDialog(false)}>
          <div className="new-folder-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFolderDialog(false)}>Cancel</button>
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrivePage;
