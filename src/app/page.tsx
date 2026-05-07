'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PoemViewer from '@/components/PoemViewer';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import ganjoorApi from '@/api/GanjoorApi';
import customApi from '@/api/CustomApi';
import echolaliaApi from '@/api/EcholaliaApi';
import { Poem } from '@/types/poem';
import { Poet, isValidPoetSlug } from '@/types/poet';
import { useSettings } from '@/context/SettingsContext';
import { logger } from '@/utils/logger';
import { FaRandom, FaSearch } from 'react-icons/fa';

const INITIAL_POEMS_COUNT = 3;
const PREFETCH_THRESHOLD = 2;
const BATCH_SIZE = 2;
const RANDOM_POET_SELECTION_COUNT = 12;

const getPoetKey = (poet: Pick<Poet, 'source' | 'urlSlug' | 'fullUrl' | 'id'>) => {
    const source = poet.source || 'ganjoor';
    const slug = poet.urlSlug || poet.fullUrl.replace(/^\/+/, '') || String(poet.id);
    return `${source}:${slug}`;
};

const getPoemPoetKey = (poem: Poem) => {
    const source = poem.source || (poem.isCustom ? 'custom' : 'ganjoor');
    return `${source}:${poem.poetSlug}`;
};

const getPoetDisplayName = (poet: Poet) => poet.nickname || poet.name;

