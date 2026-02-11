'use client'

import React from 'react'
import { Rocket } from 'lucide-react'

const Icon = (_props: any) => {
  return (
    <Rocket
      className="text-indigo-600 dark:text-indigo-400"
      size={40}
      strokeWidth={2}
      style={{ maxWidth: '40px', maxHeight: '40px' }}
    />
  )
}

export default Icon
