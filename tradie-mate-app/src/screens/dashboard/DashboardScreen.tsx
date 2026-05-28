import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius, TouchTarget } from '../../constants/spacing'
import { SyncIndicator } from '../../components/shared/SyncIndicator'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { format } from 'date-fns'

export function DashboardScreen() {
  const today = new Date()
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Tradie</Text>
            <Text style={styles.date}>{format(today, 'EEEE, d MMMM')}</Text>
          </View>
          <SyncIndicator status="online" />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Jobs Today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>$1,240</Text>
            <Text style={styles.statLabel}>Est. Revenue</Text>
          </View>
        </View>

        {/* Next Job Card */}
        <View style={styles.nextJobCard}>
          <View style={styles.accentBar} />
          <View style={styles.cardContent}>
            <Text style={styles.microLabel}>NEXT JOB · 08:30</Text>
            <Text style={styles.jobTitle}>Kitchen Sink Repair</Text>
            <Text style={styles.customerName}>John Smith · Bondi Junction</Text>
            
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.outlineButton]}
                onPress={() => Linking.openURL('tel:+61400000000')}
              >
                <MaterialCommunityIcons name="phone" size={20} color={Colors.cta} />
                <Text style={styles.outlineButtonText}>Call</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.filledButton]}
                onPress={() => Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=-33.8915,151.2503')}
              >
                <MaterialCommunityIcons name="navigation" size={20} color={Colors.white} />
                <Text style={styles.filledButtonText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Later Jobs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Later Today</Text>
        </View>
        
        {[1, 2].map((i) => (
          <TouchableOpacity key={i} style={styles.laterJobItem}>
            <View style={styles.laterJobTime}>
              <Text style={styles.timeText}>{i === 1 ? '11:00' : '14:30'}</Text>
            </View>
            <View style={styles.laterJobDetails}>
              <Text style={styles.laterJobTitle}>Fixing Leaky Tap</Text>
              <Text style={styles.laterJobSubtitle}>Sarah Wilson · Randwick</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textDisabled} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAB Row */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={styles.fab}>
          <MaterialCommunityIcons name="plus" size={24} color={Colors.white} />
          <Text style={styles.fabText}>New Job</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabSecondary]}>
          <MaterialCommunityIcons name="camera" size={24} color={Colors.cta} />
          <Text style={[styles.fabText, styles.fabTextSecondary]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabSecondary]}>
          <MaterialCommunityIcons name="wifi-off" size={24} color={Colors.cta} />
          <Text style={[styles.fabText, styles.fabTextSecondary]}>Offline</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
  },
  greeting: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  date: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.card,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  nextJobCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  accentBar: {
    width: 4,
    backgroundColor: Colors.success,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  microLabel: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
    color: Colors.cta,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  jobTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerName: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    height: TouchTarget.min,
    borderRadius: Radius.element,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.cta,
  },
  filledButton: {
    backgroundColor: Colors.cta,
  },
  outlineButtonText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  filledButtonText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  laterJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.8,
  },
  laterJobTime: {
    width: 50,
  },
  timeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  laterJobDetails: {
    flex: 1,
  },
  laterJobTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  laterJobSubtitle: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fabRow: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fab: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.cta,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fabText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
    fontSize: Typography.sizes.micro,
  },
  fabTextSecondary: {
    color: Colors.cta,
  },
})
