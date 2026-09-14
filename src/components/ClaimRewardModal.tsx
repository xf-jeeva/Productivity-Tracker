'use client';

import React, { useState, useEffect } from 'react';
import { 
  getCurrentUser, 
  getUserTokens, 
  getUserRewardClaims, 
  submitRewardClaim, 
  TOKEN_RUPEE_RATE, 
  MIN_REDEEM_AMOUNT_RUPEES,
  MIN_REDEEM_TOKENS,
  BUREAU_SYNC_EVENT 
} from '@/lib/storage';

import { PayoutMethod, RewardClaim } from '@/types';
import { playTypewriterClick, playRubberStampSound, playCoinRewardFanfare } from '@/lib/sound';
import confetti from 'canvas-confetti';
import { 
  X, 
  Coins, 
  Sparkles, 
  CreditCard, 
  Landmark, 
  Gift, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Stamp,
  ArrowRight
} from 'lucide-react';

interface ClaimRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimRewardModal({ isOpen, onClose }: ClaimRewardModalProps) {
  const [tokensToRedeem, setTokensToRedeem] = useState<number>(1);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('upi');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [myClaims, setMyClaims] = useState<RewardClaim[]>([]);
  const [tokenStats, setTokenStats] = useState({ balance: 0, totalEarned: 0, totalRedeemed: 0, rupeeWorth: 0 });

  const currentUser = getCurrentUser();

  const syncData = () => {
    if (!currentUser) return;
    const stats = getUserTokens(currentUser.username);
    setTokenStats(stats);
    setMyClaims(getUserRewardClaims(currentUser.username));
    if (stats.balance >= MIN_REDEEM_TOKENS && tokensToRedeem < MIN_REDEEM_TOKENS) {
      setTokensToRedeem(MIN_REDEEM_TOKENS);
    } else if (stats.balance > 0 && tokensToRedeem > stats.balance) {
      setTokensToRedeem(stats.balance);
    }
  };

