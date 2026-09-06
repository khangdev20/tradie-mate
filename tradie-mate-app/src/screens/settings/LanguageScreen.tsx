import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { useLanguageStore } from '../../store/language.store'
import { SupportedLocale } from '../../i18n/locale'

const LANGUAGE_OPTIONS: Array<{
  value: SupportedLocale
  translationKey: string
}> = [
  { value: 'en-AU', translationKey: 'language.english' },
  { value: 'zh-Hans', translationKey: 'language.chineseSimplified' },
]

export function LanguageScreen({ navigation }: any) {
  const { t } = useTranslation('common')
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const resetLanguage = useLanguageStore((state) => state.resetLanguage)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
      </View>

      <View style={styles.content}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = language === option.value
          return (
            <TouchableOpacity
              key={option.value}
              style={styles.option}
              onPress={() => setLanguage(option.value)}
            >
              <Text style={styles.optionLabel}>{t(option.translationKey)}</Text>
              {isSelected && (
                <MaterialCommunityIcons name="check" size={20} color={Colors.cta} />
              )}
            </TouchableOpacity>
          )
        })}

        <TouchableOpacity style={styles.option} onPress={resetLanguage}>
          <Text style={styles.optionLabel}>{t('language.systemDefault')}</Text>
          <MaterialCommunityIcons name="cellphone" size={20} color={Colors.textMuted} />
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
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.element,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  optionLabel: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
})
