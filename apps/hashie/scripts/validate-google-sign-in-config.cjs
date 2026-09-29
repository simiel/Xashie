const requiredGoogleConfig = [
  'EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME',
];

const missing = requiredGoogleConfig.filter(name => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required native Google sign-in configuration: ${missing.join(', ')}`);
  process.exit(1);
}

const clientIdNames = requiredGoogleConfig.slice(0, 3);
const invalidClientIds = clientIdNames.filter(name => !/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(process.env[name]));
const expectedIosScheme = `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID.replace(/\.apps\.googleusercontent\.com$/, '')}`;

if (invalidClientIds.length > 0) {
  console.error(`Invalid Google OAuth client ID format: ${invalidClientIds.join(', ')}`);
  process.exit(1);
}

if (process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME !== expectedIosScheme) {
  console.error('EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME must be the reversed iOS Google client ID.');
  process.exit(1);
}

console.log('Native Google sign-in configuration is present.');
