import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { COLORS, APP_NAME, APP_TAGLINE } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Simple Islamic pattern for splash
const SplashPattern = () => {
  const size = 50;
  const rows = Math.ceil(height / size) + 2;
  const cols = Math.ceil(width / size) + 2;
  
  const elements = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size + (row % 2 === 0 ? 0 : size / 2);
      const y = row * size;
      
      // Diamond shape
      elements.push(
        <Path
          key={`d-${row}-${col}`}
          d={`M ${x} ${y - size/3} L ${x + size/3} ${y} L ${x} ${y + size/3} L ${x - size/3} ${y} Z`}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={0.5}
          fill="none"
        />
      );
    }
  }
  
  return (
    <View style={patternStyles.container} pointerEvents="none">
      <Svg width={width} height={height} style={patternStyles.svg}>
        {elements}
      </Svg>
    </View>
  );
};

const patternStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default function SplashScreen() {
  const router = useRouter();
  const { initializeApp } = useAppStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('Init error:', error);
      }
      // Show splash for at least 2.5 seconds then navigate
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 2500);
    };
    init();
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.primaryBg, COLORS.secondaryBg, COLORS.primaryBg]}
      style={styles.container}
    >
      <SplashPattern />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="musical-notes" size={48} color={COLORS.accentGold} />
          </View>
        </View>
        
        <Text style={styles.title}>Dawoodi Bohra</Text>
        <Text style={styles.subtitle}>Instrumental</Text>
        
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.accentGold} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(201, 169, 97, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '300',
    color: COLORS.accentGold,
    letterSpacing: 6,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 24,
    fontStyle: 'italic',
  },
  loadingContainer: {
    marginTop: 48,
  },
});
