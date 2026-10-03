import { StoryItem } from '../types';

export const USER_STORY_PROFILE = {
  id: 'your-story',
  username: 'your_story',
  displayName: 'Your story',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gedion_creator&backgroundColor=06b6d4,a855f7',
};

// Initial creator stories for the Stories / Status bar
export const MOCK_STORIES: StoryItem[] = [
  {
    id: 'story_ankur_cyber',
    username: 'ankur_cyber',
    displayName: 'Ankur Arya',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    storyMediaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    caption: 'Neon night ride through the cyberpunk district 🌃✨',
    timestamp: '2h ago',
    isVerified: true,
  },
  {
    id: 'story_maya_lens',
    username: 'maya_lens',
    displayName: 'Maya Lens',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    storyMediaUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    caption: 'Behind the scenes: 4K cyber video shoot in progress 🎬🎥',
    timestamp: '4h ago',
    isVerified: true,
  },
  {
    id: 'story_alex_synth',
    username: 'alex_synth',
    displayName: 'Alex Beats',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    storyMediaUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    caption: 'Cooking new synth tracks in the sonic studio 🎧⚡',
    timestamp: '6h ago',
    isVerified: false,
  },
  {
    id: 'story_sara_motion',
    username: 'sara_motion',
    displayName: 'Sara Motion',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    storyMediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    caption: 'Neon dance routine ready for tomorrow! 💃✨',
    timestamp: '8h ago',
    isVerified: true,
  },
  {
    id: 'story_zenith_ai',
    username: 'zenith_ai',
    displayName: 'Zenith Cyber',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    storyMediaUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    caption: 'Holographic projection demo live test 🌀🤖',
    timestamp: '12h ago',
    isVerified: false,
  },
];
