import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { AppError } from '../../utils/errors'

// Known AU trade suppliers for fallback matching
const TRADE_SUPPLIER_KEYWORDS = [
  'bunnings',
  'plumbing plus',
  'reece plumbing',
  'tradelink',
  'electrical',
  'hardware',
  'trade supplies',
  'total tools',
  'sydney tools',
  'mitre 10',
  'home hardware',
]

export async function suppliesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  /**
   * GET /api/v1/supplies/search
   * Module 3.6 — Find nearby trade suppliers using Google Places API.
   *
   * Query params:
   *   - lat: latitude
   *   - lng: longitude
   *   - radius: search radius in meters (default 5000)
   *   - query: optional keyword (e.g. "plumbing supplies")
   *   - tradeType: optional trade type filter
   */
  fastify.get<{
    Querystring: {
      lat: string
      lng: string
      radius?: string
      query?: string
      tradeType?: string
    }
  }>('/search', async (request) => {
    const { lat, lng, radius = '5000', query, tradeType } = request.query

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError('Valid lat and lng coordinates are required.', 400, 'INVALID_COORDINATES')
    }

    // Build search keyword based on tradeType
    const tradeKeyword = buildTradeKeyword(tradeType, query)
    const searchRadius = Math.min(parseInt(radius, 10) || 5000, 50000)

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.MAPBOX_SECRET_TOKEN

    if (!apiKey) {
      // Return mock data for development
      return {
        success: true,
        data: {
          suppliers: getMockSuppliers(latitude, longitude),
          source: 'mock',
        },
      }
    }

    try {
      const suppliers = await searchGooglePlaces(latitude, longitude, searchRadius, tradeKeyword, apiKey)
      return {
        success: true,
        data: { suppliers, source: 'google_places' },
      }
    } catch (err: any) {
      fastify.log.error({ err }, 'Google Places search failed')
      // Graceful fallback to mock data
      return {
        success: true,
        data: {
          suppliers: getMockSuppliers(latitude, longitude),
          source: 'fallback',
        },
      }
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTradeKeyword(tradeType?: string, query?: string): string {
  if (query) return query

  const typeMap: Record<string, string> = {
    PLUMBER: 'plumbing supplies hardware',
    ELECTRICIAN: 'electrical supplies trade',
    CARPENTER: 'timber hardware building supplies',
    HVAC: 'HVAC refrigeration supplies',
    PAINTER: 'paint supplies hardware',
    TILER: 'tile supplies tools',
    ROOFER: 'roofing supplies hardware',
    OTHER: 'trade supplies hardware',
  }

  return typeMap[tradeType?.toUpperCase() ?? ''] || 'trade supplies hardware bunnings'
}

async function searchGooglePlaces(
  lat: number,
  lng: number,
  radius: number,
  keyword: string,
  apiKey: string
): Promise<any[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('keyword', keyword)
  url.searchParams.set('type', 'store')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Google Places API returned ${response.status}`)
  }

  const data = await response.json() as any
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  return (data.results || []).map((place: any) => ({
    id: place.place_id,
    name: place.name,
    address: place.vicinity,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    rating: place.rating,
    openNow: place.opening_hours?.open_now ?? null,
    types: place.types,
    distanceMeters: calculateDistance(lat, lng, place.geometry?.location?.lat, place.geometry?.location?.lng),
    isTradeFocused: TRADE_SUPPLIER_KEYWORDS.some((kw) =>
      place.name?.toLowerCase().includes(kw)
    ),
  }))
    .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters)
    .slice(0, 20)
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

function getMockSuppliers(lat: number, lng: number): any[] {
  return [
    {
      id: 'mock-bunnings-1',
      name: 'Bunnings Warehouse',
      address: 'Nearby Trade Supplies',
      latitude: lat + 0.005,
      longitude: lng + 0.003,
      rating: 4.2,
      openNow: true,
      types: ['hardware_store', 'home_goods_store'],
      distanceMeters: 620,
      isTradeFocused: true,
    },
    {
      id: 'mock-reece-1',
      name: 'Reece Plumbing',
      address: 'Local Trade Branch',
      latitude: lat - 0.008,
      longitude: lng + 0.006,
      rating: 4.5,
      openNow: true,
      types: ['store'],
      distanceMeters: 1050,
      isTradeFocused: true,
    },
  ]
}
