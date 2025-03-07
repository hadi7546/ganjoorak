import React, { useState, useEffect } from 'react';
import PoemViewer from './components/PoemViewer';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import ganjoorApi from './api/ganjoorApi';
import './styles/App.css';

function App() {
    const [poems, setPoems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPoemIndex, setCurrentPoemIndex] = useState(0);

    // Fetch initial poems
    useEffect(() => {
        const fetchInitialPoems = async () => {
            try {
                setLoading(true);
                // Fetch 5 random poems to start with
                const poemPromises = Array(5).fill().map(() => ganjoorApi.getRandomPoem());
                const fetchedPoems = await Promise.all(poemPromises);
                setPoems(fetchedPoems);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch initial poems:', err);
                setError('Failed to load poems. Please try again later.');
                setLoading(false);
            }
        };

        fetchInitialPoems();
    }, []);

    // Fetch more poems when user is close to the end of the current list
    useEffect(() => {
        if (currentPoemIndex >= poems.length - 2 && poems.length > 0) {
            const fetchMorePoems = async () => {
                try {
                    // Fetch 3 more random poems
                    const poemPromises = Array(3).fill().map(() => ganjoorApi.getRandomPoem());
                    const newPoems = await Promise.all(poemPromises);
                    setPoems(prevPoems => [...prevPoems, ...newPoems]);
                } catch (err) {
                    console.error('Failed to fetch more poems:', err);
                }
            };

            fetchMorePoems();
        }
    }, [currentPoemIndex, poems.length]);

    const handleNext = () => {
        setCurrentPoemIndex(prevIndex => prevIndex + 1);
    };

    const handlePrevious = () => {
        if (currentPoemIndex > 0) {
            setCurrentPoemIndex(prevIndex => prevIndex - 1);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen message={error} />;
    }

    return (
        <div className="app">
            {poems.length > 0 && (
                <PoemViewer
                    poem={poems[currentPoemIndex]}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    isFirst={currentPoemIndex === 0}
                    isLast={currentPoemIndex === poems.length - 1}
                />
            )}
        </div>
    );
}

export default App;