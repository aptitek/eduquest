import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="glass-panel glass-panel-hover max-w-lg p-8 rounded-2xl text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 mb-4">
          EduQuest Monorepo 🎮
        </h1>
        <p className="text-zinc-300 mb-6">
          Votre LMS gamifié est en cours de création. La structure du monorepo est initialisée avec succès avec Vite, React, Hono et Tailwind CSS v4.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
          Prêt pour le développement
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
