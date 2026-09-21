import React, { useState } from 'react';
import { useAgency } from '../../context/AgencyContext';
import {
  Fuel,
  Building2,
  Plus,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Hash,
  Sparkles,
  ArrowLeft,
  Store
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AgencySelectPage: React.FC = () => {
  const { allAgencies, selectAgency, createAgency } = useAgency();
  const [showCreateForm, setShowCreateForm] = useState(allAgencies.length === 0);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !ownerName.trim() || !phone.trim()) return;
    setCreating(true);
    try {
      await createAgency({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
      });
      try {
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.5 } });
      } catch {}
    } finally {
      setCreating(false);
    }
  };

  const handleSelectAgency = (id: string) => {
    selectAgency(id);
  };

  const autoGenerateCode = (agencyName: string) => {
    const words = agencyName.trim().split(/\s+/);
    let generated = '';
    if (words.length >= 2) {
      generated = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      generated = words[0].slice(0, 2).toUpperCase();
    }
    generated += '-' + String(Math.floor(Math.random() * 900) + 100);
    return generated;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 40%, #ecfdf5 100%)' }}
    >
      {/* Subtle decorative blurs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6ee7b7 0%, transparent 70%)' }}
      ></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #99f6e4 0%, transparent 70%)' }}
      ></div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}
            >
              <Fuel className="w-7 h-7" style={{ color: '#ffffff' }} />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0f172a' }}>BUNK PRO</h1>
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#059669' }}>
                Fuel Station Management
              </p>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: '#64748b' }}>
            {showCreateForm && allAgencies.length === 0
              ? 'Create your first agency to get started'
              : 'Select your agency to continue'}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl overflow-hidden shadow-xl"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 60px -15px rgba(0,0,0,0.08), 0 4px 20px -5px rgba(16,185,129,0.08)'
          }}
        >

          {/* === EXISTING AGENCIES LIST === */}
          {!showCreateForm && allAgencies.length > 0 && (
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#0f172a' }}>
                  <Building2 className="w-5 h-5" style={{ color: '#059669' }} />
                  Your Agencies
                </h2>
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0' }}
                >
                  {allAgencies.length} registered
                </span>
              </div>

              <div className="grid gap-3">
                {allAgencies.map((agency, i) => (
                  <button
                    key={agency.id}
                    onClick={() => handleSelectAgency(agency.id)}
                    className="group w-full text-left p-4 rounded-2xl transition-all duration-200 focus:outline-none"
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#6ee7b7';
                      e.currentTarget.style.boxShadow = '0 4px 20px -5px rgba(16,185,129,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Agency Icon */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #d1fae5, #ccfbf1)', border: '1px solid #a7f3d0' }}
                      >
                        <Store className="w-6 h-6" style={{ color: '#059669' }} />
                      </div>

                      {/* Agency Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold truncate" style={{ color: '#0f172a' }}>
                            {agency.name}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ color: '#059669', background: '#d1fae5', border: '1px solid #a7f3d0' }}
                          >
                            {agency.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {agency.ownerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {agency.phone}
                          </span>
                        </div>
                        {agency.address && (
                          <p className="text-[11px] mt-1 flex items-center gap-1 truncate" style={{ color: '#94a3b8' }}>
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {agency.address}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 flex-shrink-0 transition-colors" style={{ color: '#cbd5e1' }} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Create New Button */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all duration-200 group"
                style={{
                  border: '2px dashed #cbd5e1',
                  color: '#64748b',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6ee7b7';
                  e.currentTarget.style.color = '#059669';
                  e.currentTarget.style.background = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium text-sm">Create New Agency</span>
              </button>
            </div>
          )}

          {/* === CREATE NEW AGENCY FORM === */}
          {(showCreateForm || allAgencies.length === 0) && (
            <div className="p-6 sm:p-8">
              {allAgencies.length > 0 && (
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex items-center gap-1.5 text-sm transition-colors mb-5 group"
                  style={{ color: '#64748b' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to agencies
                </button>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #d1fae5, #ccfbf1)', border: '1px solid #a7f3d0' }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: '#059669' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#0f172a' }}>
                    {allAgencies.length === 0 ? 'Setup Your Agency' : 'New Agency'}
                  </h2>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Register your fuel station</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Agency Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: '#334155' }}
                  >
                    Agency / Station Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!code) setCode(autoGenerateCode(e.target.value));
                      }}
                      placeholder="e.g. Bharat Petroleum - Anna Nagar"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                    />
                  </div>
                </div>

                {/* Code */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: '#334155' }}
                  >
                    Short Code *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. BP-AN01"
                      required
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono uppercase transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                    />
                  </div>
                </div>

                {/* Owner Name + Phone Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: '#334155' }}
                    >
                      Owner Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Full name"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: '#334155' }}
                    >
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Address (optional) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: '#334155' }}
                  >
                    Address <span style={{ color: '#94a3b8' }} className="normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: '#94a3b8' }} />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Station address..."
                      rows={2}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={creating || !name.trim() || !code.trim() || !ownerName.trim() || !phone.trim()}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #0d9488)',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px -6px rgba(16,185,129,0.35)',
                  }}
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }}></div>
                      Creating Agency...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {allAgencies.length === 0 ? 'Create Agency & Setup Admin' : 'Create Agency'}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] mt-6" style={{ color: '#94a3b8' }}>
          BUNK PRO v1.0 • Offline-First Fuel Station Management
        </p>
      </div>
    </div>
  );
};
