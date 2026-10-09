import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  SquarePen,
  X,
  Loader2,
  Check,
  Trash2,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { Conversation, ChatMessage } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';
import { searchSupabaseUsers, SearchedUser } from '../utils/supabaseClient';
import { checkIsUserFollowing } from '../utils/followersService';
import { ChatRoom } from './ChatRoom';

export interface DirectMessagesProps {
  onClose: () => void;
  initialUserId?: string | null;
  onClearInitialUser?: () => void;
}

const PRIMARY_STORAGE_KEY = 'gedion_chat_primary_v2';
const REQUESTS_STORAGE_KEY = 'gedion_chat_requests_v2';

const SEED_PRIMARY: Conversation[] = [
  {
    id: 'conv_maya_creative',
    userId: 'maya_creative',
    username: 'maya_creative',
    displayName: 'Maya Chen',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isOnline: true,
    lastSeen: 'Active now',
    lastMessage: 'Let’s definitely collaborate on the next reel! 🔥',
    lastMessageTime: '2h',
    unreadCount: 0,
    isRequest: false,
    messages: [
      {
        id: 'msg_m1',
        senderId: 'maya_creative',
        text: 'Hey! Loved your recent video broadcast 🚀',
        timestamp: '3h',
        isRead: true,
      },
      {
        id: 'msg_m2',
        senderId: 'me',
        text: 'Thank you Maya! Let’s definitely collaborate on the next reel! 🔥',
        timestamp: '2h',
        isRead: true,
      },
    ],
  },
];

