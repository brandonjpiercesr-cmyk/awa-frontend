// ⬡B:myaba.presence:COMPONENT:v1.2.0:20260225⬡
// Premium Glass Translucent ABA Presence with State Animations
// NOT corny. Premium. Gorgeous. Glass morphism.

import { useRef, useEffect, useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// PERLIN NOISE - Organic movement
// ════════════════════════════════════════════════════════════════════════════
class PerlinNoise {
  constructor() {
    this.p = [];
    for (let i = 0; i < 512; i++) {
      this.p[i] = Math.floor(Math.random() * 256);
    }
  }
  
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  
  grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  
  get(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    return this.lerp(v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// STATE CONFIGURATIONS - Each state has unique visual signature
// ════════════════════════════════════════════════════════════════════════════
const STATES = {
  idle: {
    colors: [
      { r: 139, g: 92, b: 246, a: 0.6 },   // Purple
      { r: 167, g: 139, b: 250, a: 0.4 },  // Light purple
      { r: 99, g: 102, b: 241, a: 0.3 },   // Indigo
    ],
    glow: { r: 139, g: 92, b: 246 },
    speed: 0.008,
    amplitude: 0.06,
    breathe: 0.02,
    particleCount: 12,
    ringPulse: 0.5
  },
  thinking: {
    colors: [
      { r: 251, g: 191, b: 36, a: 0.7 },   // Amber
      { r: 245, g: 158, b: 11, a: 0.5 },   // Orange
      { r: 253, g: 224, b: 71, a: 0.3 },   // Yellow
    ],
    glow: { r: 251, g: 191, b: 36 },
    speed: 0.025,
    amplitude: 0.12,
    breathe: 0.05,
    particleCount: 24,
    ringPulse: 2.0
  },
  speaking: {
    colors: [
      { r: 34, g: 197, b: 94, a: 0.7 },    // Green
      { r: 16, g: 185, b: 129, a: 0.5 },   // Emerald
      { r: 45, g: 212, b: 191, a: 0.3 },   // Teal
    ],
    glow: { r: 34, g: 197, b: 94 },
    speed: 0.02,
    amplitude: 0.15,
    breathe: 0.08,
    particleCount: 20,
    ringPulse: 1.5
  },
  listening: {
    colors: [
      { r: 6, g: 182, b: 212, a: 0.7 },    // Cyan
      { r: 59, g: 130, b: 246, a: 0.5 },   // Blue
      { r: 139, g: 92, b: 246, a: 0.3 },   // Purple
    ],
    glow: { r: 6, g: 182, b: 212 },
    speed: 0.015,
    amplitude: 0.1,
    breathe: 0.04,
    particleCount: 16,
    ringPulse: 1.2
  }
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export function ABAPresence({ state = 'idle', size = 200, className = '' }) {
  const canvasRef = useRef(null);
  const noiseRef = useRef(new PerlinNoise());
  const stateRef = useRef(state);
  const frameRef = useRef(null);
  const particlesRef = useRef([]);
  const audioLevelRef = useRef(0);
  
  useEffect(() => {
    stateRef.current = state;
    // Reset particles on state change for smooth transition
    particlesRef.current = [];
  }, [state]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    const center = size / 2;
    const noise = noiseRef.current;
    let time = 0;
    let transitionProgress = 0;
    let prevState = state;
    
    // Initialize particles
    const initParticles = (count) => {
      const particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          angle: (Math.PI * 2 * i) / count,
          radius: size * 0.35 + Math.random() * size * 0.1,
          speed: 0.01 + Math.random() * 0.02,
          size: 2 + Math.random() * 3,
          opacity: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2
        });
      }
      return particles;
    };
    
    const draw = () => {
      const config = STATES[stateRef.current] || STATES.idle;
      
      // State transition
      if (stateRef.current !== prevState) {
        transitionProgress = 0;
        prevState = stateRef.current;
        particlesRef.current = initParticles(config.particleCount);
      }
      transitionProgress = Math.min(1, transitionProgress + 0.02);
      
      time += config.speed;
      
      ctx.clearRect(0, 0, size, size);
      
      // ──────────────────────────────────────────────────────────────────────
      // LAYER 1: Outer glass rings (subtle pulsing)
      // ──────────────────────────────────────────────────────────────────────
      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = size * (0.42 + ring * 0.04);
        const pulseAmount = Math.sin(time * config.ringPulse + ring * 0.5) * 0.02;
        const adjustedRadius = ringRadius * (1 + pulseAmount);
        
        ctx.beginPath();
        ctx.arc(center, center, adjustedRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, ${0.08 - ring * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // ──────────────────────────────────────────────────────────────────────
      // LAYER 2: Ambient glow (glass effect base)
      // ──────────────────────────────────────────────────────────────────────
      const glowGradient = ctx.createRadialGradient(
        center, center, 0,
        center, center, size * 0.5
      );
      glowGradient.addColorStop(0, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, 0.25)`);
      glowGradient.addColorStop(0.3, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, 0.12)`);
      glowGradient.addColorStop(0.6, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, 0.04)`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, size, size);
      
      // ──────────────────────────────────────────────────────────────────────
      // LAYER 3: Glass orb body (organic blob with noise)
      // ──────────────────────────────────────────────────────────────────────
      for (let layer = config.colors.length - 1; layer >= 0; layer--) {
        const color = config.colors[layer];
        const layerOffset = layer * 0.8;
        const baseRadius = size * (0.25 - layer * 0.03);
        const breathe = Math.sin(time * 2 + layer) * config.breathe * size;
        
        ctx.beginPath();
        const segments = 80;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          
          // Multi-octave noise for organic feel
          const n1 = noise.get(Math.cos(angle) * 2 + time + layerOffset, Math.sin(angle) * 2 + time * 0.7);
          const n2 = noise.get(Math.cos(angle) * 4 + time * 1.3 + layerOffset, Math.sin(angle) * 4 + time * 0.9) * 0.5;
          const n3 = noise.get(Math.cos(angle) * 8 + time * 0.5, Math.sin(angle) * 8 + time * 1.1) * 0.25;
          
          const noiseVal = (n1 + n2 + n3) * config.amplitude * size;
          const r = baseRadius + breathe + noiseVal;
          
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        // Glass gradient fill
        const blobGradient = ctx.createRadialGradient(
          center - size * 0.05, center - size * 0.05, 0,
          center, center, baseRadius * 1.5
        );
        blobGradient.addColorStop(0, `rgba(${color.r + 40}, ${color.g + 40}, ${color.b + 40}, ${color.a})`);
        blobGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a * 0.8})`);
        blobGradient.addColorStop(1, `rgba(${color.r - 20}, ${color.g - 20}, ${color.b - 20}, ${color.a * 0.6})`);
        
        ctx.fillStyle = blobGradient;
        ctx.filter = 'blur(2px)';
        ctx.fill();
        ctx.filter = 'none';
        
        // Glass highlight (top-left reflection)
        if (layer === 0) {
          const highlightGradient = ctx.createRadialGradient(
            center - size * 0.08, center - size * 0.08, 0,
            center - size * 0.08, center - size * 0.08, size * 0.15
          );
          highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = highlightGradient;
          ctx.fill();
        }
      }
      
      // ──────────────────────────────────────────────────────────────────────
      // LAYER 4: Floating particles (state-dependent)
      // ──────────────────────────────────────────────────────────────────────
      if (particlesRef.current.length === 0) {
        particlesRef.current = initParticles(config.particleCount);
      }
      
      particlesRef.current.forEach((p, i) => {
        p.angle += p.speed;
        const wobble = Math.sin(time * 3 + p.phase) * 5;
        const x = center + Math.cos(p.angle) * (p.radius + wobble);
        const y = center + Math.sin(p.angle) * (p.radius + wobble);
        
        const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, p.size);
        particleGradient.addColorStop(0, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, ${p.opacity})`);
        particleGradient.addColorStop(1, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, 0)`);
        
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleGradient;
        ctx.fill();
      });
      
      // ──────────────────────────────────────────────────────────────────────
      // LAYER 5: Center core (bright point)
      // ──────────────────────────────────────────────────────────────────────
      const coreSize = size * 0.03 * (1 + Math.sin(time * 4) * 0.2);
      const coreGradient = ctx.createRadialGradient(center, center, 0, center, center, coreSize * 3);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
      coreGradient.addColorStop(0.3, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, 0.6)`);
      coreGradient.addColorStop(1, `rgba(${config.glow.r}, ${config.glow.g}, ${config.glow.b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(center, center, coreSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
      
      frameRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [size]);
  
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          display: 'block',
          filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))'
        }}
      />
    </div>
  );
}

export default ABAPresence;
