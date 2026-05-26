// ============================================================================
// QuantMail - File Manager Component
// File browser with breadcrumbs, grid/list toggle, context menu, navigation
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType: string;
  size: number;
  modifiedAt: string;
  createdAt: string;
  thumbnailUrl?: string;
  isShared: boolean;
  isStarred: boolean;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface FileManagerProps {
  files: FileItem[];
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  onFileSelect: (fileId: string) => void;
  onFileOpen: (file: FileItem) => void;
  onDelete: (fileIds: string[]) => void;
  onRename: (fileId: string, newName: string) => void;
  onMove: (fileIds: string[], targetFolderId: string) => void;
  onShare: (fileId: string) => void;
  onStar: (fileId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  file: FileItem;
}

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'modified' | 'size' | 'type';

const FILE_TYPE_ICONS: Record<string, string> = {
  folder: '\u{1F4C1}',
  'image/': '\u{1F5BC}',
  'video/': '\u{1F3AC}',
  'audio/': '\u{1F3B5}',
  'application/pdf': '\u{1F4C4}',
  'application/zip': '\u{1F4E6}',
  'text/': '\u{1F4DD}',
  'application/json': '\u{2699}',
  default: '\u{1F4C4}',
};

const getFileIcon = (file: FileItem): string => {
  if (file.type === 'folder') return FILE_TYPE_ICONS.folder;
  for (const [key, icon] of Object.entries(FILE_TYPE_ICONS)) {
    if (file.mimeType.startsWith(key) || file.mimeType === key) return icon;
  }
  return FILE_TYPE_ICONS.default;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0)
    return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  breadcrumbs,
  onNavigate,
  onFileSelect,
  onFileOpen,
  onDelete,
  onRename,
  onMove,
  onShare,
  onStar,
  loading = false,
  emptyMessage = 'This folder is empty',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
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
  }, [files, sortField, sortOrder]);

  const handleFileClick = useCallback(
    (file: FileItem, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectedFiles((prev) => {
          const next = new Set(prev);
          if (next.has(file.id)) next.delete(file.id);
          else next.add(file.id);
          return next;
        });
      } else if (e.shiftKey && selectedFiles.size > 0) {
        const lastSelected = Array.from(selectedFiles).pop();
        const lastIdx = sortedFiles.findIndex((f) => f.id === lastSelected);
        const currentIdx = sortedFiles.findIndex((f) => f.id === file.id);
        const [start, end] = lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
        const rangeIds = sortedFiles.slice(start, end + 1).map((f) => f.id);
        setSelectedFiles(new Set([...selectedFiles, ...rangeIds]));
      } else {
        setSelectedFiles(new Set([file.id]));
        onFileSelect(file.id);
      }
    },
    [selectedFiles, sortedFiles, onFileSelect],
  );

  const handleDoubleClick = useCallback(
    (file: FileItem) => {
      if (file.type === 'folder') {
        onNavigate(file.id);
      } else {
        onFileOpen(file);
      }
      setSelectedFiles(new Set());
    },
    [onNavigate, onFileOpen],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: FileItem) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, file });
      if (!selectedFiles.has(file.id)) {
        setSelectedFiles(new Set([file.id]));
      }
    },
    [selectedFiles],
  );

  const handleRenameSubmit = useCallback(
    (fileId: string) => {
      if (renameValue.trim() && renameValue !== files.find((f) => f.id === fileId)?.name) {
        onRename(fileId, renameValue.trim());
      }
      setRenamingFile(null);
      setRenameValue('');
    },
    [renameValue, files, onRename],
  );

  const handleDragStart = useCallback((fileId: string) => {
    setDraggedFile(fileId);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, file: FileItem) => {
      if (file.type === 'folder' && file.id !== draggedFile) {
        e.preventDefault();
        setDragOverFolder(file.id);
      }
    },
    [draggedFile],
  );

  const handleDrop = useCallback(
    (file: FileItem) => {
      if (draggedFile && file.type === 'folder' && file.id !== draggedFile) {
        const filesToMove = selectedFiles.has(draggedFile)
          ? Array.from(selectedFiles)
          : [draggedFile];
        onMove(filesToMove, file.id);
      }
      setDraggedFile(null);
      setDragOverFolder(null);
    },
    [draggedFile, selectedFiles, onMove],
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    },
    [sortField],
  );

  return (
    <div
      className="file-manager"
      onClick={() => {
        setContextMenu(null);
        setSelectedFiles(new Set());
      }}
    >
      <div className="fm-toolbar">
        <div className="fm-breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(crumb.id);
                }}
                className="breadcrumb-btn"
              >
                {crumb.name}
              </button>
              {i < breadcrumbs.length - 1 && <span className="sep">/</span>}
            </span>
          ))}
        </div>
        <div className="fm-view-toggle">
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'active' : ''}
            title="Grid view"
          >
            &#x2630;
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'active' : ''}
            title="List view"
          >
            &#x2261;
          </button>
        </div>
      </div>

      {selectedFiles.size > 1 && (
        <div className="fm-batch-actions" onClick={(e) => e.stopPropagation()}>
          <span>{selectedFiles.size} items selected</span>
          <button onClick={() => onDelete(Array.from(selectedFiles))}>Delete</button>
          <button onClick={() => setSelectedFiles(new Set())}>Clear</button>
        </div>
      )}

      {loading ? (
        <div className="fm-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="file-skeleton"></div>
          ))}
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="fm-empty">
          <p>{emptyMessage}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          className="fm-grid"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedFiles(new Set());
          }}
        >
          {sortedFiles.map((file) => (
            <div
              key={file.id}
              className={`fm-card ${selectedFiles.has(file.id) ? 'selected' : ''} ${dragOverFolder === file.id ? 'drag-over' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleFileClick(file, e);
              }}
              onDoubleClick={() => handleDoubleClick(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              draggable
              onDragStart={() => handleDragStart(file.id)}
              onDragOver={(e) => handleDragOver(e, file)}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={() => handleDrop(file)}
            >
              <div className="fm-card-icon">
                {file.thumbnailUrl ? (
                  <img src={file.thumbnailUrl} alt="" className="file-thumb" />
                ) : (
                  <span className="file-type-icon">{getFileIcon(file)}</span>
                )}
              </div>
              <div className="fm-card-name">
                {renamingFile === file.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(file.id);
                      if (e.key === 'Escape') setRenamingFile(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span title={file.name}>{file.name}</span>
                )}
                {file.isStarred && <span className="star-mark">\u2B50</span>}
                {file.isShared && <span className="shared-mark">{'\u{1F465}'}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="fm-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Name {sortField === 'name' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
              </th>
              <th onClick={() => handleSort('modified')} className="sortable">
                Modified {sortField === 'modified' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
              </th>
              <th onClick={() => handleSort('size')} className="sortable">
                Size {sortField === 'size' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
              </th>
              <th onClick={() => handleSort('type')} className="sortable">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file) => (
              <tr
                key={file.id}
                className={`${selectedFiles.has(file.id) ? 'selected' : ''} ${dragOverFolder === file.id ? 'drag-over' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileClick(file, e);
                }}
                onDoubleClick={() => handleDoubleClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                draggable
                onDragStart={() => handleDragStart(file.id)}
                onDragOver={(e) => handleDragOver(e, file)}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={() => handleDrop(file)}
              >
                <td className="name-cell">
                  <span className="file-icon">{getFileIcon(file)}</span>
                  {renamingFile === file.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(file.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(file.id);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="file-name">{file.name}</span>
                  )}
                  {file.isStarred && <span className="star-mark">\u2B50</span>}
                  {file.isShared && <span className="shared-mark">{'\u{1F465}'}</span>}
                </td>
                <td>{formatDate(file.modifiedAt)}</td>
                <td>{file.type === 'folder' ? '-' : formatFileSize(file.size)}</td>
                <td>
                  {file.type === 'folder' ? 'Folder' : file.mimeType.split('/')[1] || file.mimeType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {contextMenu && (
        <div
          className="fm-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file.type === 'folder' && (
            <button
              onClick={() => {
                onNavigate(contextMenu.file.id);
                setContextMenu(null);
              }}
            >
              Open
            </button>
          )}
          <button
            onClick={() => {
              setRenamingFile(contextMenu.file.id);
              setRenameValue(contextMenu.file.name);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              onShare(contextMenu.file.id);
              setContextMenu(null);
            }}
          >
            Share
          </button>
          <button
            onClick={() => {
              onStar(contextMenu.file.id);
              setContextMenu(null);
            }}
          >
            {contextMenu.file.isStarred ? 'Unstar' : 'Star'}
          </button>
          <div className="menu-divider"></div>
          <button
            onClick={() => {
              onDelete([contextMenu.file.id]);
              setContextMenu(null);
            }}
            className="danger"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FileManager;
