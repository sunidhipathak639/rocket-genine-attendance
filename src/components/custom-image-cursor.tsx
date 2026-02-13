'use client'

import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import Image from 'next/image'

interface CustomImageCursorProps {
  /**
   * The image source (e.g., '/my-cursor.png').
   * If not provided, a default styled dot will be used.
   */
  imageSrc?: string
  /**
   * Size of the cursor in pixels.
   * @default 32 (if imageSrc is provided) or 12 (if dot)
   */
  size?: number
}

export function CustomImageCursor({ imageSrc, size }: CustomImageCursorProps) {
  // Use springs for smooth movement
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      // Only show after first movement to avoid jumping from (0,0)
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    window.addEventListener('mousemove', moveCursor)
    window.addEventListener('mouseenter', handleMouseEnter)
    window.addEventListener('mouseleave', handleMouseLeave)

    // Hide default cursor
    document.body.style.cursor = 'none'

    // Also hide default cursor on all interactive elements if desired,
    // or keep 'auto' on them so user sees pointer.
    // Usually with custom cursors, we want to hide proper system cursor globally
    // BUT seeing system pointer on links/buttons is good for UX.
    // For "image in mouse cursor", usually it's an aesthetic override.
    // Let's hide body cursor but allow pointer on hoverable elements
    // by adding a global style or class if needed.
    // For now, strict 'none' on body is a good start.

    return () => {
      window.removeEventListener('mousemove', moveCursor)
      window.removeEventListener('mouseenter', handleMouseEnter)
      window.removeEventListener('mouseleave', handleMouseLeave)
      document.body.style.cursor = 'auto'
    }
  }, [mouseX, mouseY, isVisible])

  // Determine size
  const cursorSize = size || (imageSrc ? 32 : 12)

  if (!isVisible) return null

  return (
    <>
      {/* Global style to hide default cursor, but allow pointer on hoverables if desired. 
          Actually, for a complete replacement, we usually want 'none' everywhere 
          and handle 'hover' states in the custom cursor. 
          For simplicity, we'll just hide the default arrow. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        * {
          cursor: none !important;
        }
      `,
        }}
      />

      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center"
        style={{
          x,
          y,
          width: cursorSize,
          height: cursorSize,
          // We translate by -50% to center the custom cursor on the mouse point
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        {imageSrc ? (
          <div className="relative w-full h-full">
            <Image
              src={imageSrc}
              alt="Custom Cursor"
              fill
              className="object-contain drop-shadow-md"
              priority
              unoptimized // useful if using external URLs without config
            />
          </div>
        ) : (
          // Default fallback: A nice simple dot if no image is provided
          <div className="w-full h-full bg-primary rounded-full shadow-lg border border-white/20 backdrop-blur-sm" />
        )}
      </motion.div>
    </>
  )
}
