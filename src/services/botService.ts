import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  limit,
  orderBy,
  serverTimestamp, 
  updateDoc, 
  increment as firestoreIncrement 
} from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from '@google/genai';

const MOCK_BOTS = [
  {
    uid: 'bot_the_hammer',
    displayName: 'The Hammer',
    role: 'fighter',
    profileImageUrl: 'https://ui-avatars.com/api/?name=The+Hammer&background=E31837&color=fff',
    bio: 'Heavyweight contender. 12-0. I only speak in KOs.',
    record: '12-0-0',
    gym: 'Hammer House',
    isPro: true
  },
  {
    uid: 'bot_submission_queen',
    displayName: 'SubQueen',
    role: 'fighter',
    profileImageUrl: 'https://ui-avatars.com/api/?name=Sub+Queen&background=444&color=fff',
    bio: 'BJJ Black Belt. Don\'t blink or you\'ll tap.',
    record: '8-1-2',
    gym: 'Gracie Elite',
    isPro: true
  },
  {
    uid: 'bot_scout_master',
    displayName: 'ScoutPro',
    role: 'sponsor',
    profileImageUrl: 'https://ui-avatars.com/api/?name=Scout+Pro&background=111&color=fff',
    bio: 'Always looking for the next big thing in MMA.',
    gym: 'Pro-Circuit Agency'
  },
  {
    uid: 'bot_hype_train',
    displayName: 'HypeTrain',
    role: 'fan',
    profileImageUrl: 'https://ui-avatars.com/api/?name=Hype+Train&background=E31837&color=fff',
    bio: 'Biggest MMA fan on the planet. I live for Saturday nights.'
  }
];

const EMOJI_OPTIONS = ['🔥', '🥊', '💯', '💪', '🧊'];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function ensureBotsExist() {
  for (const bot of MOCK_BOTS) {
    const userRef = doc(db, 'users', bot.uid);
    await setDoc(userRef, {
      ...bot,
      createdAt: Date.now()
    }, { merge: true });
  }
}

export async function triggerBotPost() {
  const bot = MOCK_BOTS[Math.floor(Math.random() * MOCK_BOTS.length)];
  
  let content = "Just finished a killer session at the gym. Getting ready for the next big move! #FightNet";
  
  // Try to get a more "natural" post with Gemini if possible
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a short, high-energy MMA social media post (max 150 characters) as a ${bot.role} named ${bot.displayName}. Use some emojis and hashtags. Don't use quotes.`
      });
      content = response.text || content;
    } catch (e) {
      console.error('Gemini post error', e);
    }
  }

  await addDoc(collection(db, 'posts'), {
    authorId: bot.uid,
    content: content.trim(),
    createdAt: serverTimestamp(),
    likesCount: 0,
    commentsCount: 0,
    reactions: {}
  });
}

export async function triggerBotReactions(postId: string) {
  const postRef = doc(db, 'posts', postId);
  const numBots = Math.floor(Math.random() * 3) + 1; // 1 to 3 bots react
  const selectedBots = [...MOCK_BOTS].sort(() => 0.5 - Math.random()).slice(0, numBots);

  for (const bot of selectedBots) {
    const emoji = EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
    await updateDoc(postRef, {
      [`reactions.${bot.uid}`]: emoji,
      likesCount: firestoreIncrement(1)
    });
  }
}

export async function triggerBotComments(postId: string) {
  const numBots = Math.floor(Math.random() * 2) + 1; // 1 to 2 bots comment
  const selectedBots = [...MOCK_BOTS].sort(() => 0.5 - Math.random()).slice(0, numBots);

  for (const bot of selectedBots) {
    let text = "Absolute fire! Keep it up. 🥊";
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Write a very short comment (max 50 characters) for an MMA post as ${bot.displayName}. Use an emoji.`
        });
        text = response.text || text;
      } catch (e) {
        console.error('Gemini comment error', e);
      }
    }

    await addDoc(collection(db, 'posts', postId, 'comments'), {
      authorId: bot.uid,
      text: text.trim(),
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'posts', postId), {
      commentsCount: firestoreIncrement(1)
    });
  }
}
