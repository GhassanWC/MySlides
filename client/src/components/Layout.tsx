import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="text-xl font-bold text-indigo-700 hover:text-indigo-800">
            MySlides
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-gray-600 truncate max-w-[140px] sm:max-w-[200px]" title={user?.email}>
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} MySlides. AI-powered presentation generator.
        </div>
      </footer>
    </div>
  );
}
