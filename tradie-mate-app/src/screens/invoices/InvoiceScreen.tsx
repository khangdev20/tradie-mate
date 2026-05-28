import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { calculateGST, formatAUD } from '../../utils/gst'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

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
]

export function InvoiceScreen() {
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Labour 1hr', qty: 1, priceCents: 9500 },
    { id: '2', description: 'Tap washer', qty: 2, priceCents: 800 },
  ])

  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.qty, 0)
  const { gst, total } = calculateGST(subtotal)

  const addItem = (label: string, price: number) => {
    setItems([...items, { id: Math.random().toString(), description: label, qty: 1, priceCents: price }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice · Kitchen Sink</Text>
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
                    {item.qty} × {formatAUD(item.priceCents)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatAUD(item.priceCents * item.qty)}</Text>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteButton}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={
              <TouchableOpacity style={styles.addItemButton}>
                <MaterialCommunityIcons name="plus" size={20} color={Colors.cta} />
                <Text style={styles.addItemText}>Add Custom Item</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={styles.chipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatAUD(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.gstRow}>
              <Text style={styles.summaryLabel}>GST (10%)</Text>
              <View style={styles.gstBadge}>
                <Text style={styles.gstBadgeText}>AU LAW</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatAUD(gst)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatAUD(total)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.payButton}>
          <Text style={styles.payButtonText}>Collect {formatAUD(total)} · Tap to Pay</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  itemTotal: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginRight: Spacing.md,
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
  chipsRow: {
    marginVertical: Spacing.lg,
  },
  chip: {
    backgroundColor: Colors.ctaPale,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    marginRight: Spacing.sm,
    borderWidth: 1,
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
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
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
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
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
    borderTopWidth: 1,
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
  payButton: {
    height: 56,
    backgroundColor: Colors.cta,
    borderRadius: Radius.element,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
  },
})
