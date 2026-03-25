import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PresentView } from '../components/PresentView';
import { getPresentation as getPresentationFirestore } from '../lib/firestoreStorage';
import type { Presentation } from '../types/presentation';

export function Present() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!id || !userId) return;
    setLoading(true);
    getPresentationFirestore(id, userId)
      .then((p) => {
        if (p && p.slides.length) setPresentation(p);
        else navigate(`/view/${id}`, { replace: true });
      })
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, userId, navigate]);

  if (loading || !presentation) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <PresentView
      presentation={presentation}
      currentIndex={slideIndex}
      onPrev={() => setSlideIndex((i) => Math.max(0, i - 1))}
      onNext={() => setSlideIndex((i) => Math.min(presentation.slides.length - 1, i + 1))}
      onExit={() => navigate(`/view/${presentation.id}`)}
    />
  );
}
