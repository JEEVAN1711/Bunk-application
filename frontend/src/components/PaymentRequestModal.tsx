import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { Customer } from '../types';
import { db } from '../db/db';
import { BellRing, X, Send, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCustomer?: Customer;
}

export const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({
  isOpen,
  onClose,
  targetCustomer
}) => {
  const { sendPaymentRequest } = useDuty();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.customers.filter(c => c.active && c.currentBalance > 0).toArray().then(custs => {
        setCustomers(custs);
        if (targetCustomer) {
          setSelectedCustomerId(targetCustomer.id);
          setAmount(targetCustomer.currentBalance.toString());
          setMessage(`Dear ${targetCustomer.name}, please clear your outstanding fuel credit balance of ₹${targetCustomer.currentBalance.toFixed(2)} at the earliest.`);
        } else if (custs.length > 0) {
          setSelectedCustomerId(custs[0].id);
          setAmount(custs[0].currentBalance.toString());
          setMessage(`Dear ${custs[0].name}, please clear your outstanding fuel credit balance of ₹${custs[0].currentBalance.toFixed(2)} at the earliest.`);
        }
      });
    }
  }, [isOpen, targetCustomer]);

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const matched = customers.find(c => c.id === id);
    if (matched) {
      setAmount(matched.currentBalance.toString());
      setMessage(`Dear ${matched.name}, please clear your outstanding fuel credit balance of ₹${matched.currentBalance.toFixed(2)} at the earliest.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount) return;

    setIsSubmitting(true);
    try {
      await sendPaymentRequest(selectedCustomerId, parseFloat(amount), message);

      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 }
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Send Payment Reminder Request</h3>
              <p className="text-xs text-slate-400">Admin-exclusive alert for outstanding balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Customer with Outstanding Balance
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => handleCustomerChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — Due: ₹{c.currentBalance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Requested Amount (₹)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-amber-400 font-mono-numbers focus:outline-none focus:border-amber-500 pl-8"
              />
              <span className="absolute left-3 top-3 text-xs text-slate-500 font-medium">₹</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Message / Note
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending...' : 'Transmit Payment Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
