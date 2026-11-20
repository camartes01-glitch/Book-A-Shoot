/**
 * Android / iOS "Continue with Google" - the same native Google Sign-In the Camartes app uses.
 * Returns a Google ID token whose audience is the web client ID; the backend verifies it
 * (POST /api/auth/google). The website uses googleWebSignIn.ts instead (see googleNativeSignIn.web.ts).
 */
import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { CamartesApiError } from "@/src/services/camartesClient";
import { GoogleSignInCancelledError, getGoogleIosClientId, getGoogleWebClientId } from "@/src/services/googleSignIn";

let configured = false;

function configure(): void {
  if (configured) return;
  const webClientId = getGoogleWebClientId();
  if (!webClientId) throw new CamartesApiError("Google sign-in is not configured.", 500);
  GoogleSignin.configure({ webClientId, iosClientId: getGoogleIosClientId() || undefined });
  configured = true;
}

export async function signInWithGoogleNative(): Promise<string> {
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker instead of silently reusing the last account
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (res.type !== "success") throw new GoogleSignInCancelledError();
    const idToken = res.data.idToken;
    if (!idToken) throw new CamartesApiError("Google did not return an ID token.", 401);
    return idToken;
  } catch (e) {
    if (e instanceof GoogleSignInCancelledError || e instanceof CamartesApiError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) throw new GoogleSignInCancelledError();
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new CamartesApiError("Google Play Services is not available on this device.", 400);
      }
      // DEVELOPER_ERROR (code 10): this build's signing SHA-1 is not on the Android OAuth client
    }
    throw new CamartesApiError("Could not sign in with Google. Please try again.", 401);
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    if (configured) await GoogleSignin.signOut();
  } catch {
    // Ignore: the backend session is what matters
  }
}
