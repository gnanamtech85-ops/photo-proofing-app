import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Check, CheckCircle2, Download, ZoomIn, ZoomOut } from 'lucide-react';

export default function Lightbox({ photos, currentIndex, onClose, onIndexChange, onToggleSelection, onToggleFavorite }) {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [zoom, setZoom] = useState(1);

    const photo = photos[currentIndex];
    const minSwipeDistance = 50;

    const goNext = useCallback(() => {
        if (currentIndex < photos.length - 1) {
            onIndexChange(currentIndex + 1);
            setZoom(1);
        }
    }, [currentIndex, photos.length, onIndexChange]);

    const goPrev = useCallback(() => {
        if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
            setZoom(1);
        }
    }, [currentIndex, onIndexChange]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose, goNext, goPrev]);

    // Touch handlers for swipe
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            goNext();
        } else if (isRightSwipe) {
            goPrev();
        }
    };

    const toggleZoom = () => {
        setZoom(zoom === 1 ? 2 : 1);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <span className="text-white font-medium">
                        {currentIndex + 1} / {photos.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleZoom}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        {zoom === 1 ? <ZoomIn className="w-5 h-5 text-white" /> : <ZoomOut className="w-5 h-5 text-white" />}
                    </button>
                    <button
                        onClick={() => onToggleSelection(photo)}
                        className={`p-2 rounded-full transition-colors ${photo.is_selected ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'
                            }`}
                    >
                        {photo.is_selected ? <Check className="w-5 h-5 text-white" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
                    </button>
                    <button
                        onClick={() => onToggleFavorite(photo)}
                        className={`p-2 rounded-full transition-colors ${photo.is_favorited ? 'bg-pink-500' : 'bg-white/10 hover:bg-white/20'
                            }`}
                    >
                        <Heart className={`w-5 h-5 text-white ${photo.is_favorited ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
                <button
                    onClick={goPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
                >
                    <ChevronLeft className="w-8 h-8 text-white" />
                </button>
            )}
            {currentIndex < photos.length - 1 && (
                <button
                    onClick={goNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
                >
                    <ChevronRight className="w-8 h-8 text-white" />
                </button>
            )}

            {/* Image */}
            <div
                className="h-full flex items-center justify-center p-4"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <img
                    src={`/api/photos/file/watermarked/${photo.filename}`}
                    alt={photo.original_name}
                    className="max-h-full max-w-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                    onClick={toggleZoom}
                />
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-medium truncate">{photo.original_name}</p>
                        {photo.tags && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                                {JSON.parse(photo.tags).map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {photo.is_selected && (
                            <div className="flex items-center gap-1 text-purple-400 text-sm">
                                <Check className="w-4 h-4" />
                                Selected
                            </div>
                        )}
                        {photo.is_favorited && (
                            <div className="flex items-center gap-1 text-pink-400 text-sm">
                                <Heart className="w-4 h-4 fill-current" />
                                Favorited
                            </div>
                        )}
                    </div>
                </div>

                {/* Thumbnail strip */}
                <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                    {photos.map((p, idx) => (
                        <button
                            key={p.id}
                            onClick={() => { onIndexChange(idx); setZoom(1); }}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${idx === currentIndex ? 'ring-2 ring-purple-500 scale-105' : 'opacity-50 hover:opacity-75'
                                }`}
                        >
                            <img
                                src={`/api/photos/file/thumb/${p.filename}`}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
