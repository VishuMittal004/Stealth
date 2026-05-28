import { useState } from 'react';
import api from '../api/client';

export default function Login({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/verify-pin', { pin });
      localStorage.setItem('coach_token', data.token);
      onUnlock();
    } catch (err) {
      setError(err.response?.data?.message || 'PIN failed');
    }
  }

  return (
    <main className="app-shell screen">
      <form className="card screen" onSubmit={submit}>
        <p className="label">Locked</p>
        <h1>Enter PIN</h1>
        <input className="input mono" type="password" inputMode="numeric" maxLength="4" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" />
        {error && <p className="danger">{error}</p>}
        <button className="button" disabled={pin.length !== 4}>Unlock</button>
      </form>
    </main>
  );
}
