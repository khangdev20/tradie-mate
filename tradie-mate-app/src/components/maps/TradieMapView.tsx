import React from 'react'
import { View, StyleSheet, Text, Platform } from 'react-native'
import { Colors } from '../../constants/colors'
import { Radius } from '../../constants/spacing'
import { Typography } from '../../constants/typography'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Mapbox from '@rnmapbox/maps'
import { AppConfig } from '../../constants/config'

// Initialize Mapbox with access token
if (AppConfig.mapboxAccessToken) {
  Mapbox.setAccessToken(AppConfig.mapboxAccessToken)
}

interface TradieMapViewProps {
  tradieCoords?: { latitude: number; longitude: number } | null
  destinationCoords?: { latitude: number; longitude: number } | null
  polyline?: string | null
  etaMins?: number | null
  etaStatus?: 'LIVE' | 'STALE' | 'NO SIGNAL' | 'ROUTE UNAVAILABLE'
}

export function TradieMapView({
  tradieCoords,
  destinationCoords,
  polyline,
  etaMins,
  etaStatus = 'LIVE',
}: TradieMapViewProps) {
  
  // Convert Mapbox encoded polyline or simple coordinates to GeoJSON route line
  const getRouteGeoJSON = (): any => {
    if (!polyline) return null
    // Simple line string fallback
    if (tradieCoords && destinationCoords) {
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [tradieCoords.longitude, tradieCoords.latitude],
            [destinationCoords.longitude, destinationCoords.latitude],
          ],
        },
      }
    }
    return null
  }

  const routeGeoJSON = getRouteGeoJSON()

  // Simulators / Dev Fallback: If map fails or we are in mock mode, render a highly detailed map mock card.
  const isMockOrFailing = !AppConfig.mapboxAccessToken || Platform.OS === 'web'

  if (isMockOrFailing) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackHeader}>
          <MaterialCommunityIcons name="navigation" size={24} color={Colors.cta} />
          <Text style={styles.fallbackTitle}>SydneyCommute Routing Active</Text>
        </View>
        <View style={styles.fallbackContent}>
          <View style={styles.markerRow}>
            <MaterialCommunityIcons name="truck" size={20} color={Colors.cta} />
            <Text style={styles.coordinateText}>
              Tradie: {tradieCoords ? `${tradieCoords.latitude.toFixed(4)}, ${tradieCoords.longitude.toFixed(4)}` : 'Detecting...'}
            </Text>
          </View>
          <View style={styles.markerRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color={Colors.danger} />
            <Text style={styles.coordinateText}>
              Dest: {destinationCoords ? `${destinationCoords.latitude.toFixed(4)}, ${destinationCoords.longitude.toFixed(4)}` : 'Brisbane HQ'}
            </Text>
          </View>
        </View>
        
        {/* Route Line visual mockup */}
        <View style={styles.routeLineMock}>
          <View style={styles.dot} />
          <View style={styles.dashLine} />
          <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
        </View>

        <View style={styles.etaCard}>
          <View style={styles.etaBadge}>
            <Text style={styles.etaStatus}>{etaStatus}</Text>
          </View>
          <Text style={styles.etaTime}>
            {etaMins ? `${etaMins} mins` : 'Calculating ETA...'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.mapContainer}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Light}>
        {/* Camera fitting to route */}
        {tradieCoords && destinationCoords && (
          <Mapbox.Camera
            zoomLevel={12}
            centerCoordinate={[tradieCoords.longitude, tradieCoords.latitude]}
            animationDuration={1000}
          />
        )}

        {/* Destination Marker */}
        {destinationCoords && (
          <Mapbox.PointAnnotation
            id="destination"
            coordinate={[destinationCoords.longitude, destinationCoords.latitude]}
          >
            <View style={styles.destMarker}>
              <MaterialCommunityIcons name="map-marker" size={24} color={Colors.danger} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Tradie Location Marker */}
        {tradieCoords && (
          <Mapbox.PointAnnotation
            id="tradie"
            coordinate={[tradieCoords.longitude, tradieCoords.latitude]}
          >
            <View style={styles.truckMarker}>
              <MaterialCommunityIcons name="truck" size={20} color={Colors.white} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Route Polyline Layer */}
        {routeGeoJSON && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeLayer"
              style={{
                lineColor: Colors.info,
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* Floating ETA panel */}
      {etaMins !== null && (
        <View style={styles.etaPanel}>
          <View style={styles.etaPanelHeader}>
            <Text style={styles.etaPanelStatusText}>{etaStatus}</Text>
          </View>
          <Text style={styles.etaPanelTimeText}>{etaMins} min commute</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 200,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  map: {
    flex: 1,
  },
  destMarker: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  truckMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cta,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaPanel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaPanelHeader: {
    backgroundColor: Colors.cta,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  etaPanelStatusText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  etaPanelTimeText: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  // Fallback visual simulation styles
  fallbackContainer: {
    height: 200,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 16,
    justifyContent: 'space-between',
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  fallbackContent: {
    marginTop: 8,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coordinateText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
    marginLeft: 6,
  },
  routeLineMock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cta,
  },
  dashLine: {
    width: '60%',
    height: 2,
    borderWidth: 1,
    borderColor: Colors.info,
    borderStyle: 'dashed',
  },
  etaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaBadge: {
    backgroundColor: Colors.info,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  etaStatus: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  etaTime: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
})
