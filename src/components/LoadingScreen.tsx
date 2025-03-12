export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
    );
}