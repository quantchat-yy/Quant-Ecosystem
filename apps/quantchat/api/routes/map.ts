// ============================================================================
// QuantChat API - Map Routes
// Snap map, friend locations, location sharing, places
// ============================================================================

import { mapController } from '../controllers/map-controller';
import type { RouteDefinition } from './auth';

export const mapRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/map/location',
    handler: (req, res) => mapController.updateLocation(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/map/location',
    handler: (req, res) => mapController.getMyLocation(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/map/friends',
    handler: (req, res) => mapController.getFriendLocations(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/map/ghost-mode',
    handler: (req, res) => mapController.setGhostMode(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/map/places',
    handler: (req, res) => mapController.getNearbyPlaces(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/map/places/:placeId',
    handler: (req, res) => mapController.getPlace(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/map/heatmap',
    handler: (req, res) => mapController.getHeatMap(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/map/geofilters',
    handler: (req, res) => mapController.getGeofilters(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/map/geofilters',
    handler: (req, res) => mapController.createGeofilter(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/map/events',
    handler: (req, res) => mapController.getNearbyEvents(req, res),
    requiresAuth: true,
  },
];
