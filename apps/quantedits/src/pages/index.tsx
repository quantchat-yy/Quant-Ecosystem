// ============================================================================
// QuantEdits - Project Gallery Home
// Tabs: Recent/Templates/Shared, create new button, project cards, import media
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useProjects } from '../hooks/useProjects';
import { useTemplates } from '../hooks/useTemplates';

interface Project {
  id: string;
  title: string;
  thumbnail: string;
  lastEdited: string;
  duration: number;
  type: 'video' | 'photo' | 'design';
  status: 'draft' | 'processing' | 'complete';
  collaborators: string[];
  resolution: string;
  fps: number;
}

interface Template {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  duration: number;
  aspectRatio: string;
  uses: number;
}

interface SharedProject {
  id: string;
  title: string;
  thumbnail: string;
  sharedBy: string;
  sharedAt: string;
  permission: 'view' | 'comment' | 'edit';
  lastEdited: string;
}

type TabType = 'recent' | 'templates' | 'shared';
type ProjectType = 'video' | 'photo' | 'design';

const ProjectCard: React.FC<{
  project: Project;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
}> = ({ project, onOpen, onDuplicate }) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatTimeAgo = useCallback((dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }, []);

  return (
    <div className="project-card" onClick={() => onOpen(project.id)}>
      <div className="project-card-thumbnail">
        <img src={project.thumbnail} alt={project.title} className="thumbnail-image" />
        <div className="project-card-overlay">
          {project.type === 'video' && (
            <span className="duration-badge">{formatDuration(project.duration)}</span>
          )}
          <span className={`status-badge status-${project.status}`}>{project.status}</span>
        </div>
        {project.collaborators.length > 0 && (
          <div className="collaborator-avatars">
            {project.collaborators.slice(0, 3).map((collab, i) => (
              <div key={i} className="collab-avatar">
                {collab.charAt(0)}
              </div>
            ))}
            {project.collaborators.length > 3 && (
              <div className="collab-avatar collab-more">+{project.collaborators.length - 3}</div>
            )}
          </div>
        )}
      </div>
      <div className="project-card-info">
        <div className="project-card-header">
          <h3 className="project-title">{project.title}</h3>
          <button
            className="menu-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ...
          </button>
        </div>
        <div className="project-meta">
          <span className="project-type-badge">{project.type}</span>
          <span className="project-resolution">{project.resolution}</span>
          <span className="project-edited">{formatTimeAgo(project.lastEdited)}</span>
        </div>
      </div>
      {showMenu && (
        <div className="project-menu">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(project.id);
            }}
          >
            Duplicate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            Share
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="delete-btn"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const TemplateCard: React.FC<{ template: Template; onUse: (id: string) => void }> = ({
  template,
  onUse,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="template-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="template-thumbnail">
        <img src={template.thumbnail} alt={template.title} className="thumbnail-image" />
        {isHovered && (
          <div className="template-preview-overlay">
            <button className="use-template-btn" onClick={() => onUse(template.id)}>
              Use Template
            </button>
          </div>
        )}
        <span className="template-ratio-badge">{template.aspectRatio}</span>
      </div>
      <div className="template-info">
        <h4 className="template-title">{template.title}</h4>
        <div className="template-meta">
          <span className="template-category">{template.category}</span>
          <span className="template-uses">{template.uses} uses</span>
        </div>
      </div>
    </div>
  );
};

const SharedProjectCard: React.FC<{ project: SharedProject; onOpen: (id: string) => void }> = ({
  project,
  onOpen,
}) => {
  return (
    <div className="shared-project-card" onClick={() => onOpen(project.id)}>
      <div className="shared-thumbnail">
        <img src={project.thumbnail} alt={project.title} className="thumbnail-image" />
        <span className={`permission-badge permission-${project.permission}`}>
          {project.permission}
        </span>
      </div>
      <div className="shared-info">
        <h4 className="shared-title">{project.title}</h4>
        <p className="shared-by">Shared by {project.sharedBy}</p>
        <span className="shared-date">{new Date(project.sharedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

const ProjectGallery: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
  } = useTemplates();

  const projects: Project[] = (projectsData ?? []) as Project[];
  const templates: Template[] = (templatesData ?? []) as Template[];
  const sharedProjects: SharedProject[] = [];

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter((p: Project) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    if (sortBy === 'date')
      filtered.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime());
    else if (sortBy === 'name') filtered.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'type') filtered.sort((a, b) => a.type.localeCompare(b.type));
    return filtered;
  }, [projects, searchQuery, sortBy]);

  const handleCreateProject = useCallback((_type: ProjectType) => {
    setShowCreateModal(false);
  }, []);

  const handleOpenProject = useCallback((_id: string) => {
    // Navigation would happen here in production
  }, []);

  const handleDuplicateProject = useCallback((_id: string) => {
    // Duplication would happen here in production
  }, []);

  const handleUseTemplate = useCallback((_id: string) => {
    // Template usage would happen here in production
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    // File import would happen here in production
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingFile(false);
  }, []);

  if (projectsLoading || templatesLoading) {
    return <LoadingState variant="skeleton" text="Loading your projects..." />;
  }

  if (projectsError) {
    return <ErrorState message={projectsError.message} onRetry={() => void refetchProjects()} />;
  }

  return (
    <div
      className="project-gallery"
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <header className="gallery-header">
        <div className="header-left">
          <h1 className="gallery-title">QuantEdits</h1>
          <p className="gallery-subtitle">Create, edit, and collaborate on stunning content</p>
        </div>
        <div className="header-actions">
          <button
            className="import-btn"
            onClick={() => document.getElementById('file-import')?.click()}
          >
            Import Media
          </button>
          <input id="file-import" type="file" multiple accept="video/*,image/*,audio/*" hidden />
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            + Create New
          </button>
        </div>
      </header>

      {isDraggingFile && (
        <div className="drop-overlay">
          <div className="drop-content">
            <div className="drop-icon">+</div>
            <p>Drop files to import</p>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="create-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <div className="project-type-grid">
              <button className="type-option" onClick={() => handleCreateProject('video')}>
                <div className="type-icon">🎬</div>
                <span className="type-name">Video</span>
                <span className="type-desc">1920x1080, 30fps</span>
              </button>
              <button className="type-option" onClick={() => handleCreateProject('photo')}>
                <div className="type-icon">📸</div>
                <span className="type-name">Photo</span>
                <span className="type-desc">High resolution edit</span>
              </button>
              <button className="type-option" onClick={() => handleCreateProject('design')}>
                <div className="type-icon">🎨</div>
                <span className="type-name">Design</span>
                <span className="type-desc">Custom canvas</span>
              </button>
            </div>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="gallery-toolbar">
        <div className="tab-bar">
          <button
            className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent ({projects.length})
          </button>
          <button
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates ({templates.length})
          </button>
          <button
            className={`tab ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            Shared ({sharedProjects.length})
          </button>
        </div>
        <div className="toolbar-right">
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
      </div>

      <div className="gallery-content">
        {activeTab === 'recent' && (
          <div className="projects-grid">
            {filteredProjects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Create your first project or import media to get started"
                actionLabel="Create Project"
                onAction={() => setShowCreateModal(true)}
              />
            ) : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={handleOpenProject}
                  onDuplicate={handleDuplicateProject}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="templates-grid">
            {templates.length === 0 ? (
              <EmptyState title="No templates" description="Templates will appear here" />
            ) : (
              templates.map((template) => (
                <TemplateCard key={template.id} template={template} onUse={handleUseTemplate} />
              ))
            )}
          </div>
        )}

        {activeTab === 'shared' && (
          <div className="shared-grid">
            <EmptyState
              title="No shared projects"
              description="Projects shared with you will appear here"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectGallery;
