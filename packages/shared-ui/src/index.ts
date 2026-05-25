// ============================================================================
// @quant/shared-ui - Reusable React UI Components
// ============================================================================

// Base components
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Modal } from './components/Modal';
export type { ModalProps } from './components/Modal';

export { Avatar } from './components/Avatar';
export type { AvatarProps } from './components/Avatar';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';

export { Toast } from './components/Toast';
export type { ToastProps } from './components/Toast';

export { Loader } from './components/Loader';
export type { LoaderProps } from './components/Loader';

// Media components
export { VideoPlayer, AudioPlayer, ImageViewer } from './components/MediaPlayer';
export type {
  VideoPlayerProps,
  AudioPlayerProps,
  ImageViewerProps,
} from './components/MediaPlayer';

// Chat components
export { ChatBubble } from './components/Chat/ChatBubble';
export type { ChatBubbleProps } from './components/Chat/ChatBubble';

export { ChatInput } from './components/Chat/ChatInput';
export type { ChatInputProps } from './components/Chat/ChatInput';

export { ChatList } from './components/Chat/ChatList';
export type { ChatListProps, ChatListItem } from './components/Chat/ChatList';

export { TypingIndicator } from './components/Chat/TypingIndicator';
export type { TypingIndicatorProps } from './components/Chat/TypingIndicator';

// Feed components
export { FeedCard } from './components/Feed/FeedCard';
export type { FeedCardProps } from './components/Feed/FeedCard';

export { StoryRing } from './components/Feed/StoryRing';
export type { StoryRingProps, StoryItem } from './components/Feed/StoryRing';

// Navigation components
export { BottomNav } from './components/Navigation/BottomNav';
export type { BottomNavProps, NavItem } from './components/Navigation/BottomNav';

export { TopBar } from './components/Navigation/TopBar';
export type { TopBarProps } from './components/Navigation/TopBar';

export { SearchBar } from './components/Navigation/SearchBar';
export type { SearchBarProps } from './components/Navigation/SearchBar';

// AI components
export { AISuggestion } from './components/AI/AISuggestion';
export type { AISuggestionProps } from './components/AI/AISuggestion';

export { AIChat } from './components/AI/AIChat';
export type { AIChatProps, AIChatMessage } from './components/AI/AIChat';

// Hooks
export { useAuth } from './hooks/useAuth';
export type { UseAuthReturn, AuthUser } from './hooks/useAuth';

export { useRealtime } from './hooks/useRealtime';
export type { UseRealtimeReturn, UseRealtimeOptions } from './hooks/useRealtime';

export { useTheme } from './hooks/useTheme';
export type { UseThemeReturn, ThemeMode } from './hooks/useTheme';

// Layout components
export { AppShell } from './components/Layout/AppShell';
export type { AppShellProps } from './components/Layout/AppShell';

export { Sidebar } from './components/Layout/Sidebar';
export type { SidebarProps, SidebarItem } from './components/Layout/Sidebar';

export { PageContainer } from './components/Layout/PageContainer';
export type { PageContainerProps, Breadcrumb } from './components/Layout/PageContainer';

// Form components
export { FormField } from './components/Form/FormField';
export type { FormFieldProps } from './components/Form/FormField';

export { TextArea } from './components/Form/TextArea';
export type { TextAreaProps } from './components/Form/TextArea';

export { Select } from './components/Form/Select';
export type { SelectProps, SelectOption } from './components/Form/Select';

export { SearchInput } from './components/Form/SearchInput';
export type { SearchInputProps } from './components/Form/SearchInput';

export { FileUpload } from './components/Form/FileUpload';
export type { FileUploadProps } from './components/Form/FileUpload';

// Dialog component
export { Dialog } from './components/Dialog';
export type { DialogProps } from './components/Dialog';

// Skeleton component
export { Skeleton } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';

// VoiceInput component
export { VoiceInput } from './components/VoiceInput';
export type { VoiceInputProps } from './components/VoiceInput';

// Themes
export { lightTheme } from './themes/light';
export { darkTheme } from './themes/dark';
export { neonTheme } from './themes/neon';

// Design tokens
export { lightTokens, darkTokens, neonTokens, tokensToCssVariables } from './themes/tokens';
export type { DesignTokens } from './themes/tokens';

// Advanced Frontend Systems
export * from './advanced';
