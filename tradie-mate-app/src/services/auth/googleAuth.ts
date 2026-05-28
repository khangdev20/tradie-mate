import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin'
import Config from 'react-native-config'

// Call once in App.tsx on mount
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: Config.GOOGLE_WEB_CLIENT_ID, // from Google Console
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID, // iOS specific
    offlineAccess: false,
  })
}

export async function signInWithGoogle(): Promise<{
  idToken: string
  user: { name: string | null; email: string | null; photo: string | null }
}> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

  const userInfo = await GoogleSignin.signIn()

  if (!userInfo.data?.idToken) {
    throw new Error('Google Sign In failed: no ID token')
  }

  return {
    idToken: userInfo.data.idToken,
    user: {
      name:  userInfo.data.user.name ?? null,
      email: userInfo.data.user.email ?? null,
      photo: userInfo.data.user.photo ?? null,
    },
  }
}

export async function signOutGoogle() {
  try { await GoogleSignin.signOut() } catch {}
}
