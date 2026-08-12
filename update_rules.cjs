const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const newRule = `    function isValidPost(data) {
      return data.keys().hasAll(['authorId', 'content', 'createdAt']) &&
             data.authorId is string && (data.authorId == request.auth.uid || isBot(data.authorId)) &&
             data.content is string && data.content.size() <= 2000 &&
             (data.createdAt is timestamp || data.createdAt is number) &&
             (data.get('category', 'general') in ['highlight', 'result', 'matchup', 'general']) &&
             (data.get('mediaUrl', '') is string && data.get('mediaUrl', '').size() <= 2500) &&
             (data.get('mediaType', '') in ['', 'video', 'image']) &&
             (data.get('likesCount', 0) is number) &&
             (data.get('likedBy', []) is list) &&
             (data.get('commentsCount', 0) is number) &&
             (data.get('reactions', {}) is map);
    }`;

// Replace the simple version with this robust one.
rules = rules.replace(/function isValidPost\(data\) \{\s+return data.authorId == request\.auth\.uid;\s+\}/, newRule);

fs.writeFileSync('firestore.rules', rules);
