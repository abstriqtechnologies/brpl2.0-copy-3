import re

p = "/Users/anurag/Documents/brpl2.0/src/app/api/admin/upload/route.ts"
with open(p, "r") as f:
    content = f.read()

pattern = re.compile(
    r"/\*\* Strip anything that isn't a simple, safe filename character\. \*/\n"
    r"function sanitizeEchoFilename\(name: string\): string \{.*?^\}\n",
    re.MULTILINE | re.DOTALL,
)
replacement = (
    "import { sanitizeEchoFilename } from \"@/lib/media/filename\";\n"
)
new_content, n = pattern.subn(replacement, content, count=1)
print(f"replaced {n} block(s)")
assert n == 1, "expected exactly one replacement"

with open(p, "w") as f:
    f.write(new_content)
print("ok")
