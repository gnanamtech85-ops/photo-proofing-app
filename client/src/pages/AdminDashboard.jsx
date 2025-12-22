import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
    Camera, FolderOpen, Image, Heart, CheckCircle2, Bell,
    Plus, ExternalLink, QrCode, Settings, LogOut, TrendingUp,
    Users, Clock, Loader2
} from 'lucide-react';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [galleries, setGalleries] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGalleryName, setNewGalleryName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, galleriesRes, notifRes] = await Promise.all([
                api.get('/galleries/stats'),
                api.get('/galleries'),
                api.get('/client/notifications')
            ]);
            setStats(statsRes.data.stats);
            setGalleries(galleriesRes.data.galleries);
            setNotifications(notifRes.data.notifications.slice(0, 5));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createGallery = async (e) => {
        e.preventDefault();
        if (!newGalleryName.trim()) return;

        setCreating(true);
        try {
            await api.post('/galleries', { name: newGalleryName });
            setNewGalleryName('');
            setShowCreateModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">PhotoProof</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                )}
                            </button>
                            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-slate-400">{user?.email}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={FolderOpen}
                        label="Total Galleries"
                        value={stats?.total_galleries || 0}
                        color="purple"
                    />
                    <StatCard
                        icon={Image}
                        label="Total Photos"
                        value={stats?.total_photos || 0}
                        color="cyan"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Pending Selections"
                        value={stats?.pending_selections || 0}
                        color="amber"
                    />
                    <StatCard
                        icon={Heart}
                        label="Total Favorites"
                        value={stats?.total_favorites || 0}
                        color="pink"
                    />
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Galleries List */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Your Galleries</h2>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                New Gallery
                            </button>
                        </div>

                        {galleries.length === 0 ? (
                            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-12 text-center">
                                <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No galleries yet</h3>
                                <p className="text-slate-400 mb-6">Create your first gallery to start sharing photos</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Gallery
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {galleries.map((gallery) => (
                                    <GalleryCard key={gallery.id} gallery={gallery} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    <div>
                        <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
                        <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No recent activity</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {notifications.map((notification) => (
                                        <div key={notification.id} className="p-4 hover:bg-white/5 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${notification.type === 'selection' ? 'bg-purple-500/20' : 'bg-pink-500/20'
                                                    }`}>
                                                    {notification.type === 'selection' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                                    ) : (
                                                        <Heart className="w-4 h-4 text-pink-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white truncate">{notification.message}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {new Date(notification.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-white/10 p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Create New Gallery</h3>
                        <form onSubmit={createGallery}>
                            <input
                                type="text"
                                value={newGalleryName}
                                onChange={(e) => setNewGalleryName(e.target.value)}
                                placeholder="Gallery name..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 mb-4"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-white/5 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !newGalleryName.trim()}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }) {
    const colors = {
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
        cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
        amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
        pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30'
    };

    const iconColors = {
        purple: 'text-purple-400',
        cyan: 'text-cyan-400',
        amber: 'text-amber-400',
        pink: 'text-pink-400'
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur rounded-2xl border p-6`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center ${iconColors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-sm text-slate-400">{label}</p>
                </div>
            </div>
        </div>
    );
}

function GalleryCard({ gallery }) {
    return (
        <Link
            to={`/admin/gallery/${gallery.id}`}
            className="block bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 hover:bg-white/10 hover:border-purple-500/50 transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {gallery.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                            Created {new Date(gallery.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-semibold text-white">{gallery.photo_count || 0}</p>
                    <p className="text-xs text-slate-500">Photos</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-semibold text-amber-400">{gallery.pending_selections || 0}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-semibold text-pink-400">{gallery.favorites_count || 0}</p>
                    <p className="text-xs text-slate-500">Favorites</p>
                </div>
            </div>
        </Link>
    );
}
