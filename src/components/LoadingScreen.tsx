const shimmerLineWidths = ["w-10/12", "w-8/12", "w-11/12", "w-7/12", "w-9/12", "w-6/12"];

export default function LoadingScreen() {
    return (
        <div
            className="fixed inset-0 overflow-hidden bg-background text-foreground"
            role="status"
            aria-live="polite"
            aria-label="در حال بارگیری شعر"
        >
            <style>{`
                .loading-shimmer {
                    position: relative;
                    overflow: hidden;
                    background: rgb(var(--foreground) / 0.08);
                }

                .loading-shimmer::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    transform: translateX(100%);
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgb(var(--foreground) / 0.12),
                        transparent
                    );
                    animation: loading-shimmer 1.35s ease-in-out infinite;
                }

                @keyframes loading-shimmer {
                    100% {
                        transform: translateX(-100%);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .loading-shimmer::after {
                        animation: none;
                    }
                }
            `}</style>
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-7 py-8 sm:px-10">
                <div className="flex items-center justify-between">
                    <div className="loading-shimmer h-10 w-10 rounded-full" />
                    <div className="loading-shimmer h-10 w-10 rounded-full" />
                </div>

                <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-14 pt-10 text-center" dir="rtl">
                    <div className="w-full max-w-md space-y-4">
                        <div className="loading-shimmer mx-auto h-8 w-7/12 rounded-full" />
                        <div className="loading-shimmer mx-auto h-4 w-4/12 rounded-full" />
                    </div>

                    <div className="w-full max-w-xl space-y-5">
                        {shimmerLineWidths.map((width, index) => (
                            <div
                                key={`${width}-${index}`}
                                className={`loading-shimmer mx-auto h-4 ${width} rounded-full`}
                            />
                        ))}
                    </div>

                    <p className="text-sm text-foreground/45 sm:text-base">
                        در حال آوردن اولین شعر...
                    </p>
                </div>
            </div>
        </div>
    );
}
