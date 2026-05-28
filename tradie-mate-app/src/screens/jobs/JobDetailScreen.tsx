import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius, TouchTarget } from '../../constants/spacing'
import { JobStatusBadge } from '../../components/jobs/JobStatusBadge'
import { SlideToConfirm } from '../../components/ui/SlideToConfirm'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
// import Mapbox from '@rnmapbox/maps'

export function JobDetailScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Detail</Text>
        <JobStatusBadge status="UPCOMING" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Contact Bar */}
        <View style={styles.contactBar}>
          <TouchableOpacity 
            style={[styles.contactButton, styles.callButton]}
            onPress={() => Linking.openURL('tel:+61400000000')}
          >
            <MaterialCommunityIcons name="phone" size={20} color={Colors.white} />
            <Text style={styles.callButtonText}>Call John Smith</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.contactButton, styles.smsButton]}
            onPress={() => Linking.openURL('sms:+61400000000')}
          >
            <MaterialCommunityIcons name="message-text" size={20} color={Colors.cta} />
            <Text style={styles.smsButtonText}>SMS John Smith</Text>
          </TouchableOpacity>
        </View>

        {/* Map Snippet Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
             <MaterialCommunityIcons name="map-marker-radius" size={48} color={Colors.textDisabled} />
             <Text style={styles.mapPlaceholderText}>Map View</Text>
          </View>
          <View style={styles.mapOverlay}>
             <View style={styles.etaBadge}>
                <Text style={styles.etaText}>ETA 12 mins</Text>
             </View>
             <TouchableOpacity 
               style={styles.openMapsButton}
               onPress={() => Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=-33.8915,151.2503')}
             >
                <Text style={styles.openMapsText}>Open in Maps</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Add notes about the job..."
            placeholderTextColor={Colors.textDisabled}
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity>
              <Text style={styles.addPhotoLink}>+ Add Photo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoGrid}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.photoPlaceholder} />
            ))}
          </View>
        </View>

        {/* Slide to Start */}
        <View style={styles.footerAction}>
          <SlideToConfirm 
            text="Slide to Start Job" 
            onComplete={() => console.log('Job Started')} 
          />
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
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  contactBar: {
    marginBottom: Spacing.xl,
  },
  contactButton: {
    height: 50,
    borderRadius: Radius.element,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  callButton: {
    backgroundColor: Colors.success,
  },
  smsButton: {
    borderWidth: 1,
    borderColor: Colors.cta,
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  smsButtonText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  mapContainer: {
    height: 160,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    color: Colors.textDisabled,
    marginTop: Spacing.xs,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaBadge: {
    backgroundColor: Colors.cta,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  etaText: {
    color: Colors.white,
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
  },
  openMapsButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  openMapsText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  notesInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.element,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    height: 100,
    textAlignVertical: 'top',
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  addPhotoLink: {
    color: Colors.cta,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoPlaceholder: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.element,
    marginRight: '3%',
    marginBottom: 10,
  },
  footerAction: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
})
