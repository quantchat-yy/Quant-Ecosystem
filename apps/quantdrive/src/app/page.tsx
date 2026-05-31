'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppShell, Sidebar, SearchInput, PageTransition, FadeIn } from '@quant/shared-ui';
import type { SidebarItem } from '@quant/shared-ui';
import type { FileItem } from '../hooks/useFiles';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FileBrowser } from '../components/FileBrowser';
import { UploadArea } from '../components/UploadArea';
import { FilePreview } from '../components/FilePreview';
import { ShareDialog } from '../components/ShareDialog';
import { StorageBar } from '../components/StorageBar';
import { SearchResults } from '../components/SearchResults';

const NAV_ITEMS: SidebarItem[] = [
  { id: 'files', label: 'My Files' },
  { id: 'starred', label: 'Starred' },
  { id: 'recent', label: 'Recent' },
  { id: 'shared', label: 'Shared with Me' },
  { id: 'trash', label: 'Trash' },
];

export default function DrivePage() {
  const [currentPath, setCurrentPath] = useState('');
  const [activeView, setActiveView] = useState('files');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleFolderOpen = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

  const handleBreadcrumbNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const sidebarItems = NAV_ITEMS.map((item) => ({
    ...item,
    active: item.id === activeView,
    onClick: () => {
      setActiveView(item.id);
      setCurrentPath('');
      setSelectedFile(null);
      setSearchQuery('');
    },
  }));

  return (
    <AppShell
      sidebar={
        <Sidebar
          items={sidebarItems}
          header={<h1 className="text-lg font-bold">QuantDrive</h1>}
          footer={<StorageBar />}
          aria-label="Drive navigation"
        />
      }
      aria-label="QuantDrive application"
    >
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <FadeIn direction="down">
            <div className="p-4 border-b border-[var(--quant-border)]">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search files and folders..."
                aria-label="Search files"
              />
            </div>
          </FadeIn>

          <PageTransition>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {searchQuery ? (
                <SearchResults query={searchQuery} onFileSelect={handleFileSelect} />
              ) : (
                <>
                  <Breadcrumbs currentPath={currentPath} onNavigate={handleBreadcrumbNavigate} />
                  <UploadArea />
                  <FileBrowser
                    currentPath={currentPath}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onFileSelect={handleFileSelect}
                    onFolderOpen={handleFolderOpen}
                  />
                </>
              )}
            </div>
          </PageTransition>
        </div>

        <AnimatePresence>
          {selectedFile && (
            <FilePreview
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
              onShare={() => setShareDialogOpen(true)}
            />
          )}
        </AnimatePresence>
      </div>

      {selectedFile && (
        <ShareDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          fileName={selectedFile.name}
        />
      )}
    </AppShell>
  );
}
