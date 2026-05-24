// ============================================================================
// QuantChat API - Stories Routes
// Post stories (photo/video), view stories, story replies, highlights, close friends
// ============================================================================

import { storiesController } from '../controllers/stories-controller';
import type { RouteDefinition } from './auth';

export const storyRoutes: RouteDefinition[] = [
  // Stories CRUD
  {
    method: 'POST',
    path: '/stories',
    handler: (req, res) => storiesController.createStory(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/stories/me',
    handler: (req, res) => storiesController.getMyStories(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/stories/:storyId',
    handler: (req, res) => storiesController.getStory(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/stories/:storyId',
    handler: (req, res) => storiesController.deleteStory(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/stories/user/:userId',
    handler: (req, res) => storiesController.getUserStories(req, res),
    requiresAuth: true,
  },

  // Story Feed
  {
    method: 'POST',
    path: '/stories/feed',
    handler: (req, res) => storiesController.getFeed(req, res),
    requiresAuth: true,
  },

  // View and interact
  {
    method: 'POST',
    path: '/stories/:storyId/view',
    handler: (req, res) => storiesController.viewStory(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/stories/:storyId/reply',
    handler: (req, res) => storiesController.replyToStory(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/stories/:storyId/screenshot',
    handler: (req, res) => storiesController.reportScreenshot(req, res),
    requiresAuth: true,
  },

  // Highlights
  {
    method: 'POST',
    path: '/highlights',
    handler: (req, res) => storiesController.createHighlight(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/highlights/:userId',
    handler: (req, res) => storiesController.getHighlights(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/highlights/:highlightId/stories',
    handler: (req, res) => storiesController.addToHighlight(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/highlights/:highlightId',
    handler: (req, res) => storiesController.deleteHighlight(req, res),
    requiresAuth: true,
  },

  // Close Friends
  {
    method: 'GET',
    path: '/close-friends',
    handler: (req, res) => storiesController.getCloseFriends(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/close-friends',
    handler: (req, res) => storiesController.setCloseFriends(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/close-friends/:friendId',
    handler: (req, res) => storiesController.addCloseFriend(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/close-friends/:friendId',
    handler: (req, res) => storiesController.removeCloseFriend(req, res),
    requiresAuth: true,
  },
];
