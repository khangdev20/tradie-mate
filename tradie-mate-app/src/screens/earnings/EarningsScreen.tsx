import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import api from '../../services/apiService'

type Period = 'week' | 'month' | 'year'

interface EarningsData {
  period: Period
  totalEarned: number
  jobsCount: number
  avgJobValue: number
  pendingPayout: number
  chartData: { label: string; amount: number }[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function EarningsScreen() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)

  const fetchStats = useCallback(async (p: Period) => {
    try {
      const res = await api.get(`/earnings/stats?period=${p}`)
      setData(res.data?.data)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to load earnings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStats(period)
  }, [period, fetchStats])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchStats(period)
  }, [period, fetchStats])

  const requestPayout = useCallback(async () => {
    Alert.alert(
      'Request Payout',
      `Request an instant payout of your available balance?\n\nInstant transfer fee may apply.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Payout',
          style: 'default',
          onPress: async () => {
            try {
              setPayoutLoading(true)
              const res = await api.post('/earnings/payouts')
              const payout = res.data?.data
              Alert.alert('Payout Requested', `${formatCents(payout.amount)} payout is processing.`)
              fetchStats(period)
            } catch (err: any) {
              Alert.alert('Payout Failed', err?.response?.data?.error?.message || 'Failed to request payout.')
            } finally {
              setPayoutLoading(false)
            }
          },
        },
      ]
    )
  }, [period, fetchStats])

  const PERIOD_LABELS: Record<Period, string> = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    )
  }

  const chartMax = data ? Math.max(...data.chartData.map((d) => d.amount), 1) : 1

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, period === p && styles.periodTabActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL EARNED</Text>
          <Text style={styles.statValue}>{formatCents(data?.totalEarned ?? 0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>JOBS COMPLETED</Text>
          <Text style={styles.statValue}>{data?.jobsCount ?? 0}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>AVG JOB VALUE</Text>
          <Text style={styles.statValue}>{formatCents(data?.avgJobValue ?? 0)}</Text>
        </View>
        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={[styles.statLabel, { color: Colors.warning }]}>PENDING PAYOUT</Text>
          <Text style={[styles.statValue, { color: Colors.warning }]}>
            {formatCents(data?.pendingPayout ?? 0)}
          </Text>
        </View>
      </View>

      {/* Bar Chart */}
      {data && data.chartData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Overview</Text>
          <View style={styles.chart}>
            {data.chartData.slice(0, 14).map((item, index) => {
              const heightPercent = chartMax > 0 ? (item.amount / chartMax) * 100 : 0
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${Math.max(heightPercent, 2)}%` as any },
                        item.amount === 0 && styles.barEmpty,
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Payout Button */}
      <View style={styles.payoutSection}>
        <TouchableOpacity
          style={[styles.payoutButton, payoutLoading && styles.payoutButtonDisabled]}
          onPress={requestPayout}
          disabled={payoutLoading}
          activeOpacity={0.85}
        >
          {payoutLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="bank-transfer-out" size={20} color={Colors.white} />
              <Text style={styles.payoutButtonText}>Request Early Payout</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.payoutHint}>Instant transfer. Fees may apply.</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.elevated,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.elevated,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: Colors.cta,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  periodTabTextActive: {
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 6,
  },
  pendingCard: {
    borderColor: Colors.warningLight,
    backgroundColor: Colors.warningPale,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.06,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chartCard: {
    margin: 16,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.cta,
    borderRadius: 3,
    minHeight: 4,
  },
  barEmpty: {
    backgroundColor: Colors.stoneLight,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  payoutSection: {
    margin: 16,
    gap: 8,
    alignItems: 'center',
  },
  payoutButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.cta,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payoutButtonDisabled: {
    opacity: 0.7,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  payoutHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
})
