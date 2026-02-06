'use client'

import React from 'react'
import { motion } from 'framer-motion'

const blobConfigs = [
  {
    className: 'w-[min(90vw,520px)] h-[min(90vw,520px)] -top-[10%] -left-[5%]',
    bg: 'bg-indigo-500/40 dark:bg-indigo-500/35',
    blur: 'blur-[100px]',
    x: [0, 120, -80, 100, 0],
    y: [0, 80, -100, 60, 0],
    scale: [1, 1.15, 0.9, 1.1, 1],
    duration: 20,
    delay: 0,
  },
  {
    className: 'w-[min(80vw,460px)] h-[min(80vw,460px)] top-[40%] -right-[10%]',
    bg: 'bg-indigo-600/35 dark:bg-indigo-500/30',
    blur: 'blur-[110px]',
    x: [0, -100, 80, 0],
    y: [0, 60, -90, 0],
    scale: [1, 1.12, 0.88, 1],
    duration: 24,
    delay: 2,
  },
  {
    className: 'w-[min(70vw,400px)] h-[min(70vw,400px)] -bottom-[15%] left-[20%]',
    bg: 'bg-indigo-400/40 dark:bg-indigo-500/32',
    blur: 'blur-[90px]',
    x: [0, 90, -70, -50, 0],
    y: [0, -70, 50, -60, 0],
    scale: [1, 1.1, 0.92, 1.06, 1],
    duration: 18,
    delay: 1,
  },
  {
    className: 'w-[min(60vw,360px)] h-[min(60vw,360px)] top-[60%] -left-[8%]',
    bg: 'bg-indigo-500/38 dark:bg-indigo-500/30',
    blur: 'blur-[95px]',
    x: [0, 110, 0],
    y: [0, 70, 0],
    scale: [1, 1.12, 1],
    duration: 22,
    delay: 0.5,
  },
  {
    className: 'w-[min(50vw,320px)] h-[min(50vw,320px)] top-[15%] right-[15%]',
    bg: 'bg-indigo-600/35 dark:bg-indigo-500/30',
    blur: 'blur-[85px]',
    x: [0, -90, 70, 0],
    y: [0, -80, 60, 0],
    scale: [1, 0.92, 1.1, 1],
    duration: 16,
    delay: 1.5,
  },
]

export function FluidBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden
    >
      {blobConfigs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${blob.bg} ${blob.blur} ${blob.className}`}
          initial={false}
          animate={{
            x: blob.x,
            y: blob.y,
            scale: blob.scale,
          }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: blob.delay,
          }}
        />
      ))}
    </div>
  )
}
