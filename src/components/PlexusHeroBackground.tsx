import React, { useEffect, useRef } from 'react';

/**
 * PlexusHeroBackground:
 * Renders an animated geometric plexus network inspired by the reference video:
 * - Multicolor connected nodes (cyan/teal on left, lime/yellow in middle, magenta/purple on right)
 * - Dynamic moving nodes with connecting lines, pulse waves, and glowing active pulses
 * - 3D-depth parallax with smooth camera orbit drift
 * - Natural cinematic bloom and shallow depth of field effects
 */
export const PlexusHeroBackground: React.FC<{ opacity?: number }> = ({ opacity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Colors matching the video: cyan/teal (left), lime/yellow (center), violet/purple (right)
    const getColor = (normX: number, alpha: number) => {
      if (normX < 0.35) {
        // Cyan to mint teal
        const t = normX / 0.35;
        const r = Math.round(45 + t * 55);
        const g = Math.round(212 + t * 25);
        const b = Math.round(191 - t * 60);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (normX < 0.65) {
        // Mint to energetic lime yellow
        const t = (normX - 0.35) / 0.3;
        const r = Math.round(100 + t * 110);
        const g = Math.round(237 - t * 17);
        const b = Math.round(131 - t * 70);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        // Lime yellow to vibrant magenta violet
        const t = (normX - 0.65) / 0.35;
        const r = Math.round(210 + t * 15);
        const g = Math.round(220 - t * 120);
        const b = Math.round(61 + t * 170);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    };

    // Particles configuration
    const NODE_COUNT = Math.min(110, Math.max(65, Math.floor((width * height) / 8000)));
    const MAX_DISTANCE = 145;

    interface Node {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      pulseOffset: number;
    }

    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * width * 1.3,
        y: (Math.random() - 0.5) * height * 1.3,
        z: Math.random() * 400 + 100, // 3D depth
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        vz: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.8 + 1.2,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Fast moving pulse signal along lines (like the laser beam in the video)
    const pulses = [
      { from: 0, to: 1, progress: 0, speed: 0.015, color: '#facc15' },
      { from: 5, to: 12, progress: 0.5, speed: 0.02, color: '#2dd4bf' },
      { from: 10, to: 20, progress: 0.2, speed: 0.018, color: '#d946ef' },
    ];

    let time = 0;

    const render = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Camera motion: slow cinematic orbit / drift
      const camYaw = Math.sin(time * 0.4) * 0.08;
      const camPitch = Math.cos(time * 0.3) * 0.05;
      const fov = 450;
      const cx = width / 2;
      const cy = height / 2;

      // Project 3D to 2D
      const projected: { x: number; y: number; scale: number; orig: Node; screenNormX: number }[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap boundaries
        const boundX = width * 0.7;
        const boundY = height * 0.7;
        if (p.x < -boundX) p.x = boundX;
        if (p.x > boundX) p.x = -boundX;
        if (p.y < -boundY) p.y = boundY;
        if (p.y > boundY) p.y = -boundY;
        if (p.z < 80) p.z = 500;
        if (p.z > 500) p.z = 80;

        // Apply camera rotation
        const rx = p.x * Math.cos(camYaw) - p.z * Math.sin(camYaw);
        const rz = p.x * Math.sin(camYaw) + p.z * Math.cos(camYaw) + 350;
        const ry = p.y * Math.cos(camPitch) - rz * Math.sin(camPitch);

        if (rz <= 10) continue;
        const scale = fov / rz;
        const sx = cx + rx * scale;
        const sy = cy + ry * scale;

        projected.push({
          x: sx,
          y: sy,
          scale,
          orig: p,
          screenNormX: Math.max(0, Math.min(1, sx / width)),
        });
      }

      // Draw connection lines with gradient / distance fade
      ctx.lineWidth = 1.2;
      const len = projected.length;
      for (let i = 0; i < len; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < len; j++) {
          const p2 = projected[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.75 * Math.min(p1.scale, p2.scale);
            if (alpha <= 0.01) continue;

            const midX = (p1.screenNormX + p2.screenNormX) / 2;
            ctx.strokeStyle = getColor(midX, alpha);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw traveling laser beam pulse lines (as seen in video)
      for (const pulse of pulses) {
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          pulse.progress = 0;
          pulse.from = Math.floor(Math.random() * len);
          pulse.to = Math.floor(Math.random() * len);
        }

        const p1 = projected[pulse.from % len];
        const p2 = projected[pulse.to % len];
        if (p1 && p2) {
          const px = p1.x + (p2.x - p1.x) * pulse.progress;
          const py = p1.y + (p2.y - p1.y) * pulse.progress;

          // Trail beam
          ctx.strokeStyle = pulse.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(px, py);
          ctx.stroke();

          // Bright pulse head
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = pulse.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw nodes with depth-of-field bloom & pulses
      for (let i = 0; i < len; i++) {
        const p = projected[i];
        const pulse = 1 + Math.sin(time * 2 + p.orig.pulseOffset) * 0.3;
        const r = Math.max(1.2, p.orig.radius * p.scale * pulse * 1.25);
        const col = getColor(p.screenNormX, Math.min(1, 0.75 * p.scale));

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Occasional bright focus points
        if (i % 6 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = col;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ opacity }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
