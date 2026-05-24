// ============================================================================
// QuantChat - Map Page
// Snap map with friend locations, heat maps, places
// ============================================================================

import React, { useState, useEffect } from 'react';
import type { FriendLocation, Place, HeatMapData, GeoLocation } from '../types';
import { apiClient } from '../services/api-client';

interface MapPageProps {
  currentUserId: string;
}

export const MapPage: React.FC<MapPageProps> = ({ currentUserId }) => {
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [myLocation, setMyLocation] = useState<GeoLocation | null>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [mapView, setMapView] = useState<'friends' | 'heatmap' | 'places'>('friends');
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    setLoading(true);

    // Get current location (simulated)
    const location: GeoLocation = {
      latitude: 40.7580,
      longitude: -73.9855,
      accuracy: 10,
      city: 'New York',
      country: 'US',
    };
    setMyLocation(location);

    // Update location on server
    await apiClient.updateLocation({ location });

    // Load friend locations
    const friendsRes = await apiClient.getFriendLocations(['friend1', 'friend2', 'friend3']);
    if (friendsRes.success && friendsRes.data) {
      setFriendLocations(friendsRes.data);
    }

    // Load nearby places
    const placesRes = await apiClient.getNearbyPlaces(location.latitude, location.longitude, 2000);
    if (placesRes.success && placesRes.data) {
      setNearbyPlaces(placesRes.data);
    }

    setLoading(false);
  };

  const handleToggleGhostMode = async () => {
    const newMode = !ghostMode;
    setGhostMode(newMode);
    await apiClient.setGhostMode(newMode);
  };

  const handleFriendTap = (friend: FriendLocation) => {
    setSelectedFriend(friend);
    setSelectedPlace(null);
  };

  const handlePlaceTap = (place: Place) => {
    setSelectedPlace(place);
    setSelectedFriend(null);
  };

  if (loading) {
    return <div className="map-loading">Loading map...</div>;
  }

  return (
    <div className="map-page">
      {/* Map Canvas */}
      <div className="map-canvas">
        <div className="map-placeholder">
          <p>Interactive Map View</p>
          <p>Lat: {myLocation?.latitude.toFixed(4)}, Lng: {myLocation?.longitude.toFixed(4)}</p>
        </div>

        {/* Friend markers */}
        {mapView === 'friends' && friendLocations.map(friend => (
          <div
            key={friend.userId}
            className="friend-marker"
            style={{
              left: `${50 + (friend.location.longitude - (myLocation?.longitude || 0)) * 1000}%`,
              top: `${50 - (friend.location.latitude - (myLocation?.latitude || 0)) * 1000}%`,
            }}
            onClick={() => handleFriendTap(friend)}
          >
            {friend.bitmojiUrl ? (
              <img src={friend.bitmojiUrl} alt={friend.username} className="bitmoji-marker" />
            ) : (
              <div className="marker-dot">{friend.username.charAt(0)}</div>
            )}
          </div>
        ))}

        {/* Place markers */}
        {mapView === 'places' && nearbyPlaces.map(place => (
          <div
            key={place.id}
            className="place-marker"
            onClick={() => handlePlaceTap(place)}
          >
            <span className="place-icon">📍</span>
          </div>
        ))}

        {/* My location marker */}
        <div className="my-location-marker">
          <div className="pulse-ring" />
          <div className="location-dot" />
        </div>
      </div>

      {/* Top controls */}
      <div className="map-controls-top">
        <button className="back-btn" onClick={() => window.location.hash = '/'}>✕</button>
        <div className="map-search">
          <input type="text" placeholder="Search places..." />
        </div>
        <button className="settings-btn">⚙️</button>
      </div>

      {/* View toggle */}
      <div className="map-view-toggle">
        <button className={mapView === 'friends' ? 'active' : ''} onClick={() => setMapView('friends')}>
          👥 Friends
        </button>
        <button className={mapView === 'heatmap' ? 'active' : ''} onClick={() => setMapView('heatmap')}>
          🔥 Heat Map
        </button>
        <button className={mapView === 'places' ? 'active' : ''} onClick={() => setMapView('places')}>
          📍 Places
        </button>
      </div>

      {/* Ghost mode toggle */}
      <div className="ghost-mode-toggle">
        <button className={`ghost-btn ${ghostMode ? 'active' : ''}`} onClick={handleToggleGhostMode}>
          👻 {ghostMode ? 'Ghost Mode On' : 'Ghost Mode Off'}
        </button>
      </div>

      {/* Friend detail card */}
      {selectedFriend && (
        <div className="friend-detail-card">
          <button className="close-card" onClick={() => setSelectedFriend(null)}>✕</button>
          <div className="friend-info">
            <div className="friend-avatar">{selectedFriend.username.charAt(0).toUpperCase()}</div>
            <div className="friend-details">
              <h3>{selectedFriend.username}</h3>
              <p>{selectedFriend.location.city || 'Unknown location'}</p>
              <p className="last-updated">Updated {formatTimeAgo(new Date(selectedFriend.lastUpdated))}</p>
            </div>
          </div>
          <div className="friend-actions">
            <button>Send Snap</button>
            <button>Message</button>
            <button>Directions</button>
          </div>
        </div>
      )}

      {/* Place detail card */}
      {selectedPlace && (
        <div className="place-detail-card">
          <button className="close-card" onClick={() => setSelectedPlace(null)}>✕</button>
          <img src={selectedPlace.photoUrl} alt={selectedPlace.name} className="place-photo" />
          <div className="place-info">
            <h3>{selectedPlace.name}</h3>
            <p>{selectedPlace.category} - {'$'.repeat(selectedPlace.priceLevel)}</p>
            <div className="place-rating">
              {'⭐'.repeat(Math.round(selectedPlace.rating))} {selectedPlace.rating.toFixed(1)}
              <span>({selectedPlace.reviewCount} reviews)</span>
            </div>
            <p className="place-status">{selectedPlace.isOpen ? '🟢 Open' : '🔴 Closed'}</p>
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="map-bottom-info">
        <span>{friendLocations.length} friends nearby</span>
        <span>{nearbyPlaces.length} places</span>
      </div>
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default MapPage;
