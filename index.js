/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
if (__DEV__) {
  require("./ReactotronConfig");
}
try {
  const messaging = getMessaging();
  // Register background handler
  setBackgroundMessageHandler(messaging, async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });
} catch (err) {
  console.warn('[Firebase] Background messaging registration skipped (missing configuration).');
}

AppRegistry.registerComponent(appName, () => App);
