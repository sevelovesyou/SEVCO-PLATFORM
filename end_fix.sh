# Remove everything from line 966 to the end.
# Line 965 should be the closing } for catch
# Line 966 should be the closing ); for app.post
# Line 967 should be the closing } for registerWikifyToolRoutes

# Actually we have:
# 964:        return res.status(500).json({ message: "Internal server error" });
# 965:      }
# 966:  );
# 967: }

# Find the line containing "Internal server error" for rewikify
LINE=$(grep -n "\[wiki/rewikify\] Error:" server/wikify-tool.ts | cut -d: -f1)
if [ -n "$LINE" ]; then
  # Keep up to $LINE+2
  END=$((LINE+2))
  head -n $END server/wikify-tool.ts > tmp.ts
  echo "    }" >> tmp.ts
  echo "  );" >> tmp.ts
  echo "}" >> tmp.ts
  mv tmp.ts server/wikify-tool.ts
  echo "Fixed end of file"
fi
