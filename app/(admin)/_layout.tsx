import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0a7ea4',
        tabBarInactiveTintColor: '#687076',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarBadge: undefined,
        tabBarStyle: { 
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(0, 0, 0, 0.1)',
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarBadge: undefined,
        }}
      />
      <Tabs.Screen
        name="widget-preview"
        options={{
          title: 'iOS Widget Preview',
          tabBarBadge: undefined,
        }}
      />
    </Tabs>
  );
}
