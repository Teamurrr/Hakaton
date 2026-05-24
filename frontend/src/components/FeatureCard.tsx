import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type FeatureCardProps = {
  title: string
  children: ReactNode
  eyebrow?: string
}

export default function FeatureCard({ title, children, eyebrow }: FeatureCardProps) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="feature-card"
    >
      {eyebrow ? <span className="feature-badge">{eyebrow}</span> : null}
      <h3>{title}</h3>
      <p>{children}</p>
    </motion.article>
  )
}
