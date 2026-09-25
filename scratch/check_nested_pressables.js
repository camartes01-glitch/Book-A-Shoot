const fs = require('fs');

function checkFile(path) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const stack = [];
  const nested = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match open tag
    const openMatches = line.matchAll(/<(Pressable|TouchableOpacity|Button)\b/g);
    for (const m of openMatches) {
      if (stack.length > 0) {
        nested.push({
          parentLine: stack[stack.length - 1].line,
          parentTag: stack[stack.length - 1].tag,
          parentText: stack[stack.length - 1].text.trim(),
          childLine: i + 1,
          childTag: m[1],
          childText: line.trim()
        });
      }
      // check if it's self-closing on the same line
      const afterMatch = line.slice(m.index);
      if (!afterMatch.includes('/>')) {
        stack.push({ tag: m[1], line: i + 1, text: line });
      }
    }

    // Match close tag
    const closeMatches = line.matchAll(/<\/(Pressable|TouchableOpacity|Button)>/g);
    for (const m of closeMatches) {
      if (stack.length > 0) {
        stack.pop();
      }
    }
  }

  console.log(`Results for ${path}:`, JSON.stringify(nested, null, 2));
}

checkFile('app/(tabs)/index.tsx');
checkFile('app/(tabs)/bookings.tsx');
checkFile('app/(tabs)/messages.tsx');
checkFile('app/(tabs)/notifications.tsx');
checkFile('app/(tabs)/profile.tsx');
checkFile('app/(tabs)/_layout.tsx');
