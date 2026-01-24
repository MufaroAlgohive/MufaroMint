import React from 'react'

const cx = (...classes) => classes.filter(Boolean).join(' ')

export function Badge({ variant = 'default', appearance = 'solid', className = '', children }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none'

  const variants = {
    default: 'bg-black/10 text-black',
    success: 'bg-emerald-500/15 text-emerald-700',
    destructive: 'bg-red-500/15 text-red-700',
  }

  const appearances = {
    solid: '',
    light: 'backdrop-blur',
  }

  return (
    <span className={cx(base, variants[variant] || variants.default, appearances[appearance] || '', className)}>
      {children}
    </span>
  )
}
