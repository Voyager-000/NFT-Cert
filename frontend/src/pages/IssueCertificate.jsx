import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

const API_URL = '/api'
console.log('[DEBUG] API_URL:', API_URL);

export default function IssueCertificate() {
  const { isConnected, isCorrectNetwork, switchNetwork } = useWallet()

  const [form, setForm] = useState({
    recipientName: '',
    recipientWallet: '',
    courseTitle: '',
  })

  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch(`${API_URL}/issue-certificate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          student_wallet: form.recipientWallet,
          student_name: form.recipientName,
          course_name: form.courseTitle,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus({
          type: 'success',
          message: `✅ Certificate issued on the blockchain! Tx: ${data.transaction_hash.slice(0, 14)}...`,
        })
        handleReset()
      } else {
        let msg = `❌ Failed to issue: ${data.detail || 'Unknown error'}`;
        if (data.code === 'INSUFFICIENT_FUNDS') {
          msg = (
            <span>
              ❌ <strong>Insufficient Funds:</strong> The Issuer Wallet needs MATIC. 
              Please fund it using the <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>Polygon Faucet</a>.
            </span>
          );
        }
        setStatus({
          type: 'error',
          message: msg,
        })
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setStatus({
        type: 'error',
        message: `❌ Failed to connect to the backend server. Error: ${err.message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setForm({ recipientName: '', recipientWallet: '', courseTitle: '' })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Issue Certificate</h1>
        <p>Fill in the details below to create a new blockchain certificate.</p>
      </div>

      {/* Wallet guard */}
      {!isConnected && (
        <div className="wallet-notice warning" style={{ marginBottom: '1.4rem' }}>
          <span>⚠️</span>
          <div><strong>Wallet not connected.</strong> Please connect your wallet before issuing a certificate.</div>
        </div>
      )}

      {isConnected && !isCorrectNetwork && (
        <div className="wallet-notice warning" style={{ marginBottom: '1.4rem' }}>
          <span>⚠️</span>
          <div>
            <strong>Wrong network.</strong> Please{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); switchNetwork() }}>switch to Polygon Amoy</a>{' '}
            to issue certificates.
          </div>
        </div>
      )}

      {status.message && (
        <div
          style={{
            background: status.type === 'success' ? '#e6f7e9' : '#fff0f0',
            border: `1.5px solid ${status.type === 'success' ? '#a3d9aa' : '#feb2b2'}`,
            color: status.type === 'success' ? '#1a7a35' : '#9b2c2c',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '1.4rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            wordBreak: 'break-all'
          }}
        >
          {status.message}
        </div>
      )}

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="recipientName">Recipient Name</label>
              <input
                id="recipientName"
                name="recipientName"
                type="text"
                placeholder="e.g. Alice Johnson"
                value={form.recipientName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="recipientWallet">Recipient Wallet Address</label>
              <input
                id="recipientWallet"
                name="recipientWallet"
                type="text"
                placeholder="0x..."
                value={form.recipientWallet}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="courseTitle">Course / Certificate Title</label>
              <input
                id="courseTitle"
                name="courseTitle"
                type="text"
                placeholder="e.g. Advanced Solidity Development"
                value={form.courseTitle}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              Clear
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !isConnected || !isCorrectNetwork}
            >
              {loading ? (
                <><span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }}/> Processing...</>
              ) : (
                <>🎓 Issue Certificate</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
