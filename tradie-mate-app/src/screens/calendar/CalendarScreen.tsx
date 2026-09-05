import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Calendar } from 'react-native-calendars'
import { format } from 'date-fns'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing } from '../../constants/spacing'
import api from '../../services/apiService'
import { trackEvent } from '../../services/analytics'

export function CalendarScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const loadJobs = useCallback(async () => {
    try {
      const res = await api.get('/jobs') as any
      setJobs(res?.data?.jobs ?? res?.data ?? [])
    } catch {
      Alert.alert('Error', 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
    trackEvent('calendar_viewed')
  }, [loadJobs])

  const markedDates = jobs.reduce((acc: Record<string, any>, job) => {
    if (!job.scheduledAt) return acc
    const key = format(new Date(job.scheduledAt), 'yyyy-MM-dd')
    acc[key] = { marked: true, dotColor: Colors.cta }
    return acc
  }, {})

  if (markedDates[selectedDate]) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: Colors.cta }
  } else {
    markedDates[selectedDate] = { selected: true, selectedColor: Colors.cta }
  }

  const dayJobs = jobs.filter((j) => j.scheduledAt && format(new Date(j.scheduledAt), 'yyyy-MM-dd') === selectedDate)

  const rescheduleJob = async (jobId: string, newDate: string) => {
    const scheduledAt = new Date(`${newDate}T09:00:00`).toISOString()
    await api.patch(`/jobs/${jobId}/reschedule`, { scheduledAt })
    await loadJobs()
    trackEvent('job_rescheduled', { jobId })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.cta} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Schedule</Text>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          theme={{
            selectedDayBackgroundColor: Colors.cta,
            todayTextColor: Colors.cta,
            arrowColor: Colors.cta,
          }}
        />

        <Text style={styles.sectionTitle}>
          {format(new Date(selectedDate), 'EEEE d MMMM')}
        </Text>

        {dayJobs.length === 0 ? (
          <Text style={styles.empty}>No jobs scheduled</Text>
        ) : (
          dayJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: job.id } })}
              onLongPress={() =>
                Alert.alert('Reschedule', 'Move to tomorrow?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Tomorrow',
                    onPress: () => {
                      const tomorrow = new Date(selectedDate)
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      rescheduleJob(job.id, format(tomorrow, 'yyyy-MM-dd'))
                    },
                  },
                ])
              }
            >
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobMeta}>{job.status} · {job.address || 'No address'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: Typography.weights.semiBold, marginBottom: Spacing.md },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm, fontWeight: '600' },
  empty: { color: Colors.textMuted },
  jobCard: {
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  jobTitle: { fontWeight: '600', color: Colors.textPrimary },
  jobMeta: { color: Colors.textMuted, marginTop: 4, fontSize: 13 },
})
