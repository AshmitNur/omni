import React, { useEffect, useRef } from 'react';

interface EtherealShadowProps {
  className?: string;
  children?: React.ReactNode;
}

const EtherealShadow: React.FC<EtherealShadowProps> = ({
  className = '',
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }> = [];

    const colors = [
      'rgba(91, 141, 239, 0.3)',   // Electric Steel Blue (var(--color-accent))
      'rgba(147, 51, 234, 0.3)',   // Purple
      'rgba(107, 114, 128, 0.3)',  // Chrome (var(--color-chrome))
      'rgba(58, 63, 74, 0.3)',     // Chrome Dark
      'rgba(156, 163, 175, 0.3)',  // Chrome Light
    ];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 100 + 50,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animationFrameId: number;

    const animate = () => {
      // Clear with slight trailing effect
      ctx.fillStyle = 'rgba(7, 8, 10, 0.05)'; // var(--color-void)
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-[var(--color-void)] ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-60"
        style={{ filter: 'blur(40px)' }}
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};

export default EtherealShadow;
