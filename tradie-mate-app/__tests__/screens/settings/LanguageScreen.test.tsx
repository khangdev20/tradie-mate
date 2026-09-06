import React from 'react'
import ReactTestRenderer from 'react-test-renderer'
import { I18nextProvider } from 'react-i18next'
import { createI18nInstance } from '../../../src/i18n'
import { LanguageScreen } from '../../../src/screens/settings/LanguageScreen'
import { useLanguageStore } from '../../../src/store/language.store'

describe('LanguageScreen', () => {
  it('shows the language title and current option', async () => {
    useLanguageStore.getState().setLanguage('en-AU')
    const i18n = createI18nInstance()

    let renderer: ReactTestRenderer.ReactTestRenderer
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <I18nextProvider i18n={i18n}>
          <LanguageScreen navigation={{ goBack: jest.fn() } as any} />
        </I18nextProvider>,
      )
    })

    const textContent = JSON.stringify(renderer!.toJSON())

    expect(textContent).toContain('Language')
    expect(textContent).toContain('English (Australia)')
    expect(textContent).toContain('Chinese (Simplified)')

    await ReactTestRenderer.act(() => {
      renderer!.unmount()
    })
  })
})