  useEffect(() => {
    if (isOpen) {
      syncData();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener(BUREAU_SYNC_EVENT, syncData);
    return () => window.removeEventListener(BUREAU_SYNC_EVENT, syncData);
  }, []);

  if (!isOpen || !currentUser) return null;

  const currentRupeeValue = (tokensToRedeem || 0) * TOKEN_RUPEE_RATE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (tokensToRedeem < MIN_REDEEM_TOKENS) {
      setErrorMsg(`Minimum cashout threshold is ₹${MIN_REDEEM_AMOUNT_RUPEES} (${MIN_REDEEM_TOKENS} tokens). You requested ${tokensToRedeem} tokens (worth ₹${tokensToRedeem * TOKEN_RUPEE_RATE}).`);
      return;
    }

    if (tokensToRedeem > tokenStats.balance) {
      setErrorMsg(`You only have ${tokenStats.balance} tokens available.`);
      return;
    }

    if (!payoutDetails.trim()) {
      setErrorMsg('Please specify your payout recipient address (e.g. UPI ID or account number).');
      return;
    }

    const res = submitRewardClaim({
      username: currentUser.username,
      tokens: tokensToRedeem,
      payoutMethod,
      payoutDetails: payoutDetails.trim(),
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to submit claim requisition.');
      return;
    }

    playRubberStampSound();
    setTimeout(() => playCoinRewardFanfare(), 150);

    confetti({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#d8a658', '#1d5236', '#fcedbd'],
      disableForReducedMotion: true,
    });

    setSuccessMsg(`Requisition № ${res.claim?.claimNumber} successfully filed! ₹${res.claim?.rupeeAmount}.00 will be disbursed by the Bureau Treasury.`);
    setPayoutDetails('');
    setTokensToRedeem(MIN_REDEEM_TOKENS);
    syncData();
  };


  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(26, 20, 16, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="vintage-paper"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card)',
          border: '3px double var(--brass-gold)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          padding: '1.75rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            playTypewriterClick();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-secondary)',
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div
          style={{
            borderBottom: '2px solid var(--border-sepia-dark)',
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div className="vintage-coin" style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
            <div className="vintage-coin-inner">₹</div>
          </div>

          <div>
            <div
              className="typewriter-text"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--brass-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              The Daily Bureau • Treasury & Cashier Folio
            </div>
            <h2 className="serif-display" style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.15rem 0 0' }}>
              Claim Rewards & Token Cashout
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', margin: 0 }}>
              Convert your earned task tokens into real-world cash or vouchers (Rate: <strong>1 Token = ₹{TOKEN_RUPEE_RATE}</strong>).
            </p>
          </div>
        </div>

        {/* Balance Snapshot Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            className="vintage-paper"
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-parchment)',
              borderBottom: '3px solid var(--brass-gold)',
            }}
          >
            <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
              AVAILABLE TOKENS
            </div>
            <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brass-dark)' }}>
              {tokenStats.balance}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--stamp-green)', fontWeight: 700 }}>
              Worth ₹{tokenStats.rupeeWorth}.00 INR
            </div>
          </div>

          <div
            className="vintage-paper"
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-parchment)',
              borderBottom: '3px solid var(--stamp-green)',
            }}
          >
            <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
              LIFETIME EARNED
            </div>
            <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--stamp-green)' }}>
              {tokenStats.totalEarned}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
              Total ₹{tokenStats.totalEarned * TOKEN_RUPEE_RATE}.00 generated
            </div>
          </div>

          <div
            className="vintage-paper"
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--bg-parchment)',
              borderBottom: '3px solid var(--stamp-blue)',
            }}
          >
            <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
              TOTAL CASHED OUT
            </div>
            <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-primary)' }}>
              {tokenStats.totalRedeemed}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
              ₹{tokenStats.totalRedeemed * TOKEN_RUPEE_RATE}.00 claimed
            </div>
          </div>
        </div>

        {/* Minimum Threshold Rule & Progress Banner */}
        {(() => {
          const isEligible = tokenStats.balance >= MIN_REDEEM_TOKENS;
          const progressPercent = Math.min(100, Math.round((tokenStats.balance / MIN_REDEEM_TOKENS) * 100));

          return (
            <div
              style={{
                padding: '0.85rem 1.15rem',
                marginBottom: '1.5rem',
                borderRadius: '4px',
                backgroundColor: isEligible ? 'var(--stamp-green-bg)' : 'var(--bg-parchment)',
                border: isEligible ? '1.5px solid var(--stamp-green)' : '1.5px dashed var(--brass-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isEligible ? (
                  <CheckCircle2 size={24} style={{ color: 'var(--stamp-green)', flexShrink: 0 }} />
                ) : (
                  <Clock size={24} style={{ color: 'var(--brass-dark)', flexShrink: 0 }} />
                )}
                <div>
                  <div
                    className="typewriter-text"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isEligible ? 'var(--stamp-green)' : 'var(--brass-dark)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {isEligible
                      ? 'TREASURY CASHOUT ELIGIBLE • MINIMUM THRESHOLD MET'
                      : `MINIMUM REDEMPTION RULE: ₹${MIN_REDEEM_AMOUNT_RUPEES} (${MIN_REDEEM_TOKENS} TOKENS)`}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
                    {isEligible
                      ? `You hold ${tokenStats.balance} tokens (worth ₹${tokenStats.rupeeWorth}.00). You meet the minimum threshold of ₹${MIN_REDEEM_AMOUNT_RUPEES} (${MIN_REDEEM_TOKENS} tokens).`
                      : `Treasury policy requires a minimum cashout of ₹${MIN_REDEEM_AMOUNT_RUPEES} (${MIN_REDEEM_TOKENS} tokens). Current: ${tokenStats.balance}/${MIN_REDEEM_TOKENS} tokens (Need ${MIN_REDEEM_TOKENS - tokenStats.balance} more).`}
                  </div>
                </div>
              </div>

              {!isEligible && (
                <div style={{ minWidth: '160px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                    <span>Eligibility:</span>
                    <strong>{progressPercent}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '7px', backgroundColor: 'var(--border-sepia)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: 'var(--brass-gold)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Claim Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div
            className="vintage-paper"
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-parchment)',
              border: '1px solid var(--border-sepia-dark)',
            }}
          >
            <h4
              className="serif-display"
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-sepia)',
                paddingBottom: '0.4rem',
              }}
            >
              Commission a Cashout Requisition
            </h4>

            {errorMsg && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'var(--stamp-red-bg)',
                  border: '1px solid var(--stamp-red)',
                  color: 'var(--stamp-red)',
                  borderRadius: '3px',
                  fontSize: '0.78rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'var(--stamp-green-bg)',
                  border: '1px solid var(--stamp-green)',
                  color: 'var(--stamp-green)',
                  borderRadius: '3px',
                  fontSize: '0.78rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Tokens to redeem input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="vintage-label" style={{ margin: 0 }}>
                  Tokens to Redeem (Min: {MIN_REDEEM_TOKENS} / Max: {tokenStats.balance}) *
                </label>
                <span style={{ fontSize: '0.74rem', color: 'var(--brass-dark)', fontWeight: 700 }}>
                  1 Token = ₹{TOKEN_RUPEE_RATE}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min={MIN_REDEEM_TOKENS}
                  max={Math.max(MIN_REDEEM_TOKENS, tokenStats.balance)}
                  value={tokensToRedeem}
                  onChange={(e) => setTokensToRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                  className="vintage-input"
                  style={{ width: '140px', fontSize: '1rem', fontWeight: 700 }}
                  disabled={tokenStats.balance < MIN_REDEEM_TOKENS}
                />

                {/* Quick select buttons */}
                <button
                  type="button"
                  onClick={() => setTokensToRedeem(MIN_REDEEM_TOKENS)}
                  className="btn-parchment"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                  disabled={tokenStats.balance < MIN_REDEEM_TOKENS}
                >
                  {MIN_REDEEM_TOKENS} Tokens (₹{MIN_REDEEM_AMOUNT_RUPEES})
                </button>
                <button
                  type="button"
                  onClick={() => setTokensToRedeem(Math.min(500, tokenStats.balance))}
                  className="btn-parchment"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                  disabled={tokenStats.balance < 500}
                >
                  500 Tokens (₹1,000)
                </button>
                <button
                  type="button"
                  onClick={() => setTokensToRedeem(tokenStats.balance)}
                  className="btn-parchment"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                  disabled={tokenStats.balance < MIN_REDEEM_TOKENS}
                >
                  All ({tokenStats.balance} Tokens)
                </button>
              </div>

              {/* Conversion Preview Box */}
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--brass-glow)',
                  border: '1px solid var(--border-brass)',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Coins size={16} style={{ color: 'var(--brass-dark)' }} />
                  <span className="typewriter-text" style={{ fontSize: '0.76rem', color: 'var(--brass-dark)', fontWeight: 700 }}>
                    CONVERSION PAYOUT:
                  </span>
                </div>
                <div className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--stamp-green)' }}>
                  ₹{currentRupeeValue}.00 INR
                </div>
              </div>
            </div>


            {/* Payout Method */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="vintage-label">Disbursement Channel *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi')}
                  className={payoutMethod === 'upi' ? 'btn-brass' : 'btn-parchment'}
                  style={{ padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <CreditCard size={14} />
                  <span>Instant UPI ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={payoutMethod === 'bank' ? 'btn-brass' : 'btn-parchment'}
                  style={{ padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <Landmark size={14} />
                  <span>Bank NEFT/IMPS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('voucher')}
                  className={payoutMethod === 'voucher' ? 'btn-brass' : 'btn-parchment'}
                  style={{ padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <Gift size={14} />
                  <span>Gift Voucher</span>
                </button>
              </div>
            </div>

            {/* Recipient Details */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="vintage-label">
                {payoutMethod === 'upi'
                  ? 'Recipient UPI ID (VPA) *'
                  : payoutMethod === 'bank'
                  ? 'Bank Account & IFSC Code *'
                  : 'Voucher Delivery Email / Phone *'}
              </label>
              <input
                type="text"
                required
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder={
                  payoutMethod === 'upi'
                    ? 'e.g. username@okhdfcbank or 9876543210@paytm'
                    : payoutMethod === 'bank'
                    ? 'e.g. A/C: 9182371923, IFSC: HDFC0001234'
                    : 'e.g. employee@company.com'
                }
                className="vintage-input"
                disabled={tokenStats.balance <= 0}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: '0.2rem', display: 'block' }}>
                Your payout requisition will be reviewed and disbursed by the Bureau Administrator.
              </span>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  playTypewriterClick();
                  onClose();
                }}
                className="btn-parchment"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-brass"
                disabled={tokenStats.balance < MIN_REDEEM_TOKENS || tokensToRedeem < MIN_REDEEM_TOKENS}
                style={{ padding: '0.55rem 1.25rem' }}
              >
                <Stamp size={15} />
                <span>
                  {tokenStats.balance < MIN_REDEEM_TOKENS
                    ? `Min. ${MIN_REDEEM_TOKENS} Tokens (₹${MIN_REDEEM_AMOUNT_RUPEES}) Required`
                    : `Stamp Requisition & Claim ₹${currentRupeeValue}`}
                </span>
              </button>

            </div>
          </div>
        </form>

        {/* Past Claims Requisitions Table */}
        <div>
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--ink-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Past Requisitions Ledger ({myClaims.length})</span>
            <span>AUDITED DISBURSEMENTS</span>
          </div>

          {myClaims.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--border-sepia-dark)',
                      textAlign: 'left',
                      backgroundColor: 'var(--bg-parchment)',
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    <th style={{ padding: '0.5rem' }}>CLAIM №</th>
                    <th style={{ padding: '0.5rem' }}>DATE</th>
                    <th style={{ padding: '0.5rem' }}>TOKENS</th>
                    <th style={{ padding: '0.5rem' }}>AMOUNT</th>
                    <th style={{ padding: '0.5rem' }}>DETAILS</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {myClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      style={{
                        borderBottom: '1px solid var(--border-sepia)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>
                        № {claim.claimNumber}
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--ink-muted)' }}>
                        {new Date(claim.requestedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {claim.tokensRedeemed} Tokens
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--stamp-green)' }}>
                        ₹{claim.rupeeAmount}.00
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--ink-secondary)' }}>
                        <span style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700, marginRight: '0.3rem' }}>
                          [{claim.payoutMethod}]
                        </span>
                        {claim.payoutDetails}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '2px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor:
                              claim.status === 'approved'
                                ? 'var(--stamp-green-bg)'
                                : claim.status === 'rejected'
                                ? 'var(--stamp-red-bg)'
                                : 'var(--brass-glow)',
                            color:
                              claim.status === 'approved'
                                ? 'var(--stamp-green)'
                                : claim.status === 'rejected'
                                ? 'var(--stamp-red)'
                                : 'var(--brass-dark)',
                            border: `1px solid ${
                              claim.status === 'approved'
                                ? 'var(--stamp-green)'
                                : claim.status === 'rejected'
                                ? 'var(--stamp-red)'
                                : 'var(--border-brass)'
                            }`,
                          }}
                        >
                          {claim.status === 'approved' ? 'PAID & APPROVED' : claim.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: '1.25rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-parchment)',
                border: '1px dashed var(--border-sepia)',
                borderRadius: '3px',
                fontSize: '0.78rem',
                color: 'var(--ink-muted)',
              }}
            >
              No past reward claims submitted yet. Complete daily tasks to earn tokens!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
