'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { FaRandom, FaSearch, FaTimes } from 'react-icons/fa';

const INITIAL_POEMS_COUNT = 12;
const PREFETCH_THRESHOLD = 5;
const BATCH_SIZE = 6;
const POEM_FETCH_CONCURRENCY = 3;

const getPoetKey = (poet: Pick<Poet, 'source' | 'urlSlug' | 'fullUrl' | 'id'>) => {
    const source = poet.source || 'ganjoor';
    const slug = poet.urlSlug || poet.fullUrl.replace(/^\/+/, '') || String(poet.id);
    return `${source}:${slug}`;
};

const getPoetDisplayName = (poet: Poet) => poet.nickname || poet.name;
const DEFAULT_FEED_GROUP = 'گنجور';
const FEED_GROUP_ORDER = [DEFAULT_FEED_GROUP, 'اکولالیا', 'شاعران محلی'] as const;

const sampleKeys = (keys: string[], count: number) => {
    const shuffled = [...keys];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
};

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
    const [activeGroupName, setActiveGroupName] = useState(DEFAULT_FEED_GROUP);
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

    const groupNames = useMemo(() => {
        const availableGroupNames = Object.keys(groupedPoets);
        return [
            'همه',
            ...FEED_GROUP_ORDER.filter((groupName) => availableGroupNames.includes(groupName)),
        ];
    }, [groupedPoets]);

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

    const categoryGroups = useMemo(() => {
        return FEED_GROUP_ORDER
            .filter((groupName) => groupedPoets[groupName]?.length)
            .filter((groupName) => activeGroupName === 'همه' || activeGroupName === groupName)
            .map((groupName) => {
                const poetsInGroup = groupedPoets[groupName] || [];
                const selectedCount = poetsInGroup.reduce((count, poet) => (
                    count + (pendingKeySet.has(getPoetKey(poet)) ? 1 : 0)
                ), 0);

                return {
                    name: groupName,
                    poets: poetsInGroup,
                    selectedCount,
                };
            });
    }, [activeGroupName, groupedPoets, pendingKeySet]);

    const togglePoet = (key: string) => {
        setPendingKeys((currentKeys) =>
            currentKeys.includes(key)
                ? currentKeys.filter((currentKey) => currentKey !== key)
                : [...currentKeys, key],
        );
    };

    const applyRandomSelection = () => {
        const pool = visiblePoets.length > 0 ? visiblePoets : poets;
        const poolKeys = pool.map(getPoetKey);

        if (poolKeys.length === 0) {
            return;
        }

        const nextCount = Math.min(poolKeys.length, Math.max(4, Math.ceil(poolKeys.length / 4)));
        const sampledKeys = sampleKeys(poolKeys, nextCount);
        const poolKeySet = new Set(poolKeys);

        setPendingKeys((currentKeys) => [
            ...currentKeys.filter((key) => !poolKeySet.has(key)),
            ...sampledKeys,
        ]);
    };

    const selectGroup = (groupPoets: Poet[]) => {
        setPendingKeys((currentKeys) => (
            Array.from(new Set([...currentKeys, ...groupPoets.map(getPoetKey)]))
        ));
    };

    const clearGroup = (groupPoets: Poet[]) => {
        const groupKeySet = new Set(groupPoets.map(getPoetKey));
        setPendingKeys((currentKeys) => currentKeys.filter((key) => !groupKeySet.has(key)));
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
                            شاعرهای صفحه اصلی را انتخاب کن
                        </h2>
                        <button
                            type="button"
                            className="settings-close"
                            onClick={onClose}
                            aria-label="بستن"
                        >
                            <FaTimes />
                        </button>
                    </header>
                    <div className="settings-body">
                        <div className="settings-form">
                            <section className="settings-section">
                                <div className="feed-poet-summary">
                                    <span><strong>{pendingKeys.length}</strong> شاعر انتخاب شده</span>
                                    <span><strong>{visiblePoets.length}</strong> شاعر در این دسته</span>
                                </div>
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
                                        className="feed-poet-random"
                                        onClick={applyRandomSelection}
                                        aria-label="انتخاب تصادفی"
                                        title="انتخاب تصادفی"
                                    >
                                        <FaRandom />
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
                                <div className="feed-poet-category-cards">
                                    {categoryGroups.map((group) => (
                                        <section key={group.name} className="feed-poet-category-card">
                                            <header>
                                                <div>
                                                    <h3>{group.name}</h3>
                                                    <span>{group.selectedCount} از {group.poets.length}</span>
                                                </div>
                                            </header>
                                            <div className="feed-poet-category-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => selectGroup(group.poets)}
                                                >
                                                    انتخاب همه
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => clearGroup(group.poets)}
                                                >
                                                    پاک کردن
                                                </button>
                                            </div>
                                        </section>
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
                                {visiblePoets.length === 0 && (
                                    <p className="feed-poet-empty">شاعری با این جستجو پیدا نشد.</p>
                                )}
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
        isHydrated: areSettingsHydrated,
        setFollowedPoetKeys,
    } = useSettings();
    const [poems, setPoems] = useState<Poem[]>([]);
    const [availablePoets, setAvailablePoets] = useState<Poet[]>([]);
    const [isLoadingPoets, setIsLoadingPoets] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [isFeedDialogOpen, setIsFeedDialogOpen] = useState(false);
    const [shouldClearFeedQuery, setShouldClearFeedQuery] = useState(false);
    const poemsRef = useRef<Poem[]>([]);
    const currentPoemIndexRef = useRef(0);
    const feedVersionRef = useRef(0);
    const fetchMorePromiseRef = useRef<Promise<Poem[]> | null>(null);
    const loadedPoetDefaultsRef = useRef(false);

    useEffect(() => {
        poemsRef.current = poems;
    }, [poems]);

    useEffect(() => {
        currentPoemIndexRef.current = currentPoemIndex;
    }, [currentPoemIndex]);

    const poetByKey = useMemo(() => {
        return new Map(availablePoets.map((poet) => [getPoetKey(poet), poet]));
    }, [availablePoets]);

    const effectiveFollowedPoetKeys = useMemo(() => {
        if (settings.followedPoetKeys.length > 0) {
            return settings.followedPoetKeys;
        }

        return availablePoets
            .filter((poet) => (poet.source || 'ganjoor') === 'ganjoor')
            .map(getPoetKey);
    }, [availablePoets, settings.followedPoetKeys]);

    const followedPoets = useMemo(() => {
        return effectiveFollowedPoetKeys
            .map((key) => poetByKey.get(key))
            .filter((poet): poet is Poet => Boolean(poet));
    }, [effectiveFollowedPoetKeys, poetByKey]);

    const followedKeySignature = effectiveFollowedPoetKeys.join('|');
    const currentPoem = poems[currentPoemIndex];

    const clearFeedQuery = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
        }
        setShouldClearFeedQuery(false);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (new URLSearchParams(window.location.search).get('feed') === '1') {
            setIsFeedDialogOpen(true);
            setShouldClearFeedQuery(true);
        }
    }, []);

    useEffect(() => {
        if (!areSettingsHydrated || loadedPoetDefaultsRef.current) {
            return;
        }

        let isCancelled = false;

        const loadPoets = async () => {
            try {
                setIsLoadingPoets(true);
                const [ganjoorPoets, customPoets, modernPoets] = await Promise.all([
                    ganjoorApi.getPoets(),
                    customApi.getPoets(),
                    echolaliaApi.getPoets(),
                ]);

                if (isCancelled) return;

                const poets = [...ganjoorPoets, ...customPoets, ...modernPoets]
                    .filter((poet) => poet.published)
                    .sort((a, b) => getPoetDisplayName(a).localeCompare(getPoetDisplayName(b), 'fa'));
                setAvailablePoets(poets);

                if (settings.followedPoetKeys.length === 0) {
                    const defaultPoetKeys = poets
                        .filter((poet) => (poet.source || 'ganjoor') === 'ganjoor')
                        .map(getPoetKey);
                    setFollowedPoetKeys(defaultPoetKeys.length > 0 ? defaultPoetKeys : poets.map(getPoetKey));
                }

                loadedPoetDefaultsRef.current = true;
            } catch (err) {
                if (!isCancelled) {
                    logger.error('Failed to load feed poets:', err);
                    setError('متأسفانه در بارگیری فهرست شاعرها مشکلی پیش آمد.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingPoets(false);
                }
            }
        };

        loadPoets();

        return () => {
            isCancelled = true;
        };
    }, [areSettingsHydrated, setFollowedPoetKeys, settings.followedPoetKeys.length]);

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

        for (let i = 0; i < count; i += POEM_FETCH_CONCURRENCY) {
            const batchSize = Math.min(POEM_FETCH_CONCURRENCY, count - i);
            const batchResults = await Promise.allSettled(
                Array.from({ length: batchSize }, () => fetchRandomPoemFromFollowedPoet()),
            );

            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    fetchedPoems.push(result.value);
                } else {
                    logger.error('Error fetching feed poem:', result.reason);
                }
            });
        }

        return fetchedPoems;
    }, [fetchRandomPoemFromFollowedPoet]);

    const appendPoems = useCallback((newPoems: Poem[], version: number) => {
        if (newPoems.length === 0 || feedVersionRef.current !== version) {
            return;
        }

        setPoems((prevPoems) => {
            const existingIds = new Set(prevPoems.map((poem) => poem.id));
            const uniquePoems = newPoems.filter((poem) => !existingIds.has(poem.id));
            return uniquePoems.length > 0 ? [...prevPoems, ...uniquePoems] : prevPoems;
        });
    }, []);

    const fetchMorePoems = useCallback(async () => {
        if (followedPoets.length === 0) {
            return [];
        }

        if (fetchMorePromiseRef.current) {
            return fetchMorePromiseRef.current;
        }

        const version = feedVersionRef.current;
        const fetchPromise = (async () => {
            try {
                setIsFetchingMore(true);
                const newPoems = await fetchPoemBatch(BATCH_SIZE);
                appendPoems(newPoems, version);
                return feedVersionRef.current === version ? newPoems : [];
            } catch (err) {
                logger.error('Failed to fetch more poems:', err);
                return [];
            } finally {
                if (feedVersionRef.current === version) {
                    setIsFetchingMore(false);
                }
                fetchMorePromiseRef.current = null;
            }
        })();

        fetchMorePromiseRef.current = fetchPromise;
        return fetchPromise;
    }, [appendPoems, fetchPoemBatch, followedPoets.length]);

    const fetchInitialPoems = useCallback(async () => {
        const version = feedVersionRef.current + 1;
        feedVersionRef.current = version;
        fetchMorePromiseRef.current = null;
        setError(null);
        setCurrentPoemIndex(0);
        setPoems([]);

        if (followedPoets.length === 0) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const visiblePoems = await fetchPoemBatch(INITIAL_POEMS_COUNT);

            if (feedVersionRef.current !== version) {
                return;
            }

            if (visiblePoems.length > 0) {
                setPoems(visiblePoems);
                setCurrentPoemIndex(0);
            } else {
                throw new Error('Could not fetch any poems');
            }
        } catch (err) {
            if (feedVersionRef.current === version) {
                logger.error('Failed to fetch initial poems:', err);
                setError('متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
            }
        } finally {
            if (feedVersionRef.current === version) {
                setLoading(false);
            }
        }
    }, [fetchPoemBatch, followedPoets.length]);

    useEffect(() => {
        if (!areSettingsHydrated || isLoadingPoets) {
            return;
        }

        fetchInitialPoems();
    }, [areSettingsHydrated, fetchInitialPoems, followedKeySignature, isLoadingPoets]);

    useEffect(() => {
        const shouldFetchMore =
            !loading &&
            currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
            poems.length > 0 &&
            !isFetchingMore &&
            followedPoets.length > 0;

        if (shouldFetchMore) {
            fetchMorePoems();
        }
    }, [
        currentPoemIndex,
        poems.length,
        loading,
        isFetchingMore,
        followedPoets.length,
        fetchMorePoems,
    ]);

    const handleSaveFeedPoets = (keys: string[]) => {
        setFollowedPoetKeys(keys);
        setIsFeedDialogOpen(false);
        if (shouldClearFeedQuery) {
            clearFeedQuery();
        }
    };

    const handleNext = useCallback(() => {
        const nextIndex = currentPoemIndexRef.current + 1;

        if (nextIndex < poemsRef.current.length) {
            setCurrentPoemIndex(nextIndex);
            return;
        }

        fetchMorePoems().then((newPoems) => {
            if (newPoems.length > 0 && nextIndex < poemsRef.current.length) {
                setCurrentPoemIndex(nextIndex);
            }
        });
    }, [fetchMorePoems]);

    const handlePrevious = useCallback(() => {
        setCurrentPoemIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    }, []);

    if (!areSettingsHydrated || isLoadingPoets || loading) {
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
                    onClose={() => {
                        setIsFeedDialogOpen(false);
                        if (shouldClearFeedQuery) {
                            clearFeedQuery();
                        }
                    }}
                />
            )}
            {currentPoem && (
                <PoemViewer
                    poem={currentPoem}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    isFirst={currentPoemIndex === 0}
                    isLast={false}
                    isModern={currentPoem.source !== 'ganjoor'}
                    onOpenFeed={() => setIsFeedDialogOpen(true)}
                />
            )}
        </main>
    );
}
