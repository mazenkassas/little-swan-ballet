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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#FDF6F8,#F5E6EA,#FDF6F8)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#C8788A'}}/>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'white',border:'1.5px solid #EDD8DC',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:28}}>🩰</div>
          <h1 style={{fontSize:28,fontFamily:'Georgia,serif',fontStyle:'italic',color:'#C8788A',fontWeight:400,margin:0}}>Little Swan</h1>
          <p style={{fontSize:10,color:'#B89CA0',letterSpacing:'0.25em',textTransform:'uppercase',marginTop:6}}>Ballet Academy</p>
        </div>
        <div style={{background:'white',borderRadius:20,border:'1px solid #EDD8DC',padding:'32px 28px',boxShadow:'0 8px 40px rgba(200,120,138,0.12)'}}>
          <h2 style={{fontSize:17,fontWeight:600,color:'#2C1F24',marginBottom:4,textAlign:'center'}}>تسجيل الدخول</h2>
          <p style={{fontSize:12,color:'#B89CA0',marginBottom:24,textAlign:'center'}}>أدخل بياناتك للوصول إلى النظام</p>
          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:500,color:'#7A5C63',marginBottom:6}}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@littleswan.com" style={{width:'100%',background:'#FDFAF8',border:'1px solid #EDD8DC',borderRadius:10,padding:'11px 14px',fontSize:13,color:'#2C1F24',outline:'none',fontFamily:'inherit'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:500,color:'#7A5C63',marginBottom:6}}>كلمة المرور</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" style={{width:'100%',background:'#FDFAF8',border:'1px solid #EDD8DC',borderRadius:10,padding:'11px 14px',fontSize:13,color:'#2C1F24',outline:'none',fontFamily:'inherit'}}/>
            </div>
            {error && <div style={{background:'#FFF0F2',border:'1px solid #F4C0CC',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#8B4A58',textAlign:'center'}}>{error}</div>}
            <button type="submit" disabled={loading} style={{background:loading?'#E8B4C0':'#C8788A',color:'white',border:'none',borderRadius:10,padding:'13px',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',marginTop:6,fontFamily:'inherit'}}>
              {loading?'جارٍ الدخول...':'دخول'}
            </button>
          </form>
        </div>
        <p style={{textAlign:'center',color:'#B89CA0',fontSize:11,marginTop:20}}>Miami Branch — Hall 1 &amp; Hall 2</p>
      </div>
    </div>
  )
}
