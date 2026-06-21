import { useAuth } from '../contexts/AuthContext';
import { API } from '../utils/api';

export default function DevTools() {
    const { login } = useAuth();

    const handleLogin = async (role) => {
        try {
            const data = await API.post('/api/auth/dev-login', { role });
            if (data.token) {
                API.setToken(data.token);
                login(data.user);
            } else {
                alert('Dev Login Failed: ' + (data.error || 'Unknown'));
            }
        } catch (e) {
            console.error(e);
            alert('Network Error');
        }
    };

    return (
        <div style={{ display: 'flex', gap: '4px', marginLeft: '10px' }} title="Dev Tools">
            <button onClick={() => handleLogin('admin')} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}>ADM</button>
            <button onClick={() => handleLogin('moderator')} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}>MOD</button>
            <button onClick={() => handleLogin('user')} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}>USR</button>
        </div>
    );
}
