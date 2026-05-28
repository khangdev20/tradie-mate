import appleAuth from '@invertase/react-native-apple-authentication'
import { Platform } from 'react-native'

export const isAppleAuthAvailable = Platform.OS === 'ios'

export async function signInWithApple(): Promise<{
  identityToken: string
  fullName: { givenName: string | null; familyName: string | null } | null
  email: string | null
}> {
  if (!isAppleAuthAvailable) {
    throw new Error('Apple Sign In is only available on iOS')
  }

  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [
      appleAuth.Scope.FULL_NAME,
      appleAuth.Scope.EMAIL,
    ],
  })

  if (!appleAuthRequestResponse.identityToken) {
    throw new Error('Apple Sign In failed: no identity token')
  }

  return {
    identityToken: appleAuthRequestResponse.identityToken,
    fullName:      appleAuthRequestResponse.fullName ?? null,
    email:         appleAuthRequestResponse.email ?? null,
    // Note: email + fullName only returned on FIRST sign in
  }
}
