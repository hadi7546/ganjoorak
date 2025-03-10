import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PoemViewer from './components/PoemViewer';
import ganjoorApi from './api/GanjoorApi';
import type { Poem } from './types/poem';
import './App.css';

function PoemPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [poem, setPoem] = React.useState<Poem | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const loadPoem = async () => {
            try {
                let loadedPoem: Poem;
                if (id) {
                    loadedPoem = await ganjoorApi.getPoemById(parseInt(id));
                } else {
                    loadedPoem = await ganjoorApi.getRandomPoem();
                    navigate(`/${loadedPoem.id}`);
                }
                setPoem(loadedPoem);
                setError(null);
            } catch (err) {
                console.error('Error loading poem:', err);
                setError(err instanceof Error ? err.message : 'خطا در بارگیری شعر');
            }
        };

        loadPoem();
    }, [id, navigate]);

    const handleNext = async () => {
        try {
            const newPoem = await ganjoorApi.getRandomPoem();
            navigate(`/${newPoem.id}`);
        } catch (err) {
            console.error('Error loading next poem:', err);
            setError(err instanceof Error ? err.message : 'خطا در بارگیری شعر بعدی');
        }
    };

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">{error}</div>
                <div className="error-actions">
                    <button className="retry-button" onClick={handleNext}>
                        نمایش یک شعر تصادفی
                    </button>
                </div>
            </div>
        );
    }

    return poem ? (
        <AnimatePresence mode="wait">
            <PoemViewer
                key={poem.id}
                poem={poem}
                onNext={handleNext}
                onPrevious={() => {}}
                isFirst={true}
                isLast={true}
            />
        </AnimatePresence>
    ) : (
        <div className="loading">در حال بارگیری...</div>
    );
}

function App() {
    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/:id" element={<PoemPage />} />
                    <Route path="/" element={<PoemPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
