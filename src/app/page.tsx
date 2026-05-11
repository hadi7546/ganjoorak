'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PoemFeedPager from '@/components/PoemFeedPager';
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
import poetSourceIndex from '@/data/poet-source-index.json';

const INITIAL_POEMS_COUNT = 12;
const PREFETCH_THRESHOLD = 5;
const BATCH_SIZE = 6;
const POEM_FETCH_CONCURRENCY = 3;
const FEED_CACHE_KEY = 'ganjoorak:latest-feed-poems:v2';
const FEED_CACHE_LIMIT = 8;

type CachedFeed = {
    poems: Poem[];
    savedAt: number;
};

const readCachedFeedPoems = () => {
    if (typeof window === 'undefined') {
        return [] as Poem[];
    }

    try {
        const rawCache = window.localStorage.getItem(FEED_CACHE_KEY);
        if (!rawCache) {
            return [] as Poem[];
        }

        const parsed = JSON.parse(rawCache) as Partial<CachedFeed>;
        if (!Array.isArray(parsed.poems)) {
            return [] as Poem[];
        }

        return parsed.poems.filter((poem): poem is Poem => Boolean(poem?.id && poem?.plainText));
    } catch (error) {
        logger.error('Failed to read cached feed poems:', error);
        return [] as Poem[];
    }
};

const writeCachedFeedPoems = (poems: Poem[], currentIndex: number) => {
    if (typeof window === 'undefined' || poems.length === 0) {
        return;
    }

    try {
        const currentPoem = poems[currentIndex] ?? poems[0];
        const orderedPoems = [
            currentPoem,
            ...poems.filter((poem) => poem.id !== currentPoem.id),
        ].slice(0, FEED_CACHE_LIMIT);

        window.localStorage.setItem(
            FEED_CACHE_KEY,
            JSON.stringify({ poems: orderedPoems, savedAt: Date.now() } satisfies CachedFeed),
        );
    } catch (error) {
        logger.error('Failed to cache feed poems:', error);
    }
};

const getPoetKey = (poet: Pick<Poet, 'source' | 'urlSlug' | 'fullUrl' | 'id'>) => {
    const source = poet.source || 'ganjoor';
    const slug = poet.urlSlug || poet.fullUrl.replace(/^\/+/, '') || String(poet.id);
    return `${source}:${slug}`;
};

const getPoetDisplayName = (poet: Poet) => poet.nickname || poet.name;
const DEFAULT_FEED_GROUP = 'گنجور';
const FEED_GROUP_ORDER = [DEFAULT_FEED_GROUP, 'اکولالیا', 'شاعران محلی'] as const;
type FeedPoetSource = NonNullable<Poet['source']>;
type PoetSourceIndexEntry = {
    source: 'ganjoor' | 'echolalia';
    id?: number | null;
};

const indexedPoetSources = poetSourceIndex.sourcesBySlug as Record<
    string,
    PoetSourceIndexEntry | undefined
>;

const parseFollowedPoetKey = (key: string): { source: FeedPoetSource; slug: string } | null => {
    const separatorIndex = key.indexOf(':');
    const source = separatorIndex >= 0 ? key.slice(0, separatorIndex) : 'ganjoor';
    const slug = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;

    if (!slug) {
        return null;
    }

    if (source === 'custom' || source === 'echolalia' || source === 'ganjoor') {
        return { source, slug };
    }

    return { source: 'ganjoor', slug };
};

const getIndexedGanjoorPoetId = (slug: string) => {
    const entry = indexedPoetSources[slug];
    return entry?.source === 'ganjoor' && typeof entry.id === 'number'
        ? entry.id
        : null;
};

