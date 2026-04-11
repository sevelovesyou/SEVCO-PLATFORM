# Copy only the code to a new file.
# We know the last line should be "}"
grep -nE "^\}$" server/wikify-tool.ts | tail -n 1 | cut -d: -f1 | xargs -I {} head -n {} server/wikify-tool.ts > final.ts
mv final.ts server/wikify-tool.ts
