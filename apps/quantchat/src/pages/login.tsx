// ============================================================================
// QuantChat - Login Page
// Phone number login with OTP verification
// ============================================================================

import React, { useState } from 'react';
import { apiClient } from '../services/api-client';

type LoginStep = 'phone' | 'otp' | 'profile';

interface CountryCode {
  code: string;
  name: string;
  dial: string;
}

const countryCodes: CountryCode[] = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
];

export const LoginPage: React.FC = () => {
  const [step, setStep] = useState<LoginStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  const handleRequestOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    const response = await apiClient.requestOTP({
      phoneNumber,
      countryCode,
    });

    setLoading(false);

    if (response.success) {
      setStep('otp');
      setOtpExpiresIn(response.data?.expiresIn || 300);
      startCountdown();
    } else {
      setError(response.error?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    const response = await apiClient.verifyOTP({
      phoneNumber: `${countryCode}${phoneNumber}`,
      otp: otpCode,
      deviceId: `device_${Date.now()}`,
    });

    setLoading(false);

    if (response.success && response.data) {
      if (response.data.isNewUser) {
        setStep('profile');
      } else {
        // Existing user - redirect to chat
        window.location.hash = '/';
      }
    } else {
      setError(response.error?.message || 'Invalid OTP');
    }
  };

  const handleCompleteProfile = async () => {
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    const response = await apiClient.updateProfile({
      username,
      displayName: displayName || username,
    });

    setLoading(false);

    if (response.success) {
      window.location.hash = '/';
    } else {
      setError(response.error?.message || 'Failed to update profile');
    }
  };

  const handleOTPInput = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[data-otp-index="${index + 1}"]`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const startCountdown = () => {
    const interval = setInterval(() => {
      setOtpExpiresIn(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <h1>QuantChat</h1>
          <p>Connect with friends instantly</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {step === 'phone' && (
          <div className="login-step phone-step">
            <h2>Enter your phone number</h2>
            <p>We will send you a verification code</p>

            <div className="phone-input-group">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="country-select"
              >
                {countryCodes.map(c => (
                  <option key={c.code} value={c.dial}>{c.dial} {c.name}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={15}
                className="phone-input"
              />
            </div>

            <button
              onClick={handleRequestOTP}
              disabled={loading || phoneNumber.length < 7}
              className="primary-btn"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>

            <div className="login-footer">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="login-step otp-step">
            <h2>Enter verification code</h2>
            <p>Sent to {countryCode} {phoneNumber}</p>

            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  data-otp-index={index}
                  onChange={(e) => handleOTPInput(index, e.target.value)}
                  className="otp-input"
                />
              ))}
            </div>

            <div className="otp-timer">
              {otpExpiresIn > 0 ? (
                <span>Code expires in {Math.floor(otpExpiresIn / 60)}:{(otpExpiresIn % 60).toString().padStart(2, '0')}</span>
              ) : (
                <button onClick={handleRequestOTP} className="resend-btn">Resend code</button>
              )}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.join('').length !== 6}
              className="primary-btn"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button onClick={() => setStep('phone')} className="back-btn">Change number</button>
          </div>
        )}

        {step === 'profile' && (
          <div className="login-step profile-step">
            <h2>Set up your profile</h2>
            <p>Choose a username for your friends to find you</p>

            <div className="profile-inputs">
              <input
                type="text"
                placeholder="Username (required)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={20}
                className="profile-input"
              />
              <input
                type="text"
                placeholder="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                className="profile-input"
              />
            </div>

            <button
              onClick={handleCompleteProfile}
              disabled={loading || username.length < 3}
              className="primary-btn"
            >
              {loading ? 'Setting up...' : 'Get Started'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
