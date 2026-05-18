import { useState, useEffect } from 'react';
import api from '../api';

const CITIES = ['Hyderabad','Mumbai','Delhi','London','New York','Berlin','Tokyo','Sydney','Lagos','Sao Paulo','Other'];

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [city, setCity] = useState('Hyderabad');

  useEffect(() => {
    api.get('/user/stats').then(res => {
      if (!res.data.onboarding_done) setShow(true);
    }).catch(() => {});
  }, []);

  const finish = async () => {
    await api.put('/user/profile', { city, country: 'India', units: 'kg' }).catch(() => {});
    await api.put('/user/onboarding').catch(() => {});
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full pop-in">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌿</div>
          <div className="flex justify-center gap-2 mb-4">
            {[1,2,3].map(s => (
              <div key={s} className={`h-2 w-8 rounded-full transition-all ${s <= step ? 'bg-green-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Welcome to EcoNudge! 👋</h2>
            <p className="text-gray-600 mb-4">Set your city for accurate emissions comparisons.</p>
            <select value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-green-400">
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700">Next →</button>
              <button onClick={() => setStep(2)} className="text-gray-400 text-sm hover:text-gray-600">Skip</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Log Your First Activity 📊</h2>
            <p className="text-gray-600 mb-4">Head to "My Footprint" to log what you do daily — travel, food, energy, shopping. See your carbon impact instantly.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700">Next →</button>
              <button onClick={() => setStep(3)} className="text-gray-400 text-sm hover:text-gray-600">Skip</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Complete Tasks & Earn Points! 🏆</h2>
            <p className="text-gray-600 mb-4">Visit "Take Action" to complete eco-friendly challenges and climb the leaderboard. Every small action counts!</p>
            <button onClick={finish} className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700">Let's Go! 🚀</button>
          </>
        )}
      </div>
    </div>
  );
}
