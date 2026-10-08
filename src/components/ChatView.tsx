import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Send,
  Image as ImageIcon,
  CheckCheck,
  Phone,
  Video,
  Info,
  SquarePen,
  X,
  Smile,
  Sparkles,
  Camera,
  Play,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation, ChatMessage } from '../types';
import { INITIAL_CONVERSATIONS } from '../data/mockConversations';
import { InstantCameraModal } from './InstantCameraModal';
import { compressImageFile } from '../utils/mediaUtils';
import {
  searchSupabaseUsers,
  sendSupabaseMessage,
  supabase,
  SearchedUser,
} from '../utils/supabaseClient';
import { getStoredAuth } from '../utils/authStorage';

interface ChatViewProps {
  onClose: () => void;
  initialUserId?: string | null;
  onClearInitialUser?: () => void;
}

const STORAGE_KEY = 'gedion_chat_conversations_v1';

export const ChatView: React.FC<ChatViewProps> = ({
  onClose,
  initialUserId,
  onClearInitialUser,
}) => {
  // Load persisted conversations or initialize
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inboxTab, setInboxTab] = useState<'primary' | 'requests'>('primary');
  const [requestConversations, setRequestConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem('gedion_chat_requests_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedFriends, setSearchedFriends] = useState<SearchedUser[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const currentUser = getStoredAuth();

  const [messageText, setMessageText] = useState('');
  const [mediaAttachment, setMediaAttachment] = useState<{
    url: string;
    type: 'image' | 'video';
  } | null>(null);
  const [isTypingReply, setIsTypingReply] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [zoomMediaUrl, setZoomMediaUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Real-time friend search via Supabase
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchedFriends([]);
      setIsSearchingFriends(false);
      return;
    }
    setIsSearchingFriends(true);
    const timer = setTimeout(() => {
      searchSupabaseUsers(trimmed)
        .then((users) => {
          setSearchedFriends(users);
        })
        .finally(() => {
          setIsSearchingFriends(false);
        });
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Supabase Realtime Listener for incoming live messages
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`chat_room_${activeConversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as any;
          if (row && row.conversation_id === activeConversationId) {
            const myName = (currentUser?.username || 'me').toLowerCase();
            const senderLower = String(row.sender_id || '').toLowerCase();
            if (senderLower !== myName && senderLower !== 'me') {
              const incomingMsg: ChatMessage = {
                id: String(row.id || Date.now()),
                senderId: row.sender_id,
                text: row.text || '',
                mediaUrl: row.media_url,
                mediaType: row.media_type,
                timestamp: 'Just now',
                isRead: true,
                status: 'delivered',
              };
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === activeConversationId && !c.messages.some((m) => m.id === incomingMsg.id)) {
                    return {
                      ...c,
                      lastMessage: incomingMsg.text || 'Sent attachment',
                      lastMessageTime: 'Just now',
                      messages: [...c.messages, incomingMsg],
                    };
                  }
                  return c;
                })
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUser]);

  const handleStartChatWithUser = (user: { username: string; name?: string; avatar?: string }) => {
    const cleanUser = user.username.replace('@', '');
    const existing = conversations.find(
      (c) => c.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      const newConv: Conversation = {
        id: `conv-${cleanUser}-${Date.now()}`,
        userId: cleanUser,
        username: cleanUser,
        displayName: user.name || cleanUser,
        avatar:
          user.avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUser}&backgroundColor=06b6d4,a855f7`,
        isVerified: false,
        isOnline: true,
        lastSeen: 'Active now',
        lastMessage: 'Started a new conversation',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        messages: [
          {
            id: `m-init-${Date.now()}`,
            senderId: cleanUser,
            text: `Hey! Thanks for connecting on GediOn 🚀`,
            timestamp: 'Just now',
            isRead: true,
          },
        ],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }
    setSearchQuery('');
  };

  // Save to localStorage whenever conversations update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to persist conversations', e);
    }
  }, [conversations]);

  // Handle deep-linking if an initialUserId was passed (e.g. from Notifications)
  useEffect(() => {
    if (initialUserId) {
      const existing = conversations.find(
        (c) => c.userId.toLowerCase() === initialUserId.toLowerCase() || c.username.toLowerCase() === initialUserId.toLowerCase()
      );
      if (existing) {
        setActiveConversationId(existing.id);
        // Mark as read
        setConversations((prev) =>
          prev.map((c) => (c.id === existing.id ? { ...c, unreadCount: 0 } : c))
        );
      } else {
        // Create new conversation with this user
        const newConv: Conversation = {
          id: `conv-${initialUserId}-${Date.now()}`,
          userId: initialUserId,
          username: initialUserId.replace('@', ''),
          displayName: initialUserId.replace('@', '').replace('_', ' ').toUpperCase(),
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          isVerified: false,
          isOnline: true,
          lastSeen: 'Active now',
          lastMessage: 'Started a new conversation',
          lastMessageTime: 'Just now',
          unreadCount: 0,
          messages: [
            {
              id: `m-init-${Date.now()}`,
              senderId: initialUserId,
              text: `Hey! Thanks for connecting on GediOn 🚀`,
              timestamp: 'Just now',
              isRead: true,
            },
          ],
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
      }
      onClearInitialUser?.();
    }
  }, [initialUserId, conversations, onClearInitialUser]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeConversationId) {
      scrollToBottom();
    }
  }, [activeConversationId, activeConversation?.messages, isTypingReply]);

  // Open a conversation
  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Helper for triggering realistic contextual auto-replies
  const triggerSimulatedReply = (
    convId: string,
    recipientUser: string,
    context?: 'photo' | 'video' | 'camera' | 'text'
  ) => {
    setIsTypingReply(true);
    setTimeout(() => {
      setIsTypingReply(false);
      let replies: string[] = [];

      if (context === 'photo' || context === 'camera') {
        replies = [
          'Whoa, that shot looks incredible! 📸✨',
          'Love the colors and composition on this! 🔥',
          'Saved this to my moodboard! So clean 🙌',
          'That lighting is top tier! Which lens/LUT was that? 💜',
          'Insane visual! You gotta drop this as a full reel 🚀',
        ];
      } else if (context === 'video') {
        replies = [
          'That clip is fire!! Motion blur is so clean 🎥🔥',
          'Loving the rhythm on this video! 🎧✨',
          'Bro this goes crazy! Can we collaborate soon? 🚀',
          'Super high energy! Love the transitions 💜',
        ];
      } else {
        replies = [
          `Love this! Sending you positive vibes from the studio ✨`,
          `That's awesome! Let's definitely collaborate on the next reel.`,
          `Checked it out — absolutely top tier production quality! 🔥`,
          `Got it! I'll check this out and reply in a bit 🙌`,
          `100%! GediOn community is loving this style right now 🚀`,
        ];
      }

      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        senderId: recipientUser,
        text: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: true,
        status: 'delivered',
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              lastMessage: randomReply,
              lastMessageTime: 'Just now',
              messages: [...c.messages, replyMsg],
            };
          }
          return c;
        })
      );
    }, 1400);
  };

  // Gallery Send Flow: Immediately inserts photo/video into conversation thread with loading-to-sent indicator
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const isVideo = file.type.startsWith('video/');
    const currentConvId = activeConversation.id;
    const recipientUser = activeConversation.username;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `msg-media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Compress image to ensure reliable and fast persistence in localStorage
    let mediaUrl = '';
    if (isVideo) {
      mediaUrl = URL.createObjectURL(file);
    } else {
      mediaUrl = await compressImageFile(file, 800, 1000, 0.82);
    }

    // 1. Immediately insert into thread with status 'sending'
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: 'me',
      text: '',
      mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      timestamp: timeString,
      isRead: true,
      status: 'sending',
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            lastMessage: isVideo ? '📹 Sent a video' : '📷 Sent a photo',
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    // Reset file input
    e.target.value = '';

    // 2. Transition from loading-to-sent indicator after 400ms
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === currentConvId) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, status: 'sent' } : m
              ),
            };
          }
          return c;
        })
      );
    }, 400);

    // 3. Trigger simulated auto-reply
    triggerSimulatedReply(currentConvId, recipientUser, isVideo ? 'video' : 'photo');
  };

  // Instant Camera Send Pipeline: Sends captured photo or short clip into conversation thread
  const handleCameraSendMedia = (mediaUrl: string, mediaType: 'image' | 'video', caption?: string) => {
    if (!activeConversation) return;

    const currentConvId = activeConversation.id;
    const recipientUser = activeConversation.username;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `msg-cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newMsg: ChatMessage = {
      id: msgId,
      senderId: 'me',
      text: caption || '',
      mediaUrl,
      mediaType,
      timestamp: timeString,
      isRead: true,
      status: 'sent',
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            lastMessage: caption || (mediaType === 'video' ? '📹 Instant video clip' : '📷 Instant snap'),
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    triggerSimulatedReply(currentConvId, recipientUser, 'camera');
  };

  // Send a regular text message
  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    if (!activeConversation) return;

    const currentConvId = activeConversation.id;
    const recipientUser = activeConversation.username;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'me',
      text: messageText.trim(),
      timestamp: timeString,
      isRead: true,
      status: 'sent',
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            lastMessage: messageText.trim(),
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setMessageText('');

    // Sync to Supabase messages table in background
    sendSupabaseMessage({
      conversationId: currentConvId,
      senderId: currentUser?.username || 'me',
      recipientId: recipientUser,
      text: messageText.trim(),
    }).catch(() => {});

    triggerSimulatedReply(currentConvId, recipientUser, 'text');
  };

  // Filtered conversations based on search
  const filteredConversations = conversations.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#07070b] text-white overflow-hidden select-none">
      {/* Hidden File Input for Media Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!activeConversation ? (
          /* ========================================================================= */
          /* 1. INBOX LIST VIEW */
          /* ========================================================================= */
          <motion.div
            key="inbox"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full w-full pb-20 overflow-y-auto no-scrollbar"
          >
            {/* Top Bar */}
            <div className="sticky top-0 z-10 flex flex-col bg-[#07070b]/95 backdrop-blur-xl border-b border-white/10">
              <div className="w-full pt-[env(safe-area-inset-top,0px)]" />
              <div className="flex items-center justify-between px-4 pt-1.5 pb-2.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    aria-label="Back to Feed"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-base md:text-lg font-extrabold tracking-tight text-white">
                      ankurarya4095
                    </span>
                    <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    aria-label="New Direct Message"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-white/10 hover:border-cyan-400/50 text-cyan-300 hover:text-white transition-all active:scale-95"
                  >
                    <SquarePen size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Search Conversations Bar */}
            <div className="px-4 py-2.5">
              <div className="relative flex items-center w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus-within:border-cyan-400/70 focus-within:bg-white/10 transition-all">
                <Search size={16} className="text-white/40 shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Search direct messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-white/40 text-xs focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full text-white/50 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Active Now Stories / Direct Message Avatars Strip */}
            <div className="px-4 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-4">
              {/* Current user note */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-blue-500">
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                    alt="Your note"
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                  <span className="absolute -top-1 -right-1 text-[9px] bg-cyan-400 text-black font-bold px-1.5 py-0.5 rounded-full shadow-md">
                    Note
                  </span>
                </div>
                <span className="mt-1 text-[11px] text-white/60 font-medium truncate max-w-[60px]">
                  Your note
                </span>
              </div>

              {/* Online creators */}
              {conversations
                .filter((c) => c.isOnline)
                .map((c) => (
                  <button
                    key={`strip-${c.id}`}
                    onClick={() => handleSelectConversation(c.id)}
                    className="flex flex-col items-center shrink-0 active:scale-95 transition-transform"
                  >
                    <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm">
                      <img
                        src={c.avatar}
                        alt={c.displayName}
                        className="w-full h-full rounded-full object-cover border-2 border-black"
                      />
                      {/* Green pulsating online status badge */}
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_8px_#34d399]" />
                    </div>
                    <span className="mt-1 text-[11px] text-white font-medium truncate max-w-[62px]">
                      {c.displayName.split(' ')[0]}
                    </span>
                  </button>
                ))}
            </div>

            {/* Real-time Found Friends Section when Searching */}
            {searchQuery.trim() && (
              <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase">
                    Find Friends on GediOn
                  </span>
                  {isSearchingFriends && <Loader2 size={13} className="animate-spin text-cyan-400" />}
                </div>

                {searchedFriends.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 mb-3 overflow-hidden">
                    {searchedFriends.map((friend) => (
                      <div
                        key={`friend-${friend.username}`}
                        onClick={() => handleStartChatWithUser(friend)}
                        className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition-colors active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="w-10 h-10 rounded-full object-cover border border-white/15"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{friend.username}</p>
                            <p className="text-[11px] text-zinc-400">{friend.name}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-xl bg-[#0095f6] text-white text-xs font-bold shadow-md hover:bg-[#1877f2] cursor-pointer"
                        >
                          Chat
                        </button>
                      </div>
                    ))}
                  </div>
                ) : !isSearchingFriends ? (
                  <p className="text-xs text-zinc-500 mb-3 px-1">No creators found matching &quot;{searchQuery}&quot;</p>
                ) : null}
              </div>
            )}

            {/* Messages Section Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs font-bold text-white/90 tracking-wide uppercase">
                Messages
              </span>
              <span className="text-[11px] font-semibold text-cyan-400">
                Requests ({conversations.filter((c) => c.unreadCount > 0).length})
              </span>
            </div>

            {/* Conversations List */}
            <div className="divide-y divide-white/5">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="flex items-center w-full px-4 py-3 gap-3.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                  >
                    {/* Avatar with Online Indicator */}
                    <div className="relative shrink-0 w-13 h-13">
                      <img
                        src={conv.avatar}
                        alt={conv.displayName}
                        className="w-12 h-12 rounded-full object-cover border border-white/15"
                      />
                      {conv.isOnline && (
                        <span className="absolute bottom-0 right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_8px_#34d399]" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-white font-bold' : 'text-white/90'}`}>
                            {conv.displayName}
                          </span>
                          {conv.isVerified && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-black text-[9px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-white/40 shrink-0">
                          {conv.lastMessageTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5 gap-2">
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white font-semibold' : 'text-white/50'}`}>
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 text-black text-[10px] font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.8)] shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-12 px-6 text-center text-white/50">
                  <p className="text-sm">No conversations match &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* 2. ACTIVE CHAT CONVERSATION WINDOW */
          /* ========================================================================= */
          <motion.div
            key="chat-thread"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full w-full bg-[#07070b] overflow-hidden"
          >
            {/* Active Chat Top Bar */}
            <div className="flex flex-col bg-[#0a0a10]/95 backdrop-blur-xl border-b border-white/10 z-20">
              <div className="w-full pt-[env(safe-area-inset-top,0px)]" />
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    aria-label="Back to Inbox"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white shrink-0"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={activeConversation.avatar}
                      alt={activeConversation.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-white/15"
                    />
                    {activeConversation.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_6px_#34d399]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white truncate">
                        {activeConversation.displayName}
                      </h3>
                      {activeConversation.isVerified && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-black text-[9px] font-bold shrink-0">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-white/50 block truncate">
                      {activeConversation.isOnline ? (
                        <span className="text-emerald-400 font-medium">● Active now</span>
                      ) : (
                        activeConversation.lastSeen || `@${activeConversation.username}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Decorative Audio/Video call tools */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => alert(`Starting voice call with ${activeConversation.displayName}...`)}
                    aria-label="Voice Call"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  >
                    <Phone size={17} />
                  </button>
                  <button
                    onClick={() => alert(`Starting video call with ${activeConversation.displayName}...`)}
                    aria-label="Video Call"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  >
                    <Video size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Thread Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
              {/* Creator Profile Stamp at top of chat */}
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <img
                  src={activeConversation.avatar}
                  alt={activeConversation.displayName}
                  className="w-18 h-18 rounded-full object-cover border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-2"
                />
                <h4 className="text-base font-bold text-white">
                  {activeConversation.displayName}
                </h4>
                <p className="text-xs text-white/50 mt-0.5">@{activeConversation.username} • GediOn Creator</p>
                <span className="text-[11px] text-cyan-400/80 mt-1 font-medium">
                  Direct Messages are end-to-end encrypted
                </span>
              </div>

              {/* Message bubbles */}
              {activeConversation.messages.map((msg) => {
                const isMe = msg.senderId === 'me';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`relative max-w-[78%] px-3.5 py-2.5 text-xs md:text-sm ${
                        isMe
                          ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-xs shadow-[0_4px_15px_rgba(6,182,212,0.3)]'
                          : 'bg-white/10 backdrop-blur-md border border-white/10 text-white/95 rounded-2xl rounded-tl-xs shadow-md'
                      }`}
                    >
                      {/* Media image/video if present */}
                      {msg.mediaUrl && (
                        <div
                          onClick={() => setZoomMediaUrl(msg.mediaUrl || null)}
                          className="mb-2 rounded-xl overflow-hidden border border-white/20 max-w-full relative group cursor-pointer"
                        >
                          {msg.mediaType === 'video' ? (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="max-h-60 w-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="relative">
                              <img
                                src={msg.mediaUrl}
                                alt="Shared attachment"
                                className="max-h-60 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                                <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-90 transition-opacity drop-shadow-md" />
                              </div>
                            </div>
                          )}

                          {/* Subtle loading-to-sent indicator overlay if sending */}
                          {msg.status === 'sending' && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 border border-cyan-400 text-cyan-300 text-xs shadow-[0_0_14px_rgba(6,182,212,0.6)]">
                                <Loader2 size={13} className="animate-spin text-cyan-400" />
                                <span>Sending...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Text content */}
                      {msg.text && <p className="leading-relaxed break-words">{msg.text}</p>}

                      {/* Bottom Timestamp & Read Checkmarks */}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isMe ? 'text-white/70' : 'text-white/40'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {isMe && (
                          msg.status === 'sending' ? (
                            <Loader2 size={11} className="animate-spin text-cyan-300" />
                          ) : (
                            <CheckCheck size={13} className="text-cyan-200" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator bubble */}
              {isTypingReply && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl rounded-tl-xs bg-white/10 backdrop-blur-md border border-white/10 w-fit"
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Dock with Dual Glowing Media Buttons */}
            <div className="p-3 bg-[#0a0a10] border-t border-white/10 z-20">
              {/* Hidden Gallery file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Dual Glowing Media Buttons (Camera & Gallery) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Camera Button ('📷') */}
                  <button
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    aria-label="Instant Camera Capture"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500/25 via-blue-500/20 to-purple-600/25 border border-cyan-400/70 text-cyan-300 hover:text-white shadow-[0_0_14px_rgba(6,182,212,0.45)] hover:shadow-[0_0_20px_rgba(6,182,212,0.7)] active:scale-95 transition-all duration-200 group"
                  >
                    <Camera size={18} className="transition-transform group-hover:scale-110" />
                  </button>

                  {/* Gallery Button ('🖼️') */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Gallery Media Picker"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600/25 via-pink-500/20 to-cyan-500/25 border border-purple-400/70 text-purple-300 hover:text-white shadow-[0_0_14px_rgba(6,182,212,0.45)] hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] active:scale-95 transition-all duration-200 group"
                  >
                    <ImageIcon size={18} className="transition-transform group-hover:scale-110" />
                  </button>
                </div>

                {/* Text input */}
                <div className="relative flex-1 flex items-center rounded-full bg-white/5 border border-white/15 px-3.5 py-2 focus-within:border-cyan-400 focus-within:bg-white/10 transition-all">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message @${activeConversation.username}...`}
                    className="w-full bg-transparent text-white placeholder-white/40 text-xs md:text-sm focus:outline-none"
                  />
                  {/* Quick reactions */}
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev + ' 🔥')}
                    className="text-white/40 hover:text-amber-400 text-xs px-1 transition-colors"
                  >
                    🔥
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev + ' 💜')}
                    className="text-white/40 hover:text-purple-400 text-xs px-1 transition-colors"
                  >
                    💜
                  </button>
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  aria-label="Send Message"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                    messageText.trim()
                      ? 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] active:scale-90 scale-105'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instant Camera Capture Modal */}
      {activeConversation && (
        <InstantCameraModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onSendMedia={handleCameraSendMedia}
          recipientName={activeConversation.displayName}
        />
      )}

      {/* Expanded Lightbox Preview Modal on tap */}
      {zoomMediaUrl && (
        <div
          onClick={() => setZoomMediaUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer select-none"
        >
          <div className="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img
              src={zoomMediaUrl}
              alt="Expanded media view"
              className="max-h-[80vh] w-auto object-contain"
            />
            <button
              onClick={() => setZoomMediaUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* New Chat Picker Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#0f0f18] border border-white/15 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">New Message</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-white/50 mt-2">Select a creator to start chatting:</p>
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {conversations.map((c) => (
                <button
                  key={`new-${c.id}`}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    setShowNewChatModal(false);
                  }}
                  className="flex items-center w-full p-2 rounded-xl hover:bg-white/10 gap-3 text-left transition-colors"
                >
                  <img
                    src={c.avatar}
                    alt={c.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">{c.displayName}</p>
                    <p className="text-[11px] text-white/50">@{c.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
