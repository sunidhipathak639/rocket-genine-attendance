'use client'

import React from 'react'
import Image from 'next/image'

const Logo = () => {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/rocket-genie-logo.webp"
        alt="Rocket Genie"
        width={240}
        height={240}
        className="object-contain"
        priority
      />
    </div>
  )
}

export default Logo
