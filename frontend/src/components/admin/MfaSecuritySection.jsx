import { useContext, useEffect, useState } from 'react';
import { adminJson } from './adminApi';
import { AuthContext } from '../../context/AuthContext';
import './MfaSecuritySection.css';

const MfaSecuritySection = () => {
  const { logout } = useContext(AuthContext);
  const [status, setStatus] = useState({ enabled: false, backupCodesRemaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [step, setStep] = useState('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setupData, setSetupData] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminJson('/api/auth/mfa/status');
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const data = await adminJson('/api/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setSetupData(data);
      setStep('confirm');
      setCode('');
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await adminJson('/api/auth/mfa/confirm-setup', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      setInfo(data.message);
      setPassword('');
      setCode('');
      await logout();
    } catch (err) {
      setError(err.message);
    }
  };

  const disableMfa = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const data = await adminJson('/api/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ password, code }),
      });
      setInfo(data.message);
      setPassword('');
      setCode('');
      setStep('idle');
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <p>Loading security settings…</p>;
  }

  return (
    <div className="mfa-security-section">
      <p>
        Protect your admin account with Google Authenticator (or any TOTP app).
        MFA is required only for <strong>ADMIN</strong> logins.
      </p>

      {error && <p className="error-message">{error}</p>}
      {info && <p className="info-message">{info}</p>}

      {status.enabled ? (
        <div className="mfa-card">
          <p><strong>Status:</strong> Enabled</p>
          <p>Backup codes remaining: {status.backupCodesRemaining}</p>
          {step === 'disable' ? (
            <form onSubmit={disableMfa} className="mfa-form">
              <label>
                Password
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Authenticator code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">Disable MFA</button>
              <button type="button" className="btn btn-secondary" onClick={() => setStep('idle')}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setStep('disable')}>
              Disable MFA
            </button>
          )}
        </div>
      ) : (
        <div className="mfa-card">
          <p><strong>Status:</strong> Not enabled</p>
          {step === 'confirm' && setupData ? (
            <form onSubmit={confirmSetup} className="mfa-form">
              <p>Scan this QR code in Google Authenticator, then enter the 6-digit code.</p>
              <img src={setupData.qrDataUrl} alt="MFA QR code" className="mfa-qr" />
              <p className="mfa-manual-key">
                Manual key: <code>{setupData.manualEntryKey}</code>
              </p>
              <label>
                Verification code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">Enable MFA</button>
              <button type="button" className="btn btn-secondary" onClick={() => setStep('idle')}>
                Cancel
              </button>
            </form>
          ) : step === 'backup' ? (
            <div className="mfa-backup-codes">
              <p>Save these backup codes in a safe place. Each can be used once.</p>
              <ul>
                {backupCodes.map((item) => (
                  <li key={item}><code>{item}</code></li>
                ))}
              </ul>
              <p>You have been logged out. Log in again with your authenticator app.</p>
            </div>
          ) : (
            <form onSubmit={startSetup} className="mfa-form">
              <label>
                Confirm your password to start setup
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">Set up MFA</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default MfaSecuritySection;