const SEED_REQUESTS: Conversation[] = [
  {
    id: 'conv_req_jordan',
    userId: 'jordan_beats',
    username: 'jordan_beats',
    displayName: 'Jordan West',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isOnline: false,
    lastSeen: 'Active 1h ago',
    lastMessage: 'Hey, love your latest reel! Open to a sound collaboration? 🎧',
    lastMessageTime: '1d',
    unreadCount: 1,
    isRequest: true,
    messages: [
      {
        id: 'msg_r1',
        senderId: 'jordan_beats',
        text: 'Hey, love your latest reel! Open to a sound collaboration? 🎧',
        timestamp: '1d',
        isRead: false,
      },
    ],
  },
];

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  onClose,
  initialUserId,
  onClearInitialUser,
}) => {
  const { isDark } = useTheme();
  const currentUser = getStoredAuth() || DEFAULT_AUTH_USER;

  // Conversations state
  const [primaryConversations, setPrimaryConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(PRIMARY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_PRIMARY;
  });

  const [requestConversations, setRequestConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(REQUESTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_REQUESTS;
  });

  const [activeInboxTab, setActiveInboxTab] = useState<'primary' | 'requests'>('primary');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // New Chat Search Modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter current conversations in inbox
  const [filterQuery, setFilterQuery] = useState('');

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(primaryConversations));
    } catch {}
  }, [primaryConversations]);

  useEffect(() => {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requestConversations));
    } catch {}
  }, [requestConversations]);

  // Handle deep-linking from initialUserId (e.g. from Notifications or Profile)
  useEffect(() => {
    if (!initialUserId) return;
    const cleanId = initialUserId.replace(/^@/, '');

    // Check if conversation already exists in primary or requests
    const inPrimary = primaryConversations.find(
      (c) => c.userId.toLowerCase() === cleanId.toLowerCase() || c.username.toLowerCase() === cleanId.toLowerCase()
    );
    const inRequests = requestConversations.find(
      (c) => c.userId.toLowerCase() === cleanId.toLowerCase() || c.username.toLowerCase() === cleanId.toLowerCase()
    );

    if (inPrimary) {
      setActiveConversationId(inPrimary.id);
      setActiveInboxTab('primary');
    } else if (inRequests) {
      setActiveConversationId(inRequests.id);
      setActiveInboxTab('requests');
    } else {
      // Create new conversation and open
      const newConv: Conversation = {
        id: `conv_${cleanId}_${Date.now()}`,
        userId: cleanId,
        username: cleanId,
        displayName: cleanId.replace(/_/g, ' '),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanId}&backgroundColor=06b6d4,a855f7`,
        isVerified: false,
        isOnline: true,
        lastSeen: 'Active now',
        lastMessage: 'Started a conversation',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        isRequest: false,
        messages: [],
      };
      setPrimaryConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveInboxTab('primary');
    }

    onClearInitialUser?.();
  }, [initialUserId, onClearInitialUser, primaryConversations, requestConversations]);

  // Debounced search for users in compose modal
  useEffect(() => {
    const q = userSearchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const users = await searchSupabaseUsers(q);
        setSearchResults(users);
      } catch (err) {
        console.warn('Error searching users:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Start chat with a selected user
  const handleSelectSearchedUser = async (user: SearchedUser) => {
    const cleanUser = user.username.replace(/^@/, '');

    // Check if conversation already exists
    const existingPrimary = primaryConversations.find(
      (c) => c.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (existingPrimary) {
      setActiveConversationId(existingPrimary.id);
      setActiveInboxTab('primary');
      setIsComposeOpen(false);
      setUserSearchQuery('');
      return;
    }

    const existingRequest = requestConversations.find(
      (c) => c.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (existingRequest) {
      setActiveConversationId(existingRequest.id);
      setActiveInboxTab('requests');
      setIsComposeOpen(false);
      setUserSearchQuery('');
      return;
    }

    // Check if currentUser follows this user
    const isFollowing = await checkIsUserFollowing(
      currentUser.id,
      currentUser.username,
      user.id,
      cleanUser
    );

    const newConv: Conversation = {
      id: `conv_${cleanUser}_${Date.now()}`,
      userId: user.id || cleanUser,
      username: cleanUser,
      displayName: user.name || cleanUser,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isOnline: true,
      lastSeen: 'Active now',
      lastMessage: 'Started a conversation',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      isRequest: !isFollowing,
      messages: [],
    };

    if (isFollowing) {
      setPrimaryConversations((prev) => [newConv, ...prev]);
      setActiveInboxTab('primary');
    } else {
      // Direct messages to non-followed account route to Requests tab
      setRequestConversations((prev) => [newConv, ...prev]);
      setActiveInboxTab('requests');
    }

    setActiveConversationId(newConv.id);
    setIsComposeOpen(false);
    setUserSearchQuery('');
  };

  // Accept a message request -> moves to Primary inbox
  const handleAcceptRequest = (convId: string) => {
    const req = requestConversations.find((c) => c.id === convId);
    if (!req) return;

    const acceptedConv: Conversation = {
      ...req,
      isRequest: false,
      unreadCount: 0,
    };

    setRequestConversations((prev) => prev.filter((c) => c.id !== convId));
    setPrimaryConversations((prev) => [acceptedConv, ...prev]);
    setActiveInboxTab('primary');
  };

  // Delete a message request -> removes from list
  const handleDeleteRequest = (convId: string) => {
    setRequestConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
  };

  // Update conversation messages when sent/received in ChatRoom
  const handleUpdateConversationMessages = (convId: string, newMsg: ChatMessage) => {
    const updateList = (list: Conversation[]) =>
      list.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessage: newMsg.text || 'Sent attachment',
            lastMessageTime: 'Just now',
            messages: [...c.messages.filter((m) => m.id !== newMsg.id), newMsg],
          };
        }
        return c;
      });

    setPrimaryConversations((prev) => updateList(prev));
    setRequestConversations((prev) => updateList(prev));
  };

  // Find currently open conversation
  const activeConversation =
    primaryConversations.find((c) => c.id === activeConversationId) ||
    requestConversations.find((c) => c.id === activeConversationId) ||
    null;

  // Active list filtered by inbox tab and search query
  const displayedConversations = (
    activeInboxTab === 'primary' ? primaryConversations : requestConversations
  ).filter((c) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      c.username.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col pt-0 pb-16 overflow-hidden transition-colors select-none ${
        isDark ? 'bg-black text-white' : 'bg-white text-neutral-900'
      }`}
    >
      {/* 1. Main Direct Messages Inbox Header */}
      <header
        className={`sticky top-0 z-20 flex flex-col border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/95 border-neutral-800' : 'bg-white/95 border-neutral-200'
        }`}
      >
        <div className="w-full pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center justify-between px-3 h-14">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to home feed"
              className="p-1 -ml-1 rounded-full hover:opacity-75 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={22} />
            </button>
            <span className="font-extrabold text-base tracking-tight truncate max-w-[200px]">
              @{currentUser.username.replace(/^@/, '')}
            </span>
          </div>

          {/* New Chat (compose) button */}
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            aria-label="New chat"
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
          >
            <SquarePen size={21} />
          </button>
        </div>

        {/* Inbox Tabs: Primary vs Requests */}
        <div className="flex items-center px-4 border-t border-neutral-100 dark:border-neutral-900">
          <button
            type="button"
            onClick={() => setActiveInboxTab('primary')}
            className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
              activeInboxTab === 'primary'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Primary ({primaryConversations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveInboxTab('requests')}
            className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer relative ${
              activeInboxTab === 'requests'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Requests ({requestConversations.length})
            {requestConversations.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#0095f6] text-white text-[10px]">
                {requestConversations.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. Search Conversations Filter Bar */}
      <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-900">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
          }`}
        >
          <Search size={16} className="text-neutral-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full bg-transparent text-xs focus:outline-none placeholder:text-neutral-400"
          />
          {filterQuery && (
            <button type="button" onClick={() => setFilterQuery('')} className="text-neutral-400">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Conversation List */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-neutral-100 dark:divide-neutral-900">
        {displayedConversations.length > 0 ? (
          displayedConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className="flex items-center justify-between p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 active:bg-neutral-100 dark:active:bg-neutral-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Circular Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]">
                    <img
                      src={conv.avatar}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${conv.username}&backgroundColor=06b6d4,a855f7`;
                      }}
                      className="w-full h-full rounded-full object-cover border-[1.5px] border-white dark:border-black"
                    />
                  </div>
                  {conv.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" />
                  )}
                </div>

                {/* Name, message snippet, and timestamp */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-[13.5px] truncate">
                      {conv.displayName || conv.username}
                    </span>
                    <span className="text-[11px] text-neutral-400 shrink-0">
                      {conv.lastMessageTime}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>

              {/* Quick actions for Requests tab */}
              {activeInboxTab === 'requests' && (
                <div
                  className="flex items-center gap-1.5 ml-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(conv.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-semibold active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRequest(conv.id)}
                    className="p-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 active:scale-95 transition-all cursor-pointer"
                    title="Delete request"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          /* Empty inbox state */
          <div className="flex flex-col items-center justify-center p-8 text-center my-auto min-h-[300px]">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-400 mb-3">
              <MessageCircle size={32} />
            </div>
            <h3 className="font-bold text-sm">
              {activeInboxTab === 'primary' ? 'No messages yet' : 'No message requests'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              {activeInboxTab === 'primary'
                ? 'Send a direct message or share posts with your friends.'
                : 'Direct messages sent from non-followed accounts appear here.'}
            </p>
            {activeInboxTab === 'primary' && (
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Send message
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Active Chat Room Overlay */}
      {activeConversation && (
        <ChatRoom
          conversation={activeConversation}
          onBack={() => setActiveConversationId(null)}
          onUpdateConversationMessages={handleUpdateConversationMessages}
          onAcceptRequest={handleAcceptRequest}
          onDeleteRequest={handleDeleteRequest}
        />
      )}

      {/* 5. New Chat User Search Modal (Compose) */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden max-h-[80vh] ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-900">
              <span className="font-bold text-sm">New message</span>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Search Input */}
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-900 flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400">To:</span>
              <input
                type="text"
                autoFocus
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search accounts, creators..."
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-neutral-400"
              />
              {isSearching && <Loader2 size={16} className="animate-spin text-[#0095f6]" />}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto max-h-[360px] p-2 divide-y divide-neutral-100 dark:divide-neutral-900 no-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectSearchedUser(user)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left transition-colors cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.avatar}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}&backgroundColor=06b6d4,a855f7`;
                        }}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs">@{user.username.replace(/^@/, '')}</span>
                        {user.isVerified && (
                          <CheckCircle2 size={13} className="text-[#0095f6] fill-[#0095f6]" />
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 truncate">{user.name}</span>
                    </div>
                  </button>
                ))
              ) : userSearchQuery.trim() && !isSearching ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  No accounts found for &quot;{userSearchQuery}&quot;
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-400">
                  Type a username or full name to start a chat.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
