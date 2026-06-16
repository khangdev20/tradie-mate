import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import api from '../../services/apiService'

interface Review {
  id: string
  rating: number
  title?: string
  body: string
  jobType?: string
  replyBody?: string
  repliedAt?: string
  createdAt: string
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? Colors.warning : Colors.stoneLight}
        />
      ))}
    </View>
  )
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [replyModal, setReplyModal] = useState<{ visible: boolean; reviewId: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get('/reviews')
      setReviews(res.data?.data?.reviews ?? [])
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to load reviews.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchReviews()
  }, [fetchReviews])

  const submitReply = useCallback(async () => {
    if (!replyModal?.reviewId || !replyText.trim()) return
    try {
      setReplying(true)
      await api.patch(`/reviews/${replyModal.reviewId}/reply`, { responseText: replyText.trim() })
      setReviews((prev) =>
        prev.map((r) =>
          r.id === replyModal.reviewId
            ? { ...r, replyBody: replyText.trim(), repliedAt: new Date().toISOString() }
            : r
        )
      )
      setReplyModal(null)
      setReplyText('')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to submit reply.')
    } finally {
      setReplying(false)
    }
  }, [replyModal, replyText])

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reviews</Text>
        {reviews.length > 0 && (
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="star" size={14} color={Colors.warning} />
            <Text style={styles.ratingBadgeText}>{avgRating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      {reviews.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.avgRating}>{avgRating.toFixed(1)}</Text>
            <StarRating rating={Math.round(avgRating)} size={20} />
            <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
          </View>
          <View style={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
              return (
                <View key={star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{star}</Text>
                  <View style={styles.ratingBarTrack}>
                    <View style={[styles.ratingBarFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Reviews List */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={reviews.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="star-off-outline" size={56} color={Colors.stoneLight} />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              Reviews appear here after customers rate completed jobs.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <StarRating rating={item.rating} />
              <Text style={styles.reviewDate}>{getRelativeTime(item.createdAt)}</Text>
            </View>
            {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
            <Text style={styles.reviewBody}>{item.body}</Text>
            {item.jobType && (
              <View style={styles.jobTypeBadge}>
                <Text style={styles.jobTypeText}>{item.jobType}</Text>
              </View>
            )}

            {/* Reply */}
            {item.replyBody ? (
              <View style={styles.replyContainer}>
                <View style={styles.replyHeader}>
                  <MaterialCommunityIcons name="reply" size={14} color={Colors.cta} />
                  <Text style={styles.replyLabel}>Your Reply</Text>
                </View>
                <Text style={styles.replyText}>{item.replyBody}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.replyButton}
                onPress={() => {
                  setReplyModal({ visible: true, reviewId: item.id })
                  setReplyText('')
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="reply-outline" size={16} color={Colors.cta} />
                <Text style={styles.replyButtonText}>Reply to Review</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Reply Modal */}
      {replyModal && (
        <Modal
          visible={replyModal.visible}
          transparent
          animationType="slide"
          onRequestClose={() => setReplyModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Reply to Review</Text>
              <TextInput
                style={styles.replyInput}
                placeholder="Thank you for your feedback..."
                placeholderTextColor={Colors.textSubtle}
                multiline
                numberOfLines={4}
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setReplyModal(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmit, (!replyText.trim() || replying) && styles.disabledButton]}
                  onPress={submitReply}
                  disabled={!replyText.trim() || replying}
                >
                  {replying ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.modalSubmitText}>Post Reply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  summaryCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 16,
  },
  summaryLeft: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  avgRating: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ratingBars: {
    flex: 1,
    gap: 6,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBarLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    width: 12,
    textAlign: 'right',
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 11,
    color: Colors.textMuted,
    width: 16,
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
  reviewCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textSubtle,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewBody: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  jobTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.ctaPale,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  jobTypeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.cta,
  },
  replyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.cta,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.cta,
  },
  replyText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  replyButtonText: {
    fontSize: 13,
    color: Colors.cta,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  replyInput: {
    height: 100,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    height: 48,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  modalSubmit: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.cta,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
})
