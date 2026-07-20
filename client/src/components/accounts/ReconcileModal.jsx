import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { MASK_PLACEHOLDER } from '../../lib/mask';

const ReconcileModal = ({ isOpen, onClose, account, onReconciled }) => {
  const { masked } = usePrivacy();
  const [actualBalance, setActualBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!account) return null;

  const formatCurrency = (amount) => {
    if (masked) return MASK_PLACEHOLDER;
    const safe = (amount == null || Number.isNaN(amount)) ? 0 : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setResult(null);

    try {
      const parsed = parseFloat(actualBalance);
      if (isNaN(parsed)) {
        throw new Error('Please enter a valid number');
      }

      // Call the reconcile API via the parent's handler
      const res = await onReconciled(account.id, parsed);
      setResult(res);
      
      if (res.adjustment_created) {
        // Don't close immediately — show the result first
      } else {
        // No adjustment needed — close after brief display
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to reconcile account');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setActualBalance('');
    setError('');
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reconcile Balance"
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            {result.adjustment_created ? (
              <p className="text-sm text-green-700">
                Adjustment of {formatCurrency(Math.abs(result.delta))} created.
                New balance: {formatCurrency(result.new_balance)}
              </p>
            ) : (
              <p className="text-sm text-green-700">
                Already reconciled — no adjustment needed.
              </p>
            )}
          </div>
        )}

        {!result && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Current Computed Balance
              </label>
              <p className="text-lg font-semibold text-neutral-900">
                {formatCurrency(account.balance ?? 0)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {account.name} ({account.type})
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="What's your actual balance right now?"
                type="number"
                step="0.01"
                prefix="₱"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
                required
                placeholder="0.00"
              />
              <p className="text-xs text-neutral-500 mt-1">
                For credit/lent accounts, enter the amount owed (positive number).
              </p>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  disabled={saving}
                >
                  Reconcile
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ReconcileModal;