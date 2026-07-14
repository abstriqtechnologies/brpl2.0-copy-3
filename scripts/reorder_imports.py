p = "/Users/anurag/Documents/brpl2.0/src/app/api/admin/upload/route.ts"
with open(p, "r") as f:
    content = f.read()

# Remove the inline import + the unused z import; insert sanitizeEchoFilename at the top block.
old_block_1 = 'import path from "path";\nimport { randomUUID } from "crypto";\nimport { writeFile, mkdir } from "fs/promises";\n\nimport { z } from "zod";\nimport { withRequest, withAdmin, withRateLimit } from "@/lib/api/handlers";\n'
new_block_1 = 'import path from "path";\nimport { randomUUID } from "crypto";\nimport { writeFile, mkdir } from "fs/promises";\n\nimport { withRequest, withAdmin, withRateLimit } from "@/lib/api/handlers";\nimport { sanitizeEchoFilename } from "@/lib/media/filename";\n'

old_block_2 = '        const file = formData.get("file");\n'
# There is also the inline import to delete.
inline = '\nimport { sanitizeEchoFilename } from "@/lib/media/filename";\n'

assert old_block_1 in content, "old_block_1 not found"
assert inline in content, "inline not found"
new_content = content.replace(old_block_1, new_block_1).replace(inline, "\n")

with open(p, "w") as f:
    f.write(new_content)

# Drop the trailing touch
old3 = "\n// Touching `z` so the import isn't tree-shaken even when the rate-limit\n// preset pulls in a slightly different code path in tests.\nvoid z;\n"
if old3 in new_content:
    new_content = new_content.replace(old3, "")
    with open(p, "w") as f:
        f.write(new_content)
    print("dropped trailing void z")
print("ok")
