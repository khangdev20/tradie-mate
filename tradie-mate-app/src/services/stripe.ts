import { initStripe } from '@stripe/stripe-react-native'
import { AppConfig } from '../constants/config'

export async function initializeStripe() {
  const publishableKey = AppConfig.stripePublishableKey || 'pk_test_sample'
  
  await initStripe({
    publishableKey,
    merchantIdentifier: 'merchant.com.tradiemate', // Apple Pay / Tap to Pay
    urlScheme: 'tradiemate',
    setReturnUrlSchemeOnAndroid: true,
  })
}
