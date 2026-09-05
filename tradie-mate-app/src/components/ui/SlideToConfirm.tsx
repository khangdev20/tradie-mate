import React, { useState } from 'react'
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Radius } from '../../constants/spacing'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface SlideToConfirmProps {
  onComplete: () => void
  text: string
}

export function SlideToConfirm({ onComplete, text }: SlideToConfirmProps) {
  const [width, setWidth] = useState(0)
  const pan = useRef(new Animated.Value(0)).current
  const handleSize = 50

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= width - handleSize) {
          pan.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= width - handleSize - 20) {
          Animated.timing(pan, {
            toValue: width - handleSize,
            duration: 200,
            useNativeDriver: false,
          }).start(() => onComplete())
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start()
        }
      },
    })
  ).current

  return (
    <View 
      style={styles.container} 
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.text}>{text}</Text>
      <Animated.View
        style={[styles.handle, { transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
      >
        <MaterialCommunityIcons name="chevron-right" size={32} color={Colors.white} />
      </Animated.View>
    </View>
  )
}

// Fixed missing useRef import and added it to the code
import { useRef } from 'react'

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 3,
  },
  text: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
  },
  handle: {
    position: 'absolute',
    left: 3,
    top: 3,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.cta,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
})
