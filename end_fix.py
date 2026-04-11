import os

with open('server/wikify-tool.ts', 'r') as f:
    lines = f.readlines()

# Look for the last catch block of rewikify
# Line 956 in previous read was "      } catch (err: unknown) {"
# Let's find it.

new_lines = []
for line in lines:
    if "Replit-Task-Id" in line or "- Call tools" in line or "- After resolving" in line or "- Do not `git add`" in line:
        continue
    new_lines.append(line)

# Ensure proper closing for the last app.post and the function
# We saw:
#       }
#   );
# }

# Let's rebuild the end correctly.
# Find where the rewikify catch block starts.
for i in range(len(new_lines)-1, 0, -1):
    if 'console.error("[wiki/rewikify] Error:", err);' in new_lines[i]:
        # i is line with console.error
        # i-1 should be catch
        # i+1 should be return 500
        # i+2 should be }
        # then we need:
        #     }
        #   );
        # }
        
        # Trim everything after the return 500 line
        final_lines = new_lines[:i+2]
        final_lines.append('    }\n')
        final_lines.append('  );\n')
        final_lines.append('}\n')
        
        with open('server/wikify-tool.ts', 'w') as f:
            f.writelines(final_lines)
        print("Fixed end of file")
        break
