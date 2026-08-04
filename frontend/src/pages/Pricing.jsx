import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createOrder, triggerMockWebhook, getMe } from '../api/client'

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [me, setMe] = useState(null)
  const [daysLeft, setDaysLeft] = useState(null)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await getMe();
        setMe(data);
        if (data.subscription_expires_at) {
          let expires = data.subscription_expires_at;
          if (!expires.endsWith('Z') && !expires.includes('+')) expires += 'Z';
          const diff = new Date(expires) - new Date();
          setDaysLeft(Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))));
        }
      } catch (e) {
        console.error("Failed to fetch limits for pricing");
      }
    };
    if (localStorage.getItem('fleximl_api_key')) fetchMe();
  }, [])

  const handleSubscribe = async (planName, price) => {
    if (planName === 'free') {
      toast.success('You are already on the free tier!')
      navigate('/dashboard')
      return
    }

    setLoading(planName)
    try {
      const { data } = await createOrder(planName)

      // DEVELOPER SANDBOX BYPASS
      if (data.key === 'mock_test_mode') {
        toast('Developer Sandbox active. Bypassing Razorpay...', { icon: '🛠️' });
        setTimeout(async () => {
          try {
            await triggerMockWebhook(planName)
            toast.success(`Mock Payment Successful! Welcome to ${planName.toUpperCase()}`, { duration: 3000 })
            setTimeout(() => { window.location.href = '/dashboard' }, 1500)
          } catch (mockErr) {
            toast.error('Developer Webhook update failed.')
            setLoading(null)
          }
        }, 2000)
        return
      }

      // PRODUCTION RAZORPAY FLOW
      const res = await loadRazorpay()
      if (!res) throw new Error('Razorpay SDK failed to load. Check your adblocker.')

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'FlexiML',
        description: `Subscription to ${planName.toUpperCase()} Plan`,
        order_id: data.order_id,
        handler: function (response) {
          toast.success(`Payment Successful! Welcome to ${planName.toUpperCase()}`)
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 2000)
        },
        prefill: {
          name: JSON.parse(localStorage.getItem('fleximl_user') || '{}')?.name || '',
          email: JSON.parse(localStorage.getItem('fleximl_user') || '{}')?.email || ''
        },
        theme: {
          color: '#6366f1' // Matches var(--primary)
        }
      }

      const paymentObject = new window.Razorpay(options)
      paymentObject.on('payment.failed', function (response) {
        toast.error(response.error.description || 'Payment Failed')
        setLoading(null)
      })
      paymentObject.open()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Unable to initiate payment.')
      setLoading(null)
    }
  }

  const plans = [
    {
      name: 'free',
      label: 'Free Trial',
      price: '₹0',
      period: '/forever',
      desc: 'Perfect for quick testing and student projects.',
      features: ['1 Active Model', '100 API Calls total', '6-Hour Edge Retention', 'Community Support']
    },
    {
      name: 'starter',
      label: 'Starter',
      price: '₹499',
      period: '/month',
      desc: 'For indie developers shipping fast ML solutions.',
      isPopular: true,
      features: ['3 Active Models', '10,000 API Calls / month', '1-Month Grace Retention', 'Priority Email Support', 'No Rate Limits']
    },
    {
      name: 'pro',
      label: 'Pro',
      price: '₹1499',
      period: '/month',
      desc: 'Scale up your production applications instantly.',
      features: ['10 Active Models', '100,000 API Calls / month', '1-Month Grace Retention', 'Dedicated 24/7 Support', 'Custom Integrations']
    }
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 1rem 8rem', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #a8b2d1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Scale your intelligence.
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: 600, margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Predictable pricing with zero surprises. Choose a plan tailored for your exact production needs. Upgrade anytime.
        </p>
        
        <div style={{ display: 'inline-flex', padding: '1rem 1.5rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '100px', color: 'var(--text-muted)', fontSize: '0.85rem', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '0.5rem' }}>💡 Retentions:</span> Your production ML models are kept safely for 1 full month after subscription expiry!
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
        {plans.map((p) => (
          <div key={p.name} className="card" style={{ 
            padding: '3rem 2.5rem', 
            position: 'relative', 
            display: 'flex',
            flexDirection: 'column',
            border: p.isPopular ? '2px solid var(--primary)' : '1px solid var(--border)',
            background: p.isPopular ? 'linear-gradient(180deg, rgba(30,32,45,1) 0%, rgba(20,21,30,1) 100%)' : 'var(--bg-light)',
            boxShadow: p.isPopular ? '0 20px 40px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.1)' : 'var(--shadow-card)',
            transform: p.isPopular ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'default'
          }}>
            
            {p.isPopular && (
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', padding: '0.4rem 1.5rem', borderRadius: 30, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
                Most Popular
              </div>
            )}
            
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: p.isPopular ? '#fff' : 'inherit' }}>{p.label}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', minHeight: 40, lineHeight: 1.5 }}>
              {p.desc}
            </p>
            
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'white' }}>{p.price}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{p.period}</span>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 3rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              {p.features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.isPopular ? "#8b5cf6" : "var(--primary)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {(() => {
              const isCurrentPlan = me?.subscription_tier === p.name;
              const canRenew = daysLeft !== null && daysLeft <= 8;
              const isDisabled = isCurrentPlan && !canRenew && p.name !== 'free';
              
              let btnText = 'Upgrade Plan';
              if (p.name === 'free') btnText = isCurrentPlan ? 'Current Tier' : 'Downgrade to Free';
              else if (isCurrentPlan) btnText = canRenew ? 'Renew Plan' : 'Active Plan';

              return (
                <button 
                  className={`btn ${p.isPopular && !isDisabled ? 'btn-primary' : 'btn-outline'}`} 
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    fontSize: '1rem', 
                    fontWeight: 600,
                    background: p.isPopular && !isDisabled ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '',
                    border: p.isPopular && !isDisabled ? 'none' : '',
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => handleSubscribe(p.name, p.price)}
                  disabled={loading === p.name || isDisabled || (p.name === 'free' && isCurrentPlan)}
                >
                  {loading === p.name ? <span className="spinner" style={{ width: 20, height: 20 }} /> : btnText}
                </button>
              )
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
