grep -nE "Internal server error" server/wikify-tool.ts | tail -n 1 | cut -d: -f1 | xargs -I {} head -n {} server/wikify-tool.ts > tmp.ts
echo "      }" >> tmp.ts
echo "    }" >> tmp.ts
echo "  );" >> tmp.ts
echo "}" >> tmp.ts
mv tmp.ts server/wikify-tool.ts
