import React from 'react'
import { Tooltip } from 'recharts'

export function ChartContainer({ config, className = '', children }) {
  return <div className={className}>{children}</div>
}

export function ChartTooltip(props) {
  return <Tooltip {...props} />
}
