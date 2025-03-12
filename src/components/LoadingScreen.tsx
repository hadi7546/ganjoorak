export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="loading-container">
                <div className="loading-spinner animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <h2 className="text-white mt-4">در حال بارگیری...</h2>
                <p className="text-gray-400">لطفا صبر کنید</p>
            </div>
        </div>
    );
}
