'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError('كلمة المرور أو البريد غير صحيح'); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#FDF6F8,#F5E6EA,#FDF6F8)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, position:'relative' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#C8788A' }} />
      <div style={{ width:'100%', maxWidth:400 }
