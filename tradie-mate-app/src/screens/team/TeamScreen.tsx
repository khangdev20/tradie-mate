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

interface TeamMember {
  memberId: string
  tradieId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: string
  firstName?: string
  lastName?: string
  phone?: string
  tradeType?: string
  avatarUrl?: string
  isActive?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
}

const TRADE_TYPE_LABELS: Record<string, string> = {
  PLUMBER: 'Plumber',
  ELECTRICIAN: 'Electrician',
  CARPENTER: 'Carpenter',
  HVAC: 'HVAC',
  PAINTER: 'Painter',
  TILER: 'Tiler',
  ROOFER: 'Roofer',
  OTHER: 'Tradie',
}

export function TeamScreen() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [inviteModal, setInviteModal] = useState(false)
  const [phone, setPhone] = useState('')
  const [inviting, setInviting] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get('/admin/members')
      setMembers(res.data?.data?.members ?? [])
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to load team members.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMembers()
  }, [fetchMembers])

  const sendInvite = useCallback(async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number.')
      return
    }
    try {
      setInviting(true)
      await api.post('/admin/members/invite', { phone: phone.trim() })
      Alert.alert('Invite Sent', `An SMS invite has been sent to ${phone}.`)
      setPhone('')
      setInviteModal(false)
      fetchMembers()
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to send invite.')
    } finally {
      setInviting(false)
    }
  }, [phone, fetchMembers])

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
        <Text style={styles.headerTitle}>Team</Text>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setInviteModal(true)}
        >
          <MaterialCommunityIcons name="account-plus" size={18} color={Colors.white} />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Member List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.memberId}
        contentContainerStyle={members.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={56} color={Colors.stoneLight} />
            <Text style={styles.emptyTitle}>No Team Members</Text>
            <Text style={styles.emptySubtitle}>
              Invite other tradies to join your team. Assign jobs and manage work together.
            </Text>
            <TouchableOpacity style={styles.emptyInviteButton} onPress={() => setInviteModal(true)}>
              <Text style={styles.emptyInviteText}>Invite Your First Team Member</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Team Member'
          const trade = item.tradeType ? TRADE_TYPE_LABELS[item.tradeType] || item.tradeType : 'Tradie'
          const roleLabel = ROLE_LABELS[item.role] || item.role
          const initials = fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

          return (
            <View style={styles.memberCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{fullName}</Text>
                <Text style={styles.memberTrade}>{trade}</Text>
                {item.phone && <Text style={styles.memberPhone}>{item.phone}</Text>}
              </View>
              <View style={styles.memberMeta}>
                <View style={[styles.roleBadge, item.role === 'OWNER' && styles.ownerBadge]}>
                  <Text style={[styles.roleText, item.role === 'OWNER' && styles.ownerText]}>
                    {roleLabel}
                  </Text>
                </View>
                {item.isActive === false && (
                  <View style={styles.inactiveDot} />
                )}
              </View>
            </View>
          )
        }}
      />

      {/* Invite Modal */}
      <Modal
        visible={inviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Invite Team Member</Text>
            <Text style={styles.modalSubtitle}>
              Enter the phone number of the tradie you'd like to invite. They'll receive an SMS.
            </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="+61 4XX XXX XXX"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setInviteModal(false); setPhone('') }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, (!phone.trim() || inviting) && styles.disabledButton]}
                onPress={sendInvite}
                disabled={!phone.trim() || inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.sendButtonText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
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
  emptyInviteButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.cta,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyInviteText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.elevated,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ctaPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cta,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  memberTrade: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  memberPhone: {
    fontSize: 12,
    color: Colors.textSubtle,
  },
  memberMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownerBadge: {
    backgroundColor: Colors.ctaPale,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  ownerText: {
    color: Colors.cta,
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
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
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  phoneInput: {
    height: 52,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  sendButton: {
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
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
})
