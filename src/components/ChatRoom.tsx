import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  CheckCheck,
  Phone,
  Video,
  Info,
  Smile,
  X,
  Loader2,
} from 'lucide-react';
import { Conversation, ChatMessage } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getStoredAuth } from '../utils/authStorage';
import {
  supabase,
  sendSupabaseMessage,
  fetchSupabaseMessages,
  uploadMediaToSupabaseStorage,
} from '../utils/supabaseClient';

export interface ChatRoomProps {
  conversation: Conversation;
  onBack: () => void;
  onUpdateConversationMessages?: (convId: string, newMsg: ChatMessage) => void;
  onAcceptRequest?: (convId: string) => void;
  onDeleteRequest?: (convId: string) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  conversation,
  onBack,
  onUpdateConversationMessages,
  onAcceptRequest,
  onDeleteRequest,
}) => {
  const { isDark } = useTheme();
  const currentUser = getStoredAuth();
  const myUsername = (currentUser?.username || 'me').replace(/^@/, '');

  const [messages, setMessages] = useState<ChatMessage[]>(conversation.messages || []);
  const [inputText, setInputText] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of thread
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Load messages from Supabase on mount & merge with local conversation
  useEffect(() => {
    let isMounted = true;

    async function loadCloudMessages() {
      try {
        const cloudRows = await fetchSupabaseMessages(conversation.id);
        if (isMounted && Array.isArray(cloudRows) && cloudRows.length > 0) {
          const mapped: ChatMessage[] = cloudRows.map((r: any) => {
            const isMe =
              r.sender_id === currentUser?.id ||
              String(r.sender_id).toLowerCase() === myUsername.toLowerCase() ||
              r.sender_id === 'me';

            return {
              id: String(r.id),
              senderId: isMe ? 'me' : conversation.username,
              text: r.text || '',
              mediaUrl: r.media_url,
              mediaType: r.media_type,
              timestamp: r.created_at
                ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now',
              status: 'delivered',
              isRead: true,
            };
          });

          // Merge without losing any local messages
          setMessages((prev) => {
            const cloudIds = new Set(mapped.map((m) => m.id));
            const localOnly = prev.filter((m) => !cloudIds.has(m.id) && m.id.startsWith('local_'));
            return [...localOnly, ...mapped];
          });
        }
      } catch (err) {
        console.warn('Load cloud messages notice:', err);
      }
    }

    loadCloudMessages();

    // 2. Realtime subscription: postgres_changes on INSERT to Supabase 'messages' filtered by conversation_id
    const channel = supabase
      .channel(`chat_messages_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;

          const isMe =
            row.sender_id === currentUser?.id ||
            String(row.sender_id).toLowerCase() === myUsername.toLowerCase() ||
            row.sender_id === 'me';

          const newMsg: ChatMessage = {
            id: String(row.id || Date.now()),
            senderId: isMe ? 'me' : conversation.username,
            text: row.text || '',
            mediaUrl: row.media_url,
            mediaType: row.media_type,
            timestamp: row.created_at
              ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now',
            status: 'delivered',
            isRead: true,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            return updated;
          });

          if (onUpdateConversationMessages) {
            onUpdateConversationMessages(conversation.id, newMsg);
          }

          setTimeout(() => scrollToBottom(true), 50);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversation.id, conversation.username, currentUser?.id, myUsername, onUpdateConversationMessages]);

  // Scroll down on messages change
  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend && !mediaPreview) return;

    const tempId = `local_${Date.now()}`;
    const sentMsg: ChatMessage = {
      id: tempId,
      senderId: 'me',
      text: textToSend,
      mediaUrl: mediaPreview?.url,
      mediaType: mediaPreview?.type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      isRead: false,
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, sentMsg]);
    setInputText('');
    setMediaPreview(null);
    scrollToBottom(true);

    if (onUpdateConversationMessages) {
      onUpdateConversationMessages(conversation.id, sentMsg);
    }

    try {
      await sendSupabaseMessage({
        conversationId: conversation.id,
        senderId: currentUser?.id || myUsername,
        recipientId: conversation.userId || conversation.username,
        text: textToSend,
        mediaUrl: sentMsg.mediaUrl,
        mediaType: sentMsg.mediaType,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'delivered' } : m))
      );
    } catch (err) {
      console.warn('Failed to send message to Supabase:', err);
    }
  };

  // Handle Photo Attachment Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const publicUrl = await uploadMediaToSupabaseStorage(file, 'chat');
      const isVideo = file.type.startsWith('video/');
      setMediaPreview({
        url: publicUrl,
        type: isVideo ? 'video' : 'image',
      });
    } catch (err) {
      console.warn('Media upload failed, using local preview:', err);
      const localUrl = URL.createObjectURL(file);
      setMediaPreview({
        url: localUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
      });
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initialLetter = (conversation.displayName || conversation.username || 'U')
    .replace(/^@/, '')
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col transition-colors select-none ${
        isDark ? 'bg-black text-white' : 'bg-white text-neutral-900'
      }`}
    >
      {/* 1. Chat Room Header */}
      <header
        className={`sticky top-0 z-20 flex items-center justify-between px-3 h-14 border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/95 border-neutral-800' : 'bg-white/95 border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="p-1 -ml-1 rounded-full hover:opacity-75 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>

          {/* User Avatar with online indicator */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] p-[1.5px]">
              <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
                {conversation.avatar && !avatarError ? (
                  <img
                    src={conversation.avatar}
                    alt=""
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">{initialLetter}</span>
                )}
              </div>
            </div>
            {conversation.isOnline !== false && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" />
            )}
          </div>

          {/* User Name & Status */}
          <div className="flex flex-col min-w-0 truncate">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold text-sm tracking-tight truncate">
                {conversation.displayName || conversation.username}
              </span>
              {conversation.isVerified && (
                <span className="text-[#0095f6] text-xs font-bold shrink-0">✓</span>
              )}
            </div>
            <span className="text-[11px] text-neutral-400 truncate">
              @{conversation.username.replace(/^@/, '')} · {conversation.lastSeen || 'Active now'}
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
          <button
            type="button"
            aria-label="Audio call"
            className="p-1.5 rounded-full hover:opacity-75 active:scale-90 transition-all cursor-pointer"
          >
            <Phone size={19} />
          </button>
          <button
            type="button"
            aria-label="Video call"
            className="p-1.5 rounded-full hover:opacity-75 active:scale-90 transition-all cursor-pointer"
          >
            <Video size={20} />
          </button>
          <button
            type="button"
            aria-label="Conversation info"
            className="p-1.5 rounded-full hover:opacity-75 active:scale-90 transition-all cursor-pointer"
          >
            <Info size={19} />
          </button>
        </div>
      </header>

      {/* 2. Messages Thread Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 no-scrollbar">
        {/* Intro profile snippet */}
        <div className="flex flex-col items-center justify-center my-6 text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shadow-md mb-2">
            <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
              {conversation.avatar && !avatarError ? (
                <img src={conversation.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xl">{initialLetter}</span>
              )}
            </div>
          </div>
          <h3 className="font-bold text-base tracking-tight">{conversation.displayName}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">@{conversation.username.replace(/^@/, '')} · GediOn</p>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isSender = msg.senderId === 'me';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} transition-opacity`}
            >
              <div
                className={`relative px-4 py-2.5 max-w-[78%] break-words text-[13.5px] leading-relaxed shadow-sm ${
                  isSender
                    ? 'bg-[#0095f6] text-white rounded-[22px] rounded-br-[4px]'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-100 rounded-[22px] rounded-bl-[4px]'
                    : 'bg-neutral-100 text-neutral-900 rounded-[22px] rounded-bl-[4px]'
                }`}
              >
                {/* Media Attachment if present */}
                {msg.mediaUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden max-w-[240px] max-h-[300px]">
                    {msg.mediaType === 'video' ? (
                      <video src={msg.mediaUrl} controls className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <img src={msg.mediaUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    )}
                  </div>
                )}

                {/* Message Text */}
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
              </div>

              {/* Timestamp & Delivery tick for sender */}
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
                {isSender && (
                  <CheckCheck size={12} className={msg.isRead ? 'text-[#0095f6]' : 'text-neutral-400'} />
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Message Request Banner (if conversation is pending request) */}
      {conversation.isRequest ? (
        <div
          className={`border-t p-4 flex flex-col items-center gap-3 backdrop-blur-md ${
            isDark ? 'bg-neutral-900/95 border-neutral-800' : 'bg-neutral-50/95 border-neutral-200'
          }`}
        >
          <p className="text-xs text-center text-neutral-600 dark:text-neutral-300 max-w-sm">
            <span className="font-bold">@{conversation.username.replace(/^@/, '')}</span> wants to send you a message. They won&apos;t know you&apos;ve seen it until you accept.
          </p>

          <div className="flex items-center gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={() => onAcceptRequest?.(conversation.id)}
              className="flex-1 py-2 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-xs active:scale-95 transition-all shadow-sm cursor-pointer text-center"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onDeleteRequest?.(conversation.id)}
              className="flex-1 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer text-center"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        /* 4. Native Input Bar */
        <div
          className={`sticky bottom-0 z-20 border-t px-3 py-2.5 backdrop-blur-md transition-colors ${
            isDark ? 'bg-black/95 border-neutral-800' : 'bg-white/95 border-neutral-200'
          }`}
        >
          {/* Media preview before sending */}
          {mediaPreview && (
            <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-700">
              <img src={mediaPreview.url} alt="" className="h-20 w-20 object-cover" />
              <button
                type="button"
                onClick={() => setMediaPreview(null)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Media picker button */}
            <button
              type="button"
              disabled={isUploadingMedia}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo or video"
              className="p-2 rounded-full text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {isUploadingMedia ? <Loader2 size={20} className="animate-spin text-[#0095f6]" /> : <ImageIcon size={20} />}
            </button>

            {/* Input pill */}
            <div
              className={`flex-1 flex items-center px-3.5 py-1.5 rounded-full border transition-colors ${
                isDark ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-700' : 'bg-neutral-100 border-neutral-200 focus-within:border-neutral-300'
              }`}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message..."
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputText.trim() && !mediaPreview}
              aria-label="Send message"
              className={`p-2 rounded-full transition-all cursor-pointer ${
                inputText.trim() || mediaPreview
                  ? 'text-[#0095f6] hover:scale-105 active:scale-95'
                  : 'text-neutral-400 opacity-40 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
