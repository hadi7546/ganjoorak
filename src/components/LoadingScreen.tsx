export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center px-6 text-foreground" dir="rtl">
            <div className="flex flex-col items-center gap-5 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground" />
                <p className="max-w-sm text-base leading-8 text-foreground/70">
                    صبر کن ای دل که صبر سیرتِ اهلِ صفاست
                </p>
            </div>
        </div>
    );
}
