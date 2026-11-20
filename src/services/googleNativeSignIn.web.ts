/** Web build: the website signs in through googleWebSignIn.ts, never the native module. */
export async function signInWithGoogleNative(): Promise<string> {
  throw new Error("Native Google sign-in is not available on the web.");
}

export async function signOutGoogle(): Promise<void> {
  // Nothing to do: the website keeps no Google session of its own
}
