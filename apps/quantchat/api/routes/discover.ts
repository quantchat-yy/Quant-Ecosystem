// ============================================================================
// QuantChat API - Discover Routes
// Discover content, featured stories, trending, publishers
// ============================================================================

import { discoverController } from '../controllers/discover-controller';
import type { RouteDefinition } from './auth';

export const discoverRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/discover',
    handler: (req, res) => discoverController.getFeed(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/featured',
    handler: (req, res) => discoverController.getFeatured(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/trending',
    handler: (req, res) => discoverController.getTrending(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/search',
    handler: (req, res) => discoverController.search(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/publishers',
    handler: (req, res) => discoverController.getPublishers(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/publishers/:publisherId',
    handler: (req, res) => discoverController.getPublisher(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/publishers/:publisherId/content',
    handler: (req, res) => discoverController.getPublisherContent(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/discover/publishers/:publisherId/subscribe',
    handler: (req, res) => discoverController.subscribe(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/discover/publishers/:publisherId/subscribe',
    handler: (req, res) => discoverController.unsubscribe(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/discover/subscriptions',
    handler: (req, res) => discoverController.getSubscriptions(req, res),
    requiresAuth: true,
  },
];
