import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useAuthStore } from '../../store/auth.store'

const TRADES = [
  { id: 'PLUMBER', label: 'PLUMBER', icon: '🔧' },
  { id: 'ELECTRICIAN', label: 'ELECTRICIAN', icon: '⚡' },
  { id: 'CARPENTER', label: 'CARPENTER', icon: '🪚' },
  { id: 'HVAC', label: 'HVAC', icon: '❄️' },
  { id: 'PAINTER', label: 'PAINTER', icon: '🖌️' },
  { id: 'TILER', label: 'TILER', icon: '🔲' },
  { id: 'ROOFER', label: 'ROOFER', icon: '🏠' },
  { id: 'OTHER', label: 'OTHER', icon: '🔨' },
]

export const TradeTypeScreen = ({ navigation }: any) => {
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null)
  const { register, logout, isLoading } = useAuthStore()

  const handleContinue = () => {
    if (!selectedTrade) return
    navigation.navigate('ABN', { tradeType: selectedTrade })
  }

  const renderTradeItem = ({ item }: { item: typeof TRADES[0] }) => {
    const isSelected = selectedTrade === item.id
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => setSelectedTrade(item.id)}
      >
        <Text style={styles.cardIcon}>{item.icon}</Text>
        <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{item.label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headline}>What's your trade?</Text>
          <Text style={styles.subtext}>We'll personalise your experience</Text>
        </View>

        <FlatList
          data={TRADES}
          renderItem={renderTradeItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />

        <TouchableOpacity
          style={[styles.button, (!selectedTrade || isLoading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selectedTrade || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={logout}
        >
          <Text style={styles.skipText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
  grid: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    height: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  cardSelected: {
    borderColor: '#2E6B45',
    backgroundColor: '#F0F7F2',
    borderWidth: 2,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  cardLabelSelected: {
    color: '#2E6B45',
  },
  button: {
    height: 52,
    backgroundColor: '#2E6B45',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A5CBB3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
})
