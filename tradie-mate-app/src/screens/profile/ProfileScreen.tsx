import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { useEntitlements } from '../../hooks/useEntitlements'
import { useAuthStore } from '../../store/auth.store'
import api from '../../services/apiService'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { format } from 'date-fns'

interface BillingPlan {
  code: string
  displayName: string
  priceCents: number
  currency: string
  billingInterval: string
  features: string[]
}

export function ProfileScreen() {
  const { subscription, loading, refresh, getEntitlement } = useEntitlements()
  const { logout } = useAuthStore()

  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadPlans = async () => {
    try {
      setPlansLoading(true)
      const res = await api.get('/billing/plans') as any
      if (res && res.success) {
        setPlans(res.data.plans || [])
      }
    } catch (err) {
      console.warn('Failed to load plans:', err)
      // Provide fallback plans if API fails
      setPlans([
        {
          code: 'SOLO_STARTER',
          displayName: 'Solo Starter',
          priceCents: 2900,
          currency: 'AUD',
          billingInterval: 'MONTH',
          features: ['10 jobs/mo', '5 invoices/mo', 'Offline Sync']
        },
        {
          code: 'SOLO_PRO',
          displayName: 'Solo Pro',
          priceCents: 4900,
          currency: 'AUD',
          billingInterval: 'MONTH',
          features: ['50 jobs/mo', '50 invoices/mo', 'Tap to Pay', 'Client tracking']
        },
        {
          code: 'TEAM',
          displayName: 'Team Growth',
          priceCents: 9900,
          currency: 'AUD',
          billingInterval: 'MONTH',
          features: ['Unlimited jobs', 'Unlimited invoices', 'Staff seats', 'Xero Sync']
        }
      ])
    } finally {
      setPlansLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const handleUpgrade = async (planCode: string) => {
    try {
      setActionLoading(true)
      const res = await api.post('/billing/checkout-session', {
        planCode,
        successUrl: 'tradiemate://billing/success',
        cancelUrl: 'tradiemate://billing/cancel'
      }) as any
      
      if (res && res.success && res.data.checkoutUrl) {
        Linking.openURL(res.data.checkoutUrl)
      } else {
        throw new Error('Checkout URL not found')
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Unable to open Stripe checkout.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      setActionLoading(true)
      const res = await api.post('/billing/portal-session', {
        returnUrl: 'tradiemate://billing/portal',
      }) as any
      if (res && res.success && res.data.portalUrl) {
        Linking.openURL(res.data.portalUrl)
      } else {
        throw new Error('Portal URL not found')
      }
    } catch (err: any) {
      Alert.alert('Portal Failed', err.message || 'Unable to open Stripe portal.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatAUD = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success'
      case 'TRIALING': return 'info'
      case 'PAST_DUE': return 'warning'
      case 'CANCELED': return 'danger'
      default: return 'stone'
    }
  }

  // Calculate Limits usage percentages
  const maxJobs = getEntitlement('maxJobsPerMonth')
  const maxInvoices = getEntitlement('maxInvoicesPerMonth')
  const currentJobs = subscription?.usage.jobsCreated ?? 0
  const currentInvoices = subscription?.usage.invoicesCreated ?? 0

  const jobsPct = maxJobs > 0 ? Math.min(100, (currentJobs / maxJobs) * 100) : 0
  const invoicesPct = maxInvoices > 0 ? Math.min(100, (currentInvoices / maxInvoices) * 100) : 0

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Plan</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Subscription Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.cardTitle}>Current Plan</Text>
              <Text style={styles.planName}>
                {subscription ? subscription.planCode.replace('_', ' ') : 'SOLO STARTER'}
              </Text>
            </View>
            <StatusBadge 
              label={subscription ? subscription.status : 'TRIALING'} 
              variant={getStatusVariant(subscription ? subscription.status : 'TRIALING')} 
              showDot={false} 
            />
          </View>
          
          {subscription?.currentPeriodEnd && (
            <Text style={styles.expiryText}>
              Period ends: {format(new Date(subscription.currentPeriodEnd), 'dd MMMM yyyy')}
            </Text>
          )}

          {subscription && (
            <TouchableOpacity 
              style={styles.portalBtn} 
              onPress={handleManageBilling}
              disabled={actionLoading}
            >
              <MaterialCommunityIcons name="cog" size={16} color={Colors.cta} />
              <Text style={styles.portalBtnText}>Manage Invoice & Billing</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Plan usage progress limits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Limits</Text>
          
          {/* Jobs limits progress */}
          <View style={styles.usageRow}>
            <View style={styles.usageLabels}>
              <Text style={styles.usageName}>Jobs Scheduled</Text>
              <Text style={styles.usageCount}>{currentJobs} / {maxJobs}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${jobsPct}%`, backgroundColor: jobsPct >= 90 ? Colors.danger : Colors.cta }]} />
            </View>
          </View>

          {/* Invoices limits progress */}
          <View style={styles.usageRow}>
            <View style={styles.usageLabels}>
              <Text style={styles.usageName}>Invoices Created</Text>
              <Text style={styles.usageCount}>{currentInvoices} / {maxInvoices}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${invoicesPct}%`, backgroundColor: invoicesPct >= 90 ? Colors.danger : Colors.cta }]} />
            </View>
          </View>
        </View>

        {/* Upgrade / Paywall Grid list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upgrade Plan</Text>
          {plansLoading ? (
            <ActivityIndicator size="small" color={Colors.cta} style={{ marginTop: Spacing.md }} />
          ) : (
            plans.map((plan) => {
              const isCurrent = subscription?.planCode === plan.code
              return (
                <View key={plan.code} style={[styles.planCard, isCurrent && styles.activePlanCard]}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planTitleText}>{plan.displayName}</Text>
                    <Text style={styles.planPrice}>{formatAUD(plan.priceCents)} / mo</Text>
                  </View>
                  
                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <MaterialCommunityIcons name="check" size={14} color={Colors.success} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <AppButton
                    title={isCurrent ? 'Current Plan' : 'Subscribe'}
                    onPress={() => handleUpgrade(plan.code)}
                    variant={isCurrent ? 'secondary' : 'primary'}
                    disabled={isCurrent || actionLoading}
                    style={styles.planBtn}
                  />
                </View>
              )
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  logoutBtn: {
    padding: Spacing.xs,
  },
  logoutText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: Typography.weights.medium,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  expiryText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  portalBtnText: {
    fontSize: 13,
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: 6,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  usageRow: {
    marginBottom: Spacing.md,
  },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usageName: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
  usageCount: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  activePlanCard: {
    borderColor: Colors.cta,
    borderWidth: 1.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.cta,
  },
  planFeatures: {
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  planBtn: {
    height: 44,
  },
})
