// ============================================================================
// QuantChat API - AR Filters Routes
// AR filter gallery, custom filters, face tracking data
// ============================================================================

import { arFiltersController } from '../controllers/ar-filters-controller';
import type { RouteDefinition } from './auth';

export const arFilterRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/filters',
    handler: (req, res) => arFiltersController.getFilters(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/filters/trending',
    handler: (req, res) => arFiltersController.getTrending(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/filters/favorites',
    handler: (req, res) => arFiltersController.getFavorites(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/filters/:filterId',
    handler: (req, res) => arFiltersController.getFilter(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/filters',
    handler: (req, res) => arFiltersController.createCustomFilter(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/filters/:filterId/apply',
    handler: (req, res) => arFiltersController.applyFilter(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/filters/:filterId/favorite',
    handler: (req, res) => arFiltersController.addFavorite(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/filters/:filterId/favorite',
    handler: (req, res) => arFiltersController.removeFavorite(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/filters/detect-faces',
    handler: (req, res) => arFiltersController.detectFaces(req, res),
    requiresAuth: true,
  },
];
