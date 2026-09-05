import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing } from '../../constants/spacing'
import { JobStatusBadge, JobStatus } from './JobStatusBadge'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface JobListItemProps {
  id: string
  title: string
  customer: string
  suburb: string
  time: string
  status: JobStatus
  onPress: () => void
}

export const JOB_ITEM_HEIGHT = 80

export const JobListItem = React.memo(({
  title,
  customer,
  suburb,
  time,
  status,
  onPress,
}: JobListItemProps) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.subtitleText}>{customer} · {suburb}</Text>
      </View>
      <View style={styles.statusContainer}>
        <JobStatusBadge status={status} />
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textDisabled} />
      </View>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  container: {
    height: JOB_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timeContainer: {
    width: 60,
  },
  timeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  detailsContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  subtitleText: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
