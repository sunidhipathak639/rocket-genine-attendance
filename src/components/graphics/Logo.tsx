'use client'

import React from 'react'

const Logo = (_props: any) => {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/rocket-genie-logo.webp"
        alt="Rocket Genie"
        style={{ maxWidth: '240px', maxHeight: '240px', objectFit: 'contain' }} // Inline styles for safety
      />
    </div>
  )
}

export default Logo
