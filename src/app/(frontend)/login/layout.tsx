import { FloatingSupportIcon } from '@/components/floating-support-icon'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingSupportIcon />
    </>
  )
}
