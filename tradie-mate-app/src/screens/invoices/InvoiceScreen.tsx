import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { calculateGST, formatAUD } from '../../utils/gst'
import { AppButton } from '../../components/ui/AppButton'
import { FormField } from '../../components/ui/FormField'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import api from '../../services/apiService'
import { useNetworkState } from '../../hooks/useNetworkState'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { useHaptics } from '../../hooks/useHaptics'
import { saveOfflineInvoice } from '../../offline/repositories/invoiceRepository'

interface LineItem {
  id: string
  description: string
  qty: number
  priceCents: number
}

const QUICK_CHIPS = [
  { label: 'Labour 1hr', price: 9500 },
  { label: 'Tap washer', price: 800 },
  { label: 'Pipe fitting', price: 2200 },
  { label: 'Call-out Fee', price: 6500 },
]

export function InvoiceScreen({ route, navigation }: any) {
  const { jobId } = route.params || {}
  const { isConnected } = useNetworkState()
  const { addToQueue } = useOfflineQueue()
  const { triggerLight } = useHaptics()

  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Labour 1hr', qty: 1, priceCents: 9500 },
    { id: '2', description: 'Tap washer', qty: 2, priceCents: 800 },
  ])

  const [customDesc, setCustomDesc] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.qty, 0)
  const { gst, total } = calculateGST(subtotal)

  const adjustQty = (id: string, delta: number) => {
    triggerLight()
    setItems(prevItems =>
      prevItems
        .map(item => {
          if (item.id === id) {
            const nextQty = item.qty + delta
            return { ...item, qty: nextQty < 1 ? 1 : nextQty }
          }
          return item
        })
    )
  }

  const addItem = (label: string, price: number) => {
    triggerLight()
    // If chip already in items, increment qty
    const existing = items.find(item => item.description === label)
    if (existing) {
      adjustQty(existing.id, 1)
    } else {
      setItems([...items, { id: Math.random().toString(), description: label, qty: 1, priceCents: price }])
    }
  }

  const handleAddCustom = () => {
    if (!customDesc.trim() || !customPrice.trim()) return
    const priceFloat = parseFloat(customPrice)
    if (isNaN(priceFloat)) return
    
    const priceCents = Math.round(priceFloat * 100)
    setItems([...items, { id: Math.random().toString(), description: customDesc.trim(), qty: 1, priceCents }])
    
    setCustomDesc('')
    setCustomPrice('')
    setShowCustomForm(false)
  }

  const removeItem = (id: string) => {
    triggerLight()
    setItems(items.filter(item => item.id !== id))
  }

  const handleGenerateInvoice = async () => {
    if (items.length === 0) {
      Alert.alert('No items', 'Please add at least one line item to generate the invoice.')
      return
    }

    const invoicePayload = {
      jobId,
      items: items.map(item => ({
        description: item.description,
        quantity: item.qty,
        unitPriceCents: item.priceCents
      }))
    }

    // Offline Save
    if (!isConnected) {
      const saved = await saveOfflineInvoice({
        jobId,
        items: items.map((item) => ({
          description: item.description,
          qty: item.qty,
          unitPriceCents: item.priceCents,
        })),
      })
      addToQueue('CREATE_INVOICE', { ...invoicePayload, invoiceId: saved.localId })

      Alert.alert(
        'Offline Mode',
        'Invoice creation has been queued offline. Proceeding to client signature.',
        [
          {
            text: 'Capture Signature',
            onPress: () => navigation.navigate('Signature', { invoiceId: saved.localId, amountCents: saved.totalCents })
          }
        ]
      )
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/invoices', invoicePayload) as any
      if (res && res.success) {
        navigation.navigate('Signature', { invoiceId: res.data.id, amountCents: total })
      }
    } catch (error: any) {
      Alert.alert('Creation Failed', error.message || 'Unable to create invoice.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Builder</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.listContainer}>
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemSubtext}>
                    {formatAUD(item.priceCents)} each
                  </Text>
                </View>
                
                {/* Large quantity selector buttons */}
                <View style={styles.qtyContainer}>
                  <TouchableOpacity 
                    style={styles.qtyBtn} 
                    onPress={() => adjustQty(item.id, -1)}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity 
                    style={styles.qtyBtn} 
                    onPress={() => adjustQty(item.id, 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemTotal}>{formatAUD(item.priceCents * item.qty)}</Text>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteButton}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={
              showCustomForm ? (
                <View style={styles.customForm}>
                  <FormField
                    label="Description"
                    placeholder="e.g. Copper elbows"
                    value={customDesc}
                    onChangeText={setCustomDesc}
                  />
                  <FormField
                    label="Price ($)"
                    placeholder="e.g. 15.50"
                    value={customPrice}
                    onChangeText={customPrice => setCustomPrice(customPrice)}
                    keyboardType="numeric"
                  />
                  <View style={styles.customFormActions}>
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: Colors.surface }]}
                      onPress={() => setShowCustomForm(false)}
                    >
                      <Text style={styles.smallBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: Colors.cta }]}
                      onPress={handleAddCustom}
                    >
                      <Text style={[styles.smallBtnText, { color: Colors.white }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addItemButton}
                  onPress={() => setShowCustomForm(true)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={Colors.cta} />
                  <Text style={styles.addItemText}>Add Custom Line Item</Text>
                </TouchableOpacity>
              )
            }
          />
        </View>

        {/* Reusable Item Chips */}
        <View style={styles.chipsRow}>
          <Text style={styles.sectionHeading}>Materials & Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChips}>
            {QUICK_CHIPS.map((chip, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.chip}
                onPress={() => addItem(chip.label, chip.price)}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Invoice Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatAUD(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.gstRow}>
              <Text style={styles.summaryLabel}>GST (10%)</Text>
              <View style={styles.gstBadge}>
                <Text style={styles.gstBadgeText}>GST FREE FOR APPRENTICES?</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatAUD(gst)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatAUD(total)}</Text>
          </View>
        </View>

        <AppButton 
          title={`Generate Invoice · ${formatAUD(total)}`}
          onPress={handleGenerateInvoice}
          variant="primary"
          size="large"
          loading={loading}
        />
      </View>
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
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  headerTitle: {
    marginLeft: Spacing.md,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  listContainer: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.element,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  itemSubtext: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.element,
    marginRight: Spacing.md,
  },
  qtyBtn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  qtyText: {
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  itemTotal: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginRight: Spacing.md,
    minWidth: 60,
    textAlign: 'right',
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  addItemText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  customForm: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.element,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  customFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  smallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.element,
    marginLeft: Spacing.sm,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    marginVertical: Spacing.md,
  },
  scrollChips: {
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: Colors.ctaPale,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    marginRight: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.ctaLight,
  },
  chipText: {
    color: Colors.cta,
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
  },
  summaryContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gstBadge: {
    backgroundColor: Colors.warningPale,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginLeft: Spacing.xs,
  },
  gstBadgeText: {
    fontSize: 8,
    color: Colors.warning,
    fontWeight: 'bold',
  },
  totalRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: Typography.sizes.heading,
    fontWeight: 'bold',
    color: Colors.cta,
  },
})
