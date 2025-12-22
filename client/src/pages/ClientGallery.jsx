import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import Lightbox from '../components/Lightbox';
import {
    Camera, Lock, Heart, Check, CheckCircle2, Download, Filter,
    Grid, List, Search, X, Loader2, ChevronDown, Image,
    CheckSquare, Square, Eye
} from 'lucide-react';

export default function ClientGallery() {
    const { shareLink } = useParams();
    const [gallery, setGallery] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientName, setClientName] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectionCount, setSelectionCount] = useState(0);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [filter, setFilter] = useState('all'); // all, selected, favorites, not-selected
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const savedClient = localStorage.getItem(`client_${shareLink}`);
        if (savedClient) {
            const { id, name } = JSON.parse(savedClient);
            setClientId(id);
            setClientName(name);
            setIsAuthenticated(true);
            fetchGallery(id);
        } else {
            fetchGallery();
        }
    }, [shareLink]);

    const fetchGallery = async (existingClientId = null) => {
        try {
            const params = new URLSearchParams();
            if (existingClientId) params.append('client_identifier', existingClientId);
            if (password) params.append('password', password);

            const res = await api.get(`/client/gallery/${shareLink}?${params.toString()}`);
            setGallery(res.data.gallery);
            setPhotos(res.data.photos);
            setSelectionCount(res.data.selectionCount);
            setError(null);
            setRequiresPassword(false);

            if (existingClientId) {
                setIsAuthenticated(true);
            }
        } catch (err) {
            if (err.response?.data?.requiresPassword) {
                setRequiresPassword(true);
            } else if (err.response?.data?.expired) {
                setError('This gallery has expired');
            } else {
                setError(err.response?.data?.error || 'Gallery not found');
            }
        } finally {
            setLoading(false);
        }
    };

    const enterGallery = (e) => {
        e.preventDefault();
        if (!clientName.trim()) return;

        const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setClientId(id);
        localStorage.setItem(`client_${shareLink}`, JSON.stringify({ id, name: clientName }));
        setIsAuthenticated(true);
        fetchGallery(id);
    };

    const toggleSelection = async (photo) => {
        try {
            const res = await api.post('/selections/toggle', {
                photo_id: photo.id,
                gallery_id: gallery.id,
                client_identifier: clientId
            });

            setPhotos(photos.map(p =>
                p.id === photo.id
                    ? { ...p, is_selected: res.data.selected ? 1 : 0 }
                    : p
            ));
            setSelectionCount(res.data.totalSelected);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleFavorite = async (photo) => {
        try {
            const res = await api.post('/selections/favorite', {
                photo_id: photo.id,
                gallery_id: gallery.id,
                client_identifier: clientId
            });

            setPhotos(photos.map(p =>
                p.id === photo.id
                    ? { ...p, is_favorited: res.data.favorited ? 1 : 0 }
                    : p
            ));
        } catch (err) {
            console.error(err);
        }
    };

    const selectAll = async () => {
        try {
            const res = await api.post('/selections/select-all', {
                gallery_id: gallery.id,
                client_identifier: clientId
            });

            setPhotos(photos.map(p => ({ ...p, is_selected: 1 })));
            setSelectionCount(res.data.totalSelected);
        } catch (err) {
            console.error(err);
        }
    };

    const deselectAll = async () => {
        try {
            await api.post('/selections/deselect-all', {
                gallery_id: gallery.id,
                client_identifier: clientId
            });

            setPhotos(photos.map(p => ({ ...p, is_selected: 0 })));
            setSelectionCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const downloadZip = () => {
        const params = new URLSearchParams({
            client_identifier: clientId,
            filename: gallery.name
        });
        window.open(`/api/client/gallery/${shareLink}/download-zip?${params.toString()}`, '_blank');
    };

    const filteredPhotos = photos.filter(photo => {
        if (filter === 'selected' && !photo.is_selected) return false;
        if (filter === 'favorites' && !photo.is_favorited) return false;
        if (filter === 'not-selected' && photo.is_selected) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const tags = photo.tags ? JSON.parse(photo.tags) : [];
            const matchesTags = tags.some(t => t.toLowerCase().includes(query));
            const matchesName = photo.original_name.toLowerCase().includes(query);
            if (!matchesTags && !matchesName) return false;
        }

        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">{error}</h1>
                    <p className="text-slate-400">Please check the link or contact the photographer.</p>
                </div>
            </div>
        );
    }

    if (requiresPassword && !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Password Protected</h1>
                    <p className="text-slate-400 mb-6">Enter the password to view this gallery</p>
                    <form onSubmit={(e) => { e.preventDefault(); fetchGallery(); }} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold rounded-xl"
                        >
                            Unlock Gallery
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Camera className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">{gallery?.name}</h1>
                    <p className="text-slate-400 mb-2">{photos.length} photos to explore</p>
                    <p className="text-slate-500 text-sm mb-6">by {gallery?.admin_name}</p>

                    <form onSubmit={enterGallery} className="space-y-4">
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Your name"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                        >
                            Enter Gallery
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">{gallery?.name}</h1>
                                <p className="text-xs text-slate-500">{filteredPhotos.length} photos</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Selection Counter */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-full">
                                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-medium text-purple-300">{selectionCount} selected</span>
                            </div>

                            {gallery?.allow_bulk_download && selectionCount > 0 && (
                                <button
                                    onClick={downloadZip}
                                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg text-sm font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Download</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="sticky top-16 z-30 backdrop-blur-xl bg-slate-800/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
                        {/* Search */}
                        <div className="relative flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search (Tamil/English)..."
                                className="pl-9 pr-4 py-2 w-48 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('selected')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${filter === 'selected' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Selected
                            </button>
                            <button
                                onClick={() => setFilter('favorites')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${filter === 'favorites' ? 'bg-pink-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                <Heart className="w-4 h-4" />
                                Favorites
                            </button>
                            <button
                                onClick={() => setFilter('not-selected')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'not-selected' ? 'bg-slate-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                Not Selected
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        <div className="flex gap-2 ml-auto flex-shrink-0">
                            <button
                                onClick={selectAll}
                                className="px-3 py-2 bg-white/5 text-slate-300 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-1"
                            >
                                <CheckSquare className="w-4 h-4" />
                                <span className="hidden sm:inline">Select All</span>
                            </button>
                            <button
                                onClick={deselectAll}
                                className="px-3 py-2 bg-white/5 text-slate-300 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-1"
                            >
                                <Square className="w-4 h-4" />
                                <span className="hidden sm:inline">Deselect All</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Selection Counter */}
            <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500 rounded-full shadow-lg shadow-purple-500/30">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-sm font-medium text-white">{selectionCount} selected</span>
                </div>
            </div>

            {/* Photo Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
                {filteredPhotos.length === 0 ? (
                    <div className="text-center py-20">
                        <Image className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No photos found</h3>
                        <p className="text-slate-400">Try a different search or filter</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {filteredPhotos.map((photo, index) => (
                            <div
                                key={photo.id}
                                className={`group relative aspect-square rounded-xl overflow-hidden bg-white/5 cursor-pointer ring-2 transition-all ${photo.is_selected ? 'ring-purple-500' : 'ring-transparent hover:ring-white/20'
                                    }`}
                            >
                                <img
                                    src={`/api/photos/file/watermarked/${photo.filename}`}
                                    alt={photo.original_name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onClick={() => setLightboxIndex(index)}
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelection(photo); }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${photo.is_selected
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-white/20 text-white hover:bg-white/30'
                                                }`}
                                        >
                                            {photo.is_selected ? <Check className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(photo); }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${photo.is_favorited
                                                    ? 'bg-pink-500 text-white'
                                                    : 'bg-white/20 text-white hover:bg-white/30'
                                                }`}
                                        >
                                            <Heart className={`w-5 h-5 ${photo.is_favorited ? 'fill-current' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Selection indicator */}
                                {photo.is_selected && (
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}

                                {/* Favorite indicator */}
                                {photo.is_favorited && (
                                    <div className="absolute top-2 left-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                        <Heart className="w-3 h-3 text-white fill-current" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Lightbox */}
            {lightboxIndex >= 0 && (
                <Lightbox
                    photos={filteredPhotos}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(-1)}
                    onIndexChange={setLightboxIndex}
                    onToggleSelection={toggleSelection}
                    onToggleFavorite={toggleFavorite}
                />
            )}
        </div>
    );
}