const loadFullGanjoorPoem = async (poem: Poem) => {
    return ganjoorApi.getPoemById(poem.id);
};

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
    const [poems, setPoems] = useState<Poem[]>(() => readCachedFeedPoems());
    const [availablePoets, setAvailablePoets] = useState<Poet[]>([]);
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
    const pendingNavigationIndexRef = useRef<number | null>(null);
    const loadedPoetsRef = useRef(false);

    useEffect(() => {
        poemsRef.current = poems;
    }, [poems]);

    useEffect(() => {
        writeCachedFeedPoems(poems, currentPoemIndex);
    }, [currentPoemIndex, poems]);

    useEffect(() => {
        currentPoemIndexRef.current = currentPoemIndex;
    }, [currentPoemIndex]);

    useEffect(() => {
        if (currentPoemIndex >= poems.length && poems.length > 0) {
            setCurrentPoemIndex(poems.length - 1);
        }
    }, [currentPoemIndex, poems.length]);

    useEffect(() => {
        const pendingIndex = pendingNavigationIndexRef.current;

        if (pendingIndex === null || pendingIndex >= poems.length) {
            return;
        }

        pendingNavigationIndexRef.current = null;
        setCurrentPoemIndex(pendingIndex);
    }, [poems.length]);

    const effectiveFollowedPoetKeys = useMemo(() => {
        if (settings.followedPoetKeys.length > 0) {
            return settings.followedPoetKeys;
        }

        return availablePoets
            .filter((poet) => (poet.source || 'ganjoor') === 'ganjoor')
            .map(getPoetKey);
    }, [availablePoets, settings.followedPoetKeys]);

    const followedKeySignature = settings.followedPoetKeys.join('|');
    const currentPoem = poems[currentPoemIndex];
    const nextPoem = poems[currentPoemIndex + 1];

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
        if (!areSettingsHydrated || loadedPoetsRef.current || !currentPoem) {
            return;
        }

        let isCancelled = false;

        const loadPoets = async () => {
            try {
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

                loadedPoetsRef.current = true;
            } catch (err) {
                if (!isCancelled) {
                    logger.error('Failed to load feed poets:', err);
                }
            }
        };

        loadPoets();

        return () => {
            isCancelled = true;
        };
    }, [areSettingsHydrated, currentPoem]);

    const fetchRandomPoemFromFollowedPoet = useCallback(async () => {
        const selectedKeys = settings.followedPoetKeys;

        if (selectedKeys.length === 0) {
            const randomPoem = await ganjoorApi.getRandomPoem();
            return loadFullGanjoorPoem(randomPoem);
        }

        const selectedKey = selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
        const poet = parseFollowedPoetKey(selectedKey);

        if (!poet) {
            throw new Error('Invalid followed poet selection');
        }

        if (poet.source === 'custom') {
            if (!isValidPoetSlug(poet.slug)) {
                throw new Error(`Unsupported custom poet: ${poet.slug}`);
            }
            return customApi.getRandomPoem(poet.slug);
        }

        if (poet.source === 'echolalia') {
            return echolaliaApi.getRandomPoemByPoetSlug(poet.slug);
        }

        const poetId = getIndexedGanjoorPoetId(poet.slug);
        if (poetId) {
            const randomPoem = await ganjoorApi.getRandomPoemByPoetId(poetId);
            return loadFullGanjoorPoem(randomPoem);
        }

        const randomPoem = await ganjoorApi.getRandomPoemByPoet(poet.slug);
        return loadFullGanjoorPoem(randomPoem);
    }, [settings.followedPoetKeys]);

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
        if (fetchMorePromiseRef.current) {
            return fetchMorePromiseRef.current;
        }

        const version = feedVersionRef.current;
        const fetchPromise = (async () => {
            try {
                setIsFetchingMore(true);
                const fetchedPoems = await fetchPoemBatch(BATCH_SIZE);

                if (feedVersionRef.current !== version) {
                    return [];
                }

                const existingIds = new Set(poemsRef.current.map((poem) => poem.id));
                const uniquePoems = fetchedPoems.filter((poem) => !existingIds.has(poem.id));
                appendPoems(uniquePoems, version);
                return uniquePoems;
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
    }, [appendPoems, fetchPoemBatch]);

    const fetchInitialPoems = useCallback(async () => {
        const version = feedVersionRef.current + 1;
        feedVersionRef.current = version;
        fetchMorePromiseRef.current = null;
        pendingNavigationIndexRef.current = null;
        setError(null);
        setCurrentPoemIndex(0);

        try {
            setLoading(true);
            const firstPoem = await fetchRandomPoemFromFollowedPoet();

            if (feedVersionRef.current !== version) {
                return;
            }

            setPoems([firstPoem]);
            setCurrentPoemIndex(0);
            setLoading(false);

            fetchPoemBatch(INITIAL_POEMS_COUNT - 1)
                .then((remainingPoems) => {
                    appendPoems(remainingPoems, version);
                })
                .catch((err) => {
                    logger.error('Failed to fetch remaining initial poems:', err);
                });
        } catch (err) {
            if (feedVersionRef.current === version) {
                logger.error('Failed to fetch initial poem:', err);
                setError('متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
                setLoading(false);
            }
        }
    }, [appendPoems, fetchPoemBatch, fetchRandomPoemFromFollowedPoet]);

    useEffect(() => {
        if (!areSettingsHydrated) {
            return;
        }

        fetchInitialPoems();
    }, [areSettingsHydrated, fetchInitialPoems, followedKeySignature]);

    useEffect(() => {
        const shouldFetchMore =
            !loading &&
            currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
            poems.length > 0 &&
            !isFetchingMore;

        if (shouldFetchMore) {
            fetchMorePoems();
        }
    }, [
        currentPoemIndex,
        poems.length,
        loading,
        isFetchingMore,
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

        pendingNavigationIndexRef.current = nextIndex;
        fetchMorePoems().then((newPoems) => {
            if (newPoems.length === 0 && pendingNavigationIndexRef.current === nextIndex) {
                pendingNavigationIndexRef.current = null;
            }
        });
    }, [fetchMorePoems]);

    const handlePrevious = useCallback(() => {
        setCurrentPoemIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    }, []);

    if (!areSettingsHydrated || (!currentPoem && !error)) {
        return <LoadingScreen />;
    }

    if (error && !currentPoem) {
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
                <PoemFeedPager
                    poem={currentPoem}
                    nextPoem={nextPoem}
                    currentIndex={currentPoemIndex}
                    isFirst={currentPoemIndex === 0}
                    isPreparingNextPoem={isFetchingMore && !nextPoem}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    onOpenFeed={() => setIsFeedDialogOpen(true)}
                />
            )}
        </main>
    );
}
