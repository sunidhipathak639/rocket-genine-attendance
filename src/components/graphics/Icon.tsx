'use client'

import React from 'react'
import Image from 'next/image'

const Icon = () => {
  return (
    <Image
      src="/rocket-genie-logo.webp"
      alt="Rocket Genie"
      width={40}
      height={40}
      className="object-contain"
      priority
    />
  )
}

export default Icon
