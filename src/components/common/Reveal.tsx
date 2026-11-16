import { motion, type HTMLMotionProps } from 'motion/react';
import { EASE_LEAF } from '@/styles/tokens';

interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number;
  /** 아래에서 떠오르는 거리(px) */
  y?: number;
}

/** 화면에 들어올 때 한 번 부드럽게 나타나는 래퍼 (reduced-motion은 MotionConfig가 처리) */
export default function Reveal({ delay = 0, y = 24, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE_LEAF, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
