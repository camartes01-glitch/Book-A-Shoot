const fs = require('fs');
const path = require('path');

function findTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo' && file !== '.git') {
        results = results.concat(findTsxFiles(fullPath));
      }
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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
      const afterMatch = line.slice(m.index);
      if (!afterMatch.includes('/>')) {
        stack.push({ tag: m[1], line: i + 1, text: line });
      }
    }

    const closeMatches = line.matchAll(/<\/(Pressable|TouchableOpacity|Button)>/g);
    for (const m of closeMatches) {
      if (stack.length > 0) {
        stack.pop();
      }
    }
  }

  if (nested.length > 0) {
    console.log(`FOUND NESTED IN ${filePath}:`, JSON.stringify(nested, null, 2));
  }
}

const allFiles = [...findTsxFiles('app'), ...findTsxFiles('src/components')];
allFiles.forEach(checkFile);
console.log('Scan complete.');
