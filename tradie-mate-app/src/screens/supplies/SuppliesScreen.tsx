import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import api from '../../services/apiService'

interface Supplier {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  rating?: number
  openNow?: boolean
  types: string[]
  distanceMeters: number
  isTradeFocused: boolean
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export function SuppliesScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_currentLat, setCurrentLat] = useState<number | null>(null)
  const [_currentLng, setCurrentLng] = useState<number | null>(null)

  const fetchSuppliers = useCallback(async (lat: number, lng: number, query?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '5000',
        ...(query ? { query } : {}),
      })
      const res = await api.get(`/supplies/search?${params.toString()}`)
      setSuppliers(res.data?.data?.suppliers ?? [])
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to search for suppliers.')
    } finally {
      setLoading(false)
    }
  }, [])

  const getUserLocation = useCallback(async () => {
    setLocationLoading(true)
    setError(null)

    try {
      // React Native Geolocation
      const Geolocation = require('@react-native-community/geolocation').default
      Geolocation.getCurrentPosition(
        (pos: any) => {
          setCurrentLat(pos.coords.latitude)
          setCurrentLng(pos.coords.longitude)
          setLocationLoading(false)
          fetchSuppliers(pos.coords.latitude, pos.coords.longitude)
        },
        () => {
          setLocationLoading(false)
          setError('Location permission is required to find nearby supplies. Please enable in Settings.')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } catch {
      setLocationLoading(false)
      setError('Location services unavailable.')
    }
  }, [fetchSuppliers])

  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  const openMaps = useCallback((supplier: Supplier) => {
    const url = `https://maps.google.com/maps?q=${supplier.latitude},${supplier.longitude}`
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps application.')
    })
  }, [])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Supplies</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={getUserLocation}
          disabled={locationLoading || loading}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={locationLoading || loading ? Colors.textSubtle : Colors.cta}
          />
        </TouchableOpacity>
      </View>

      {/* Status */}
      {(locationLoading || loading) && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.cta} />
          <Text style={styles.loadingText}>
            {locationLoading ? 'Finding your location...' : 'Searching nearby suppliers...'}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={getUserLocation} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Supplier List */}
      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          suppliers.length === 0 && !loading && !locationLoading
            ? styles.emptyContainer
            : { paddingBottom: 20 }
        }
        ListEmptyComponent={
          !loading && !locationLoading && !error ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="store-search-outline" size={56} color={Colors.stoneLight} />
              <Text style={styles.emptyTitle}>No Suppliers Found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching in a different area or check location permissions.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.supplierCard}
            onPress={() => openMaps(item)}
            activeOpacity={0.75}
          >
            <View style={styles.supplierIconWrapper}>
              <MaterialCommunityIcons
                name={item.isTradeFocused ? 'tools' : 'store-outline'}
                size={24}
                color={item.isTradeFocused ? Colors.cta : Colors.textMuted}
              />
            </View>
            <View style={styles.supplierInfo}>
              <View style={styles.supplierNameRow}>
                <Text style={styles.supplierName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isTradeFocused && (
                  <View style={styles.tradeBadge}>
                    <Text style={styles.tradeBadgeText}>TRADE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.supplierAddress} numberOfLines={1}>
                {item.address}
              </Text>
              <View style={styles.supplierMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="map-marker-distance" size={12} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{formatDistance(item.distanceMeters)}</Text>
                </View>
                {item.rating && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
                  </View>
                )}
                {item.openNow !== null && item.openNow !== undefined && (
                  <View style={styles.metaItem}>
                    <View
                      style={[
                        styles.openDot,
                        { backgroundColor: item.openNow ? Colors.success : Colors.danger },
                      ]}
                    />
                    <Text style={[styles.metaText, { color: item.openNow ? Colors.success : Colors.danger }]}>
                      {item.openNow ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.stoneLight} />
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: Colors.elevated,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.infoPale,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.infoLight,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.info,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 14,
    backgroundColor: Colors.dangerPale,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.dangerLight,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.danger,
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.danger,
    minHeight: 32,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.elevated,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  supplierIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.ctaPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierInfo: {
    flex: 1,
    gap: 3,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tradeBadge: {
    backgroundColor: Colors.ctaPale,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tradeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.cta,
    letterSpacing: 0.5,
  },
  supplierAddress: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  supplierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})
