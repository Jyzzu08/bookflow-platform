import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { apiRequest } from './lib/api';
import { useSession } from './lib/session';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { username: string; role: string };
};

type Book = { id: number; title: string; cover: string; id_user: string };

function LoginPage() {
  const navigate = useNavigate();
  const { session, save } = useSession();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  if (session) {
    return <Navigate to="/home" replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const result = await apiRequest<LoginResponse>('/v2/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      save({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        username: result.user.username,
        role: result.user.role
      });
      navigate('/home');
    } catch {
      setError('Credenciales invalidas');
    }
  };

  return (
    <div className="card">
      <h1>BookFlow Platform</h1>
      <p>Public app login</p>
      <form onSubmit={submit}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        <button type="submit">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function HomePage() {
  const { session, clear } = useSession();
  const [books, setBooks] = useState<Book[]>([]);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const loadBooks = async () => {
    const data = await apiRequest<{ items: Book[] }>('/v2/catalog/books');
    setBooks(data.items || []);
  };

  const logout = async () => {
    await apiRequest('/v2/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken })
    }).catch(() => undefined);
    clear();
  };

  return (
    <div className="layout">
      <header>
        <h2>Welcome {session.username}</h2>
        <p>Role: {session.role}</p>
      </header>
      <div className="actions">
        <button onClick={loadBooks}>Load Catalog</button>
        <button onClick={logout}>Logout</button>
      </div>
      <ul>
        {books.map((book) => <li key={book.id}>{book.title}</li>)}
      </ul>
    </div>
  );
}

function AdminPage() {
  const { session } = useSession();
  if (!session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="card">
      <h2>Admin Console</h2>
      <p>Operational dashboard placeholder for BookFlow.</p>
      <p>User: {session.username}</p>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
