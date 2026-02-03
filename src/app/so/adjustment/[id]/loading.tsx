export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <h2 className="text-xl font-bold text-gray-700 animate-pulse">Memuat Data Adjustment...</h2>
            <p className="text-gray-500 text-sm mt-2">Mohon tunggu sebentar.</p>
        </div>
    );
}
