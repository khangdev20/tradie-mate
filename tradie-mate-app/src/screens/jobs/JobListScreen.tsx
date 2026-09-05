import React, { useState, useEffect } from 'react'
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
import { FormField } from '../../components/ui/FormField'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { format, isToday, isTomorrow } from 'date-fns'
import api from '../../services/apiService'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { saveLocalJobs, getLocalJobs } from '../../offline/repositories/jobRepository'

const STATUS_FILTERS = ['ALL', 'UPCOMING', 'COMMUTING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export function JobListScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const { queue } = useOfflineQueue()

  const loadJobs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/jobs') as any
      if (res && res.success) {
        const remoteJobs = res.data.jobs || []
        setJobs(remoteJobs)
        await saveLocalJobs(remoteJobs.map((job: any) => ({
          id: job.id,
          title: job.title,
          status: job.status,
          description: job.description,
          address: job.address,
          customerName: job.customerName,
          scheduledAt: job.scheduledAt,
          photos: job.photos,
          notes: job.notes,
        })))
      }
    } catch (error) {
      console.warn('Failed to load jobs from API, using local cache:', error)
      const localJobs = await getLocalJobs()
      setJobs(localJobs)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadJobs()
  }

  // Check if a job has pending offline status updates
  const isJobUnsynced = (jobId: string) => {
    return queue.some((item) => item.action === 'UPDATE_STATUS' && item.payload.jobId === jobId)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success'
      case 'COMMUTING': return 'info'
      case 'IN_PROGRESS': return 'cta'
      case 'UPCOMING':
      case 'PENDING': return 'warning'
      case 'CANCELLED': return 'danger'
      default: return 'stone'
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesFilter =
      filter === 'ALL' ||
      job.status === filter ||
      (filter === 'UPCOMING' && job.status === 'PENDING')
    const matchesSearch = 
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      job.address.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Grouping jobs by Date
  const groupJobs = (jobList: any[]) => {
    const groups: { [key: string]: any[] } = {
      Today: [],
      Tomorrow: [],
      Upcoming: [],
    }

    jobList.forEach((job) => {
      const scheduledDate = new Date(job.scheduledAt)
      if (isToday(scheduledDate)) {
        groups.Today.push(job)
      } else if (isTomorrow(scheduledDate)) {
        groups.Tomorrow.push(job)
      } else {
        groups.Upcoming.push(job)
      }
    })

    return [
      { title: 'Today', data: groups.Today },
      { title: 'Tomorrow', data: groups.Tomorrow },
      { title: 'Upcoming', data: groups.Upcoming },
    ].filter((g) => g.data.length > 0)
  }

  const jobSections = groupJobs(filteredJobs)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('NewJob')}
        >
          <MaterialCommunityIcons name="plus" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <FormField
          label=""
          placeholder="Search client, job title, or address..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                {item.charAt(0) + item.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : jobSections.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description={search || filter !== 'ALL' ? "Try adjusting your search query or status filter." : "Get started by adding your first job today."}
          iconName="briefcase-outline"
          actionTitle={search || filter !== 'ALL' ? undefined : "Add First Job"}
          onActionPress={search || filter !== 'ALL' ? undefined : () => navigation.navigate('NewJob')}
        />
      ) : (
        <FlatList
          data={jobSections}
          keyExtractor={(item) => item.title}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />
          }
          renderItem={({ item: section }) => (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((job) => {
                const unsynced = isJobUnsynced(job.id)
                return (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobItem}
                    onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                  >
                    <View style={styles.jobTimeContainer}>
                      <Text style={styles.timeText}>
                        {format(new Date(job.scheduledAt), 'HH:mm')}
                      </Text>
                      {unsynced && (
                        <MaterialCommunityIcons 
                          name="alert-circle" 
                          size={14} 
                          color={Colors.warning} 
                          style={styles.unsyncedDot} 
                        />
                      )}
                    </View>
                    <View style={styles.jobDetails}>
                      <Text style={styles.jobItemTitle}>{job.title}</Text>
                      <Text style={styles.jobItemSubtitle}>
                        {job.customerName || 'No Name'} · {job.address}
                      </Text>
                    </View>
                    <StatusBadge label={job.status} variant={getStatusVariant(job.status)} showDot={true} />
                    <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textDisabled} />
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
          contentContainerStyle={styles.listContent}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterRow: {
    marginBottom: Spacing.md,
    height: 36,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.cta,
    borderColor: Colors.cta,
  },
  filterText: {
    fontSize: 13,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  jobTimeContainer: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  unsyncedDot: {
    marginLeft: 4,
  },
  jobDetails: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  jobItemTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  jobItemSubtitle: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
})
