import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G, Defs, Pattern, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Islamic geometric pattern - Hexagram tessellation
const IslamicPattern = ({ opacity = 0.08 }: { opacity?: number }) => {
  const patternSize = 60;
  
  // Create a hexagram (six-pointed star) path
  const createHexagram = (cx: number, cy: number, size: number) => {
    const r = size / 2;
    const r30 = r * Math.cos(Math.PI / 6);
    const r60 = r * Math.sin(Math.PI / 6);
    
    // First triangle (pointing up)
    const t1 = [
      [cx, cy - r],
      [cx + r30, cy + r60],
      [cx - r30, cy + r60],
    ];
    
    // Second triangle (pointing down)
    const t2 = [
      [cx, cy + r],
      [cx + r30, cy - r60],
      [cx - r30, cy - r60],
    ];
    
    const path1 = `M ${t1[0][0]} ${t1[0][1]} L ${t1[1][0]} ${t1[1][1]} L ${t1[2][0]} ${t1[2][1]} Z`;
    const path2 = `M ${t2[0][0]} ${t2[0][1]} L ${t2[1][0]} ${t2[1][1]} L ${t2[2][0]} ${t2[2][1]} Z`;
    
    return `${path1} ${path2}`;
  };

  // Generate pattern elements
  const generatePattern = () => {
    const elements = [];
    const rows = Math.ceil(height / patternSize) + 2;
    const cols = Math.ceil(width / patternSize) + 2;
    
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * patternSize + (row % 2 === 0 ? 0 : patternSize / 2);
        const y = row * (patternSize * 0.866);
        
        elements.push(
          <Path
            key={`hex-${row}-${col}`}
            d={createHexagram(x, y, patternSize * 0.4)}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={0.5}
            fill="none"
          />
        );
      }
    }
    
    return elements;
  };

  return (
    <View style={[styles.container, { opacity }]} pointerEvents="none">
      <Svg width={width} height={height} style={styles.svg}>
        {generatePattern()}
      </Svg>
    </View>
  );
};

// Simpler diamond pattern as alternative
export const DiamondPattern = ({ opacity = 0.08 }: { opacity?: number }) => {
  const size = 40;
  const rows = Math.ceil(height / size) + 2;
  const cols = Math.ceil(width / size) + 2;
  
  const elements = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size + (row % 2 === 0 ? 0 : size / 2);
      const y = row * size;
      
      elements.push(
        <Path
          key={`d-${row}-${col}`}
          d={`M ${x} ${y - size/3} L ${x + size/3} ${y} L ${x} ${y + size/3} L ${x - size/3} ${y} Z`}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={0.5}
          fill="none"
        />
      );
    }
  }
  
  return (
    <View style={[styles.container, { opacity }]} pointerEvents="none">
      <Svg width={width} height={height} style={styles.svg}>
        {elements}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default IslamicPattern;
