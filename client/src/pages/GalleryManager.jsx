import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
    ArrowLeft, Upload, Settings, Share2, QrCode, Trash2, Download,
    FolderPlus, Image, CheckCircle2, Clock, XCircle, Loader2,
    Eye, Copy, Check, ExternalLink, Calendar, Lock, Unlock
} from 'lucide-react';

export default function GalleryManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [gallery, setGallery] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [selections, setSelections] = useState([]);

    useEffect(() => {
        fetchGallery();
        fetchSelections();
    }, [id]);

    const fetchGallery = async () => {
        try {
            const res = await api.get(`/galleries/${id}`);
            setGallery(res.data.gallery);
            setPhotos(res.data.photos);
        } catch (err) {
            console.error(err);
            navigate('/admin');
        } finally {
            setLoading(false);
        }
    };

    const fetchSelections = async () => {
        try {
            const res = await api.get(`/selections/gallery/${id}`);
            setSelections(res.data.selections);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files?.length) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('gallery_id', id);
        for (const file of files) {
            formData.append('photos', file);
        }

        try {
            await api.post('/photos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            fetchGallery();
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const deletePhoto = async (photoId) => {
        if (!confirm('Delete this photo?')) return;
        try {
            await api.delete(`/photos/${photoId}`);
            setPhotos(photos.filter(p => p.id !== photoId));
        } catch (err) {
            console.error(err);
        }
    };

    const getQRCode = async () => {
        try {
            const res = await api.get(`/galleries/${id}/qr`);
            setQrData(res.data);
            setShowQR(true);
        } catch (err) {
            console.error(err);
        }
    };

    const copyShareLink = () => {
        const shareUrl = `${window.location.origin}/gallery/${gallery.share_link}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const updateGallery = async (updates) => {
        try {
            await api.put(`/galleries/${id}`, updates);
            setGallery({ ...gallery, ...updates });
        } catch (err) {
            console.error(err);
        }
    };

    const approveSelection = async (selectionId) => {
        try {
            await api.put(`/selections/${selectionId}/approve`);
            fetchSelections();
        } catch (err) {
            console.error(err);
        }
    };

    const rejectSelection = async (selectionId) => {
        try {
            await api.put(`/selections/${selectionId}/reject`);
            fetchSelections();
        } catch (err) {
            console.error(err);
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
                        <div className="flex items-center gap-4">
                            <Link
                                to="/admin"
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold text-white">{gallery?.name}</h1>
                                <p className="text-xs text-slate-500">{photos.length} photos</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={copyShareLink}
                                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                            </button>
                            <button
                                onClick={getQRCode}
                                className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                            >
                                <QrCode className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg font-medium cursor-pointer hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Upload</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            {/* Upload Progress */}
            {uploading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl p-8 text-center">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                        <p className="text-white font-medium mb-2">Uploading photos...</p>
                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="text-slate-400 text-sm mt-2">{uploadProgress}%</p>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Photo Grid */}
                    <div className="lg:col-span-3">
                        {photos.length === 0 ? (
                            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-12 text-center">
                                <Image className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No photos yet</h3>
                                <p className="text-slate-400 mb-6">Upload photos to get started</p>
                                <label className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium cursor-pointer hover:bg-purple-600 transition-colors">
                                    <Upload className="w-4 h-4" />
                                    Upload Photos
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className="group relative aspect-square rounded-xl overflow-hidden bg-white/5"
                                    >
                                        <img
                                            src={`/api/photos/file/thumb/${photo.filename}`}
                                            alt={photo.original_name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                                                <Eye className="w-5 h-5 text-white" />
                                            </button>
                                            <button
                                                onClick={() => deletePhoto(photo.id)}
                                                className="p-2 bg-red-500/50 hover:bg-red-500/70 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                        {photo.tags && (
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {JSON.parse(photo.tags).slice(0, 2).map((tag, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-black/50 text-white text-xs rounded-full">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selections Panel */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4">Client Selections</h3>
                        <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
                            {selections.length === 0 ? (
                                <div className="p-8 text-center">
                                    <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-sm">No selections yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                                    {selections.map((selection) => (
                                        <div key={selection.id} className="p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <img
                                                    src={`/api/photos/file/thumb/${selection.filename}`}
                                                    alt={selection.original_name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm truncate">{selection.original_name}</p>
                                                    <p className="text-slate-500 text-xs truncate">{selection.client_identifier}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selection.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => approveSelection(selection.id)}
                                                            className="flex-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => rejectSelection(selection.id)}
                                                            className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selection.status === 'approved'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {selection.status.charAt(0).toUpperCase() + selection.status.slice(1)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* QR Modal */}
            {showQR && qrData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowQR(false)}>
                    <div className="bg-slate-800 rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-4">Share Gallery</h3>
                        <img src={qrData.qrCode} alt="QR Code" className="w-64 h-64 mx-auto rounded-xl mb-4" />
                        <p className="text-slate-400 text-sm mb-4">Scan to open gallery</p>
                        <button
                            onClick={copyShareLink}
                            className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
                    <div className="w-full max-w-lg bg-slate-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-6">Gallery Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Gallery Name</label>
                                <input
                                    type="text"
                                    value={gallery.name}
                                    onChange={(e) => updateGallery({ name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={gallery.allow_download}
                                        onChange={(e) => updateGallery({ allow_download: e.target.checked })}
                                        className="w-5 h-5 rounded text-purple-500"
                                    />
                                    <div>
                                        <p className="text-white text-sm font-medium">Allow Download</p>
                                        <p className="text-slate-500 text-xs">Single photos</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={gallery.allow_bulk_download}
                                        onChange={(e) => updateGallery({ allow_bulk_download: e.target.checked })}
                                        className="w-5 h-5 rounded text-purple-500"
                                    />
                                    <div>
                                        <p className="text-white text-sm font-medium">Bulk Download</p>
                                        <p className="text-slate-500 text-xs">ZIP download</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={gallery.allow_client_upload}
                                        onChange={(e) => updateGallery({ allow_client_upload: e.target.checked })}
                                        className="w-5 h-5 rounded text-purple-500"
                                    />
                                    <div>
                                        <p className="text-white text-sm font-medium">Client Upload</p>
                                        <p className="text-slate-500 text-xs">Allow uploads</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={gallery.watermark_enabled}
                                        onChange={(e) => updateGallery({ watermark_enabled: e.target.checked })}
                                        className="w-5 h-5 rounded text-purple-500"
                                    />
                                    <div>
                                        <p className="text-white text-sm font-medium">Watermark</p>
                                        <p className="text-slate-500 text-xs">Enable watermark</p>
                                    </div>
                                </label>
                            </div>

                            {gallery.watermark_enabled && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Watermark Text</label>
                                    <input
                                        type="text"
                                        value={gallery.watermark_text || ''}
                                        onChange={(e) => updateGallery({ watermark_text: e.target.value })}
                                        placeholder="© Your Name"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Password Protection</label>
                                <input
                                    type="text"
                                    value={gallery.password || ''}
                                    onChange={(e) => updateGallery({ password: e.target.value || null })}
                                    placeholder="Leave empty for no password"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Expiry Date</label>
                                <input
                                    type="date"
                                    value={gallery.expiry_date?.split('T')[0] || ''}
                                    onChange={(e) => updateGallery({ expiry_date: e.target.value || null })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full mt-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
