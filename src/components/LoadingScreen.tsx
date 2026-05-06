export default function LoadingScreen() {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-background"
            role="status"
            aria-live="polite"
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-foreground" />
                <p className="px-6 text-xl leading-10 text-foreground/75 sm:text-2xl" dir="rtl">
                    صبر کن ای دل که صبر سیرتِ اهلِ صفاست
                </p>
            </div>
        </div>
    );
}
