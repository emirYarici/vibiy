import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppContainer from './src/app/AppContainer';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContainer />
    </GestureHandlerRootView>
  );
}

