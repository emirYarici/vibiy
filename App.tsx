import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/shared/queries/queryClient';
import AppContainer from './src/app/AppContainer';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppContainer />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

