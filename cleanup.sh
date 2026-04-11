grep -vE "\- Call tools|\- After resolving|\- Do not \`git add\`" server/wikify-tool.ts > tmp.ts
# Find the last line that is EXACTLY "}"
LINE=$(grep -nE "^\}$" tmp.ts | tail -n 1 | cut -d: -f1)
head -n $LINE tmp.ts > final.ts
mv final.ts server/wikify-tool.ts
