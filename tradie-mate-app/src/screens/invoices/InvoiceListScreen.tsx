import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import api from '../../services/apiService'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE'
  totalCents: number
  subtotalCents: number
  gstCents: number
  jobId: string | null
  createdAt: string
  dueAt: string | null
  paidAt: string | null
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'stone' | 'cta'> = {
  PAID: 'success',
  SENT: 'info',
  DRAFT: 'stone',
  OVERDUE: 'danger',
  VOID: 'stone',
}

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function InvoiceListScreen({ navigation }: any) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/invoices') as any
      if (res && res.success) {
        setInvoices(res.data.invoices || [])
      }
    } catch (err) {
      console.warn('Failed to load invoices:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const onRefresh = () => {
    setRefreshing(true)
    loadInvoices()
  }

  const handlePressInvoice = (invoice: Invoice) => {
    if (invoice.jobId) {
      navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })
    }
  }

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePressInvoice(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
        <Text style={styles.dateText}>
          {format(new Date(item.createdAt), 'd MMM yyyy')}
        </Text>
        {item.dueAt && item.status !== 'PAID' && (
          <Text style={styles.dueText}>
            Due {format(new Date(item.dueAt), 'd MMM yyyy')}
          </Text>
        )}
        {item.paidAt && (
          <Text style={styles.paidText}>
            Paid {format(new Date(item.paidAt), 'd MMM yyyy')}
          </Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.amount}>{formatAUD(item.totalCents)}</Text>
        <StatusBadge
          label={item.status}
          variant={STATUS_VARIANTS[item.status] ?? 'stone'}
          showDot={false}
        />
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textDisabled} style={styles.chevron} />
    </TouchableOpacity>
  )

  const totalPaid = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.totalCents, 0)

  const totalPending = invoices
    .filter(inv => inv.status === 'SENT' || inv.status === 'DRAFT')
    .reduce((sum, inv) => sum + inv.totalCents, 0)

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoices</Text>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{formatAUD(totalPaid)}</Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, totalPending > 0 && styles.pendingColor]}>
            {formatAUD(totalPending)}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{invoices.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={item => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="file-document-outline"
              title="No invoices yet"
              description="Create your first invoice after completing a job."
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 0.5,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  pendingColor: {
    color: Colors.warning,
  },
  summaryLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: Typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
    marginBottom: 2,
  },
  dateText: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
  },
  dueText: {
    fontSize: Typography.sizes.micro,
    color: Colors.warning,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  paidText: {
    fontSize: Typography.sizes.micro,
    color: Colors.success,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.xs,
    gap: 6,
  },
  amount: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  chevron: {
    marginLeft: 4,
  },
})
