import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Loader2,
  Link as LinkIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import { AuthUser, updateStoredAuthProfile } from '../utils/authStorage';
import {
  UserProfileData,
  uploadProfileAvatarToSupabase,
  updateSupabaseProfileRecord,
} from '../utils/supabaseClient';
import { useTheme } from '../context/ThemeContext';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  profile: UserProfileData;
  onSaveSuccess: (updatedProfile: UserProfileData) => void;
  onShowToast: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  profile,
  onSaveSuccess,
  onShowToast,
}) => {
  const { isDark } = useTheme();
  const [draftName, setDraftName] = useState(profile.name || 'Creator');
  const [draftUsername, setDraftUsername] = useState(profile.username || 'creator');
  const [draftBio, setDraftBio] = useState(profile.bio || '');
  const [draftLink, setDraftLink] = useState(profile.link || '');
  const [draftGender, setDraftGender] = useState(profile.gender || 'Prefer not to say');
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar);
  const [hasAvatarError, setHasAvatarError] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync draft states when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftName(profile.name || 'Creator');
      setDraftUsername(profile.username || 'creator');
      setDraftBio(profile.bio || '');
      setDraftLink(profile.link || '');
      setDraftGender(profile.gender || 'Prefer not to say');
      setDraftAvatar(profile.avatar);
      setHasAvatarError(false);
      setErrorMessage(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // 1. REAL IMAGE UPLOAD TO SUPABASE STORAGE
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 15MB
    if (file.size > 15 * 1024 * 1024) {
      onShowToast('Please select an image smaller than 15MB');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    try {
      // Direct Supabase Storage upload -> public URL
      const publicUrl = await uploadProfileAvatarToSupabase(file, currentUser?.id);
      setDraftAvatar(publicUrl);
      setHasAvatarError(false);
      onShowToast('Profile photo updated 📸');
    } catch (err: any) {
      console.error('Failed to upload profile photo to Supabase Storage:', err);
      const msg = err?.message || 'Failed to upload photo. Please try again.';
      setErrorMessage(msg);
      onShowToast(msg);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleUsernameChange = (val: string) => {
    // Clean/sanitize handle in real-time
    const clean = val.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
    setDraftUsername(clean);
  };

  // 2. DIRECT DATABASE MUTATION (UPDATE profiles table)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving || isUploadingAvatar) return;

    const cleanedUsername = draftUsername
      .replace(/^@+/, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .trim();

    if (!cleanedUsername) {
      setErrorMessage('Username cannot be empty');
      return;
    }

    const cleanedName = draftName.trim() || 'Creator';
    const cleanedBio = draftBio.trim();
    const cleanedWebsite = draftLink.trim();
    const finalAvatar = draftAvatar;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await updateSupabaseProfileRecord(currentUser?.id, {
        name: cleanedName,
        username: cleanedUsername,
        bio: cleanedBio,
        website: cleanedWebsite,
        avatarUrl: finalAvatar,
      });

      if (!result.success) {
        const errorMsg = result.error || 'Failed to update profile in database';
        setErrorMessage(errorMsg);
        onShowToast(errorMsg);
        setIsSaving(false);
        return;
      }

      // 3. GLOBAL STATE & LOCAL CACHE SYNC
      const updatedProfile: UserProfileData = {
        name: cleanedName,
        username: cleanedUsername,
        bio: cleanedBio,
        link: cleanedWebsite,
        gender: draftGender,
        avatar: finalAvatar,
      };

      // Persist to local cache
      try {
        localStorage.setItem('gedion_user_profile_v1', JSON.stringify(updatedProfile));
      } catch {}

      // Update stored auth session
      updateStoredAuthProfile({
        displayName: cleanedName,
        username: cleanedUsername,
        avatar: finalAvatar,
      });

      // Dispatch global events
      window.dispatchEvent(
        new CustomEvent('gedion-profile-changed', { detail: updatedProfile })
      );
      window.dispatchEvent(new Event('profile-updated'));

      onSaveSuccess(updatedProfile);
      onShowToast('Profile saved successfully');
      onClose();
    } catch (err: any) {
      console.error('Exception during profile save:', err);
      const msg = err?.message || 'Network error updating profile. Please try again.';
      setErrorMessage(msg);
      onShowToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const initial = (draftName || draftUsername || 'C').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl border-t sm:border shadow-2xl overflow-hidden flex flex-col transition-colors z-10 ${
            isDark
              ? 'bg-[#121212] border-[#262626] text-white'
              : 'bg-white border-[#dbdbdb] text-black'
          }`}
        >
          {/* Mobile Drag Handle */}
          <div className="flex sm:hidden justify-center pt-2 pb-1 shrink-0">
            <div className={`h-1 w-10 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
          </div>

          {/* Navigation Bar Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
              isDark ? 'border-[#262626]' : 'border-[#efefef]'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`text-sm font-normal transition-opacity cursor-pointer disabled:opacity-40 ${
                isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-black'
              }`}
            >
              Cancel
            </button>
            <h3 className="font-bold text-sm tracking-tight">Edit profile</h3>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isUploadingAvatar}
              className="text-sm font-bold text-[#0095f6] hover:text-[#1877f2] active:opacity-75 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin text-[#0095f6]" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Done</span>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span className="flex-1">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="hover:opacity-75 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar pb-10">
            {/* Avatar Row */}
            <div className="flex flex-col items-center py-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <div className="h-20 w-20 rounded-full p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shadow-sm">
                  {draftAvatar && !hasAvatarError ? (
                    <img
                      src={draftAvatar}
                      alt=""
                      onError={() => setHasAvatarError(true)}
                      className={`h-full w-full rounded-full object-cover border-2 ${
                        isDark ? 'border-black' : 'border-white'
                      }`}
                    />
                  ) : (
                    <div
                      className={`h-full w-full rounded-full flex items-center justify-center text-white font-bold text-2xl border-2 select-none ${
                        isDark ? 'border-black' : 'border-white'
                      } bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]`}
                    >
                      {initial}
                    </div>
                  )}
                </div>

                <div
                  className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity ${
                    isUploadingAvatar
                      ? 'bg-black/60 opacity-100'
                      : 'bg-black/30 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isUploadingAvatar ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                    <Camera size={18} className="text-white drop-shadow" />
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs font-semibold text-[#0095f6] hover:text-[#1877f2] active:opacity-75 transition-all cursor-pointer"
              >
                {isUploadingAvatar ? 'Uploading photo...' : 'Change profile photo'}
              </button>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Name
              </label>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Name"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#0095f6] transition-colors ${
                  isDark
                    ? 'bg-zinc-900/80 border-[#262626] text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-200 text-black placeholder-zinc-400'
                }`}
              />
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Username
              </label>
              <div
                className={`flex items-center rounded-xl border px-3.5 py-2.5 focus-within:border-[#0095f6] transition-colors ${
                  isDark
                    ? 'bg-zinc-900/80 border-[#262626]'
                    : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <span className="text-xs text-zinc-500 mr-1 select-none">@</span>
                <input
                  type="text"
                  value={draftUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username"
                  className={`w-full bg-transparent text-xs focus:outline-none lowercase ${
                    isDark ? 'text-white placeholder-zinc-500' : 'text-black placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  Bio
                </label>
                <span className="text-[10px] text-zinc-500">
                  {draftBio.length} / 150
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={150}
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                placeholder="Bio"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#0095f6] transition-colors resize-none ${
                  isDark
                    ? 'bg-zinc-900/80 border-[#262626] text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-200 text-black placeholder-zinc-400'
                }`}
              />
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Website
              </label>
              <div
                className={`flex items-center rounded-xl border px-3.5 py-2.5 focus-within:border-[#0095f6] transition-colors ${
                  isDark
                    ? 'bg-zinc-900/80 border-[#262626]'
                    : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <LinkIcon size={14} className="text-zinc-500 mr-2 shrink-0" />
                <input
                  type="url"
                  value={draftLink}
                  onChange={(e) => setDraftLink(e.target.value)}
                  placeholder="Links"
                  className={`w-full bg-transparent text-xs focus:outline-none ${
                    isDark ? 'text-white placeholder-zinc-500' : 'text-black placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <label
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Gender
              </label>
              <select
                value={draftGender}
                onChange={(e) => setDraftGender(e.target.value as any)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#0095f6] transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900/80 border-[#262626] text-white'
                    : 'bg-zinc-50 border-zinc-200 text-black'
                }`}
              >
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