function FeedPoetDialog({
    poets,
    selectedKeys,
    onSave,
    onClose,
}: {
    poets: Poet[];
    selectedKeys: string[];
    onSave: (keys: string[]) => void;
    onClose: () => void;
}) {
    const [pendingKeys, setPendingKeys] = useState<string[]>(selectedKeys);
    const [activeGroupName, setActiveGroupName] = useState('همه');
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const pendingKeySet = useMemo(() => new Set(pendingKeys), [pendingKeys]);

    useEffect(() => {
        setPendingKeys(selectedKeys);
    }, [selectedKeys]);

    const groupedPoets = useMemo(() => {
        return poets.reduce<Record<string, Poet[]>>((groups, poet) => {
            const groupName =
                poet.source === 'echolalia'
                    ? 'اکولالیا'
                    : poet.source === 'custom'
                        ? 'شاعران محلی'
                        : 'گنجور';
            groups[groupName] = groups[groupName] || [];
            groups[groupName].push(poet);
            return groups;
        }, {});
    }, [poets]);
    const groupNames = useMemo(
        () => ['همه', ...Object.keys(groupedPoets)],
        [groupedPoets],
    );
    const visiblePoets = useMemo(() => {
        const sourcePoets =
            activeGroupName === 'همه'
                ? poets
                : groupedPoets[activeGroupName] || [];
        const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('fa');

        if (!normalizedSearchTerm) {
            return sourcePoets;
        }

        return sourcePoets.filter((poet) => {
            return [
                poet.name,
                poet.nickname || '',
                poet.urlSlug,
                poet.sourceGroupName || '',
            ].some((value) =>
                value.toLocaleLowerCase('fa').includes(normalizedSearchTerm),
            );
        });
    }, [activeGroupName, groupedPoets, poets, searchTerm]);

    const togglePoet = (key: string) => {
        setPendingKeys((currentKeys) =>
            currentKeys.includes(key)
                ? currentKeys.filter((currentKey) => currentKey !== key)
                : [...currentKeys, key],
        );
    };

    const selectRandomPoets = () => {
        const candidates = visiblePoets.length > 0 ? visiblePoets : poets;
        const shuffledKeys = candidates
            .map(getPoetKey)
            .sort(() => Math.random() - 0.5);
        setPendingKeys(shuffledKeys.slice(0, RANDOM_POET_SELECTION_COUNT));
    };

    return (
        <div className="settings-backdrop" dir="rtl">
            <div className="settings-dialog">
                <section
                    className="settings-panel max-w-3xl text-right"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="feed-poets-title"
                >
                    <header className="settings-header">
                        <h2 id="feed-poets-title" className="settings-title">
                            شاعرهای خوراکت را انتخاب کن
                        </h2>
                        <button
                            type="button"
                            className="settings-close"
                            onClick={onClose}
                            aria-label="بستن"
                        >
                            ×
                        </button>
                    </header>
                    <div className="settings-body">
                        <div className="settings-form">
                            <section className="settings-section">
                                <form
                                    className="feed-poet-toolbar"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        setSearchTerm(searchInput);
                                    }}
                                >
                                    <label className="feed-poet-search">
                                        <input
                                            value={searchInput}
                                            onChange={(event) =>
                                                setSearchInput(event.target.value)
                                            }
                                            placeholder="جستجوی شاعر"
                                        />
                                        <button type="submit" aria-label="جستجو">
                                            <FaSearch />
                                        </button>
                                    </label>
                                    <button
                                        type="button"
                                        className="settings-action-button secondary feed-poet-random"
                                        onClick={selectRandomPoets}
                                    >
                                        <FaRandom />
                                        تصادفی
                                    </button>
                                </form>
                                <div className="feed-poet-tabs" role="tablist">
                                    {groupNames.map((groupName) => (
                                        <button
                                            type="button"
                                            key={groupName}
                                            className={`feed-poet-tab${activeGroupName === groupName ? ' active' : ''}`}
                                            onClick={() => setActiveGroupName(groupName)}
                                            role="tab"
                                            aria-selected={activeGroupName === groupName}
                                        >
                                            {groupName}
                                        </button>
                                    ))}
                                </div>
                                <div className="feed-poet-grid">
                                    {visiblePoets.map((poet) => {
                                        const key = getPoetKey(poet);
                                        const isSelected = pendingKeySet.has(key);
                                        return (
                                            <button
                                                type="button"
                                                key={key}
                                                className={`feed-poet-option${isSelected ? ' active' : ''}`}
                                                onClick={() => togglePoet(key)}
                                                aria-pressed={isSelected}
                                            >
                                                {getPoetDisplayName(poet)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                    <footer className="settings-actions">
                        <button
                            type="button"
                            className="settings-action-button secondary"
                            onClick={() => setPendingKeys(poets.map(getPoetKey))}
                        >
                            انتخاب همه
                        </button>
                        <button
                            type="button"
                            className="settings-action-button secondary"
                            onClick={() => setPendingKeys([])}
                        >
                            پاک کردن
                        </button>
                        <button
                            type="button"
                            className="settings-action-button primary"
                            disabled={pendingKeys.length === 0}
                            onClick={() => onSave(pendingKeys)}
                        >
                            شروع
                        </button>
                    </footer>
                </section>
            </div>
        </div>
    );
}

export default function Home() {
    const {
        settings,
        setFollowedPoetKeys,
        followPoet,
        unfollowPoet,
        setHasSeenFeedPoetDialog,
    } = useSettings();
    const [poems, setPoems] = useState<Poem[]>([]);
    const [availablePoets, setAvailablePoets] = useState<Poet[]>([]);
    const [isLoadingPoets, setIsLoadingPoets] = useState(true);
    const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [isFeedDialogOpen, setIsFeedDialogOpen] = useState(false);

    const poetByKey = useMemo(() => {
        return new Map(availablePoets.map((poet) => [getPoetKey(poet), poet]));
    }, [availablePoets]);

    const effectiveFollowedPoetKeys = useMemo(() => {
        if (settings.followedPoetKeys.length > 0) {
            return settings.followedPoetKeys;
        }

        return availablePoets.map(getPoetKey);
    }, [availablePoets, settings.followedPoetKeys]);

    const followedPoets = useMemo(() => {
        return effectiveFollowedPoetKeys
            .map((key) => poetByKey.get(key))
            .filter((poet): poet is Poet => Boolean(poet));
    }, [effectiveFollowedPoetKeys, poetByKey]);

    const followedKeySignature = effectiveFollowedPoetKeys.join('|');
    const currentPoem = poems[currentPoemIndex];
    const currentPoetKey = currentPoem ? getPoemPoetKey(currentPoem) : '';
    const isCurrentPoetFollowed =
        Boolean(currentPoetKey) && effectiveFollowedPoetKeys.includes(currentPoetKey);

    useEffect(() => {
        setIsSettingsHydrated(true);
    }, []);

    useEffect(() => {
        const loadPoets = async () => {
            try {
                setIsLoadingPoets(true);
                const [ganjoorPoets, customPoets, modernPoets] = await Promise.all([
                    ganjoorApi.getPoets(),
                    customApi.getPoets(),
                    echolaliaApi.getPoets(),
                ]);
                const poets = [...ganjoorPoets, ...customPoets, ...modernPoets]
                    .filter((poet) => poet.published)
                    .sort((a, b) => getPoetDisplayName(a).localeCompare(getPoetDisplayName(b), 'fa'));
                setAvailablePoets(poets);
                if (!settings.hasSeenFeedPoetDialog && settings.followedPoetKeys.length === 0) {
                    setFollowedPoetKeys(poets.map(getPoetKey));
                }
            } catch (err) {
                logger.error('Failed to load feed poets:', err);
                setError('متأسفانه در بارگیری فهرست شاعرها مشکلی پیش آمد.');
            } finally {
                setIsLoadingPoets(false);
            }
        };

        loadPoets();
    }, [setFollowedPoetKeys, settings.followedPoetKeys.length, settings.hasSeenFeedPoetDialog]);

    const fetchRandomPoemFromFollowedPoet = useCallback(async () => {
        if (followedPoets.length === 0) {
            throw new Error('No followed poets selected');
        }

        const poet = followedPoets[Math.floor(Math.random() * followedPoets.length)];
        const source = poet.source || 'ganjoor';

        if (source === 'custom') {
            if (!isValidPoetSlug(poet.urlSlug)) {
                throw new Error(`Unsupported custom poet: ${poet.urlSlug}`);
            }
            return customApi.getRandomPoem(poet.urlSlug);
        }

        if (source === 'echolalia') {
            return echolaliaApi.getRandomPoemByPoetSlug(poet.urlSlug);
        }

        const randomPoem = await ganjoorApi.getRandomPoemByPoet(poet.urlSlug);
        return ganjoorApi.getPoemById(randomPoem.id);
    }, [followedPoets]);

    const fetchPoemBatch = useCallback(async (count: number) => {
        const fetchedPoems: Poem[] = [];

        for (let i = 0; i < count; i++) {
            try {
                const poem = await fetchRandomPoemFromFollowedPoet();
                fetchedPoems.push(poem);
            } catch (err) {
                logger.error('Error fetching feed poem:', err);
            }
        }

        return fetchedPoems;
    }, [fetchRandomPoemFromFollowedPoet]);

    const fetchInitialPoems = useCallback(async () => {
        if (followedPoets.length === 0) {
            setPoems([]);
            setCurrentPoemIndex(0);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const fetchedPoems = await fetchPoemBatch(INITIAL_POEMS_COUNT);

            if (fetchedPoems.length > 0) {
                setPoems(fetchedPoems);
                setCurrentPoemIndex(0);
            } else {
                throw new Error('Could not fetch any poems');
            }
        } catch (err) {
            logger.error('Failed to fetch initial poems:', err);
            setError('متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
        } finally {
            setLoading(false);
        }
    }, [fetchPoemBatch, followedPoets.length]);

    useEffect(() => {
        if (isLoadingPoets || isFeedDialogOpen) {
            setLoading(false);
            return;
        }

        fetchInitialPoems();
    }, [fetchInitialPoems, followedKeySignature, isFeedDialogOpen, isLoadingPoets]);

    useEffect(() => {
        const shouldFetchMore = currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
            poems.length > 0 &&
            !isFetchingMore &&
            followedPoets.length > 0;

        if (shouldFetchMore) {
            const fetchMorePoems = async () => {
                try {
                    setIsFetchingMore(true);
                    const newPoems = await fetchPoemBatch(BATCH_SIZE);

                    if (newPoems.length > 0) {
                        setPoems((prevPoems) => [...prevPoems, ...newPoems]);
                    }
                } catch (err) {
                    logger.error('Failed to fetch more poems:', err);
                } finally {
                    setIsFetchingMore(false);
                }
            };

            fetchMorePoems();
        }
    }, [
        currentPoemIndex,
        poems.length,
        isFetchingMore,
        followedPoets.length,
        fetchPoemBatch,
    ]);

    const handleSaveFeedPoets = (keys: string[]) => {
        setFollowedPoetKeys(keys);
        setHasSeenFeedPoetDialog(true);
        setIsFeedDialogOpen(false);
    };

    const handleToggleCurrentPoetFollow = () => {
        if (!currentPoetKey) return;

        if (effectiveFollowedPoetKeys.includes(currentPoetKey)) {
            unfollowPoet(currentPoetKey);
        } else {
            followPoet(currentPoetKey);
        }
        setHasSeenFeedPoetDialog(true);
    };

    const handleNext = () => {
        setCurrentPoemIndex((prevIndex) =>
            Math.min(prevIndex + 1, Math.max(poems.length - 1, 0)),
        );
    };

    const handlePrevious = () => {
        if (currentPoemIndex > 0) {
            setCurrentPoemIndex((prevIndex) => prevIndex - 1);
        }
    };

    if (isLoadingPoets || loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen message={error} onRetry={fetchInitialPoems} />;
    }

    return (
        <main className="h-screen overflow-hidden">
            {isFeedDialogOpen && (
                <FeedPoetDialog
                    poets={availablePoets}
                    selectedKeys={effectiveFollowedPoetKeys}
                    onSave={handleSaveFeedPoets}
                    onClose={() => setIsFeedDialogOpen(false)}
                />
            )}
            {currentPoem && (
                <PoemViewer
                    poem={currentPoem}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    isFirst={currentPoemIndex === 0}
                    isLast={currentPoemIndex === poems.length - 1}
                    isModern={currentPoem.source !== 'ganjoor'}
                    isPoetFollowed={isCurrentPoetFollowed}
                    onTogglePoetFollow={handleToggleCurrentPoetFollow}
                    onOpenFeed={() => setIsFeedDialogOpen(true)}
                />
            )}
        </main>
    );
}
